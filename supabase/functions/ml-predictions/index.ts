import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mlPredictionPayloadSchema } from "../_shared/validation.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";
import { parseOrError } from "../_shared/validate.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "ml-predictions", requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) throw new Error("Supabase not configured");

    // Etapas 26-27 do plano-50: middleware comum substitui DOIS blocos de
    // verificação manual duplicados (o segundo redeclarava const no mesmo
    // escopo — SyntaxError que tornava a function indeployável; nunca pegado
    // porque o deno check do CI cobria apenas 2 arquivos).
    // Contrato preservado: coordinator/manager/admin (sem AAL2).
    const auth = await authenticate(req, {
      supabaseUrl: SUPABASE_URL!,
      supabaseAnonKey: SUPABASE_ANON_KEY!,
      requestId,
      corsHeaders: cors,
    });
    if (!auth.ok) {
      log.warn("auth.rejected");
      return auth.response;
    }

    // Only coordinators, managers, and admins can trigger AI-powered predictions
    // (prevents operators from draining the API credit budget).
    const forbidden = requireRole(auth.ctx, ["coordinator", "manager", "admin"], { requestId, corsHeaders: cors });
    if (forbidden) {
      log.warn("guard.rejected", { roles: auth.ctx.roles });
      return forbidden;
    }

    // Client service-role para as consultas de dados abaixo (era criado entre
    // os dois blocos de auth duplicados; restaurado apos os guards).
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const parsed = await parseOrError(mlPredictionPayloadSchema, req, { corsHeaders: cors, requestId });
    if (parsed.response) return parsed.response;

    const { action, machine_id } = parsed.data;


    console.log(`ML Predictions: action=${action}, machine_id=${machine_id || 'all'}`);

    // Fetch all required data
    const [machinesRes, jobsRes, maintenanceRes, recordsRes] = await Promise.all([
      supabase.from("machines").select("*, techniques(*)").eq("is_active", true),
      supabase.from("jobs").select("*").in("status", ["finished", "production"]).order("updated_at", { ascending: false }).limit(500),
      supabase.from("maintenance_schedules").select("*").eq("is_active", true),
      supabase.from("maintenance_records").select("*").order("started_at", { ascending: false }).limit(200),
    ]);

    if (machinesRes.error) throw machinesRes.error;
    if (jobsRes.error) throw jobsRes.error;

    const machines = machinesRes.data || [];
    const jobs = jobsRes.data || [];
    const maintenanceSchedules = maintenanceRes.data || [];
    const maintenanceRecords = recordsRes.data || [];

    // Filter to specific machine if provided. Cap batch size so serial AI calls
    // (each up to 25 s) don't exceed the edge function timeout. Callers should
    // paginate by passing machine_id for large deployments.
    const MAX_BATCH_SIZE = 10;
    const filteredMachines = machine_id
      ? machines.filter((m: any) => m.id === machine_id)
      : machines;
    const targetMachines = filteredMachines.slice(0, MAX_BATCH_SIZE);
    const batchTruncated = filteredMachines.length > MAX_BATCH_SIZE;

    const predictions = [];

    for (const machine of targetMachines) {
      // Gather machine-specific data
      const machineJobs = jobs.filter((j: any) => j.machine_id === machine.id);
      const machineSchedules = maintenanceSchedules.filter((s: any) => s.machine_id === machine.id);
      const machineRecords = maintenanceRecords.filter((r: any) => r.machine_id === machine.id);

      // Calculate metrics
      const totalJobs = machineJobs.length;
      const totalProduced = machineJobs.reduce((sum: any, j: any) => sum + (j.produced_quantity || 0), 0);
      const totalLosses = machineJobs.reduce((sum: any, j: any) => sum + (j.lost_pieces || 0), 0);
      const lossRate = totalProduced > 0 ? (totalLosses / totalProduced) * 100 : 0;
      
      const completedRecords = machineRecords.filter(r => r.status === 'completed');
      const correctiveCount = machineRecords.filter(r => r.maintenance_type_id === 'corrective').length;
      
      const overdueSchedules = machineSchedules.filter(s => new Date(s.next_due_at) < new Date());
      const daysOverdue = overdueSchedules.length > 0 
        ? Math.max(...overdueSchedules.map((s: any) => Math.floor((Date.now() - new Date(s.next_due_at).getTime()) / (1000 * 60 * 60 * 24))))
        : 0;

      // Build context for AI analysis
      const machineContext = {
        machine_name: machine.name,
        machine_code: machine.code,
        technique: machine.techniques?.name || 'Unknown',
        total_jobs_last_period: totalJobs,
        total_produced: totalProduced,
        total_losses: totalLosses,
        loss_rate_percent: lossRate.toFixed(2),
        scheduled_maintenances: machineSchedules.length,
        completed_maintenances: completedRecords.length,
        corrective_maintenances: correctiveCount,
        overdue_maintenances: overdueSchedules.length,
        max_days_overdue: daysOverdue,
        last_maintenance_date: completedRecords[0]?.completed_at || null,
      };

      console.log(`Analyzing machine: ${machine.name}`, machineContext);

      // Call Lovable AI for prediction
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(25_000),
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Você é um sistema especialista em manutenção preditiva industrial (TPM/RCM).
Analise os dados da máquina e forneça uma previsão de risco de falha.

IMPORTANTE: Responda APENAS com um JSON válido no formato especificado, sem texto adicional.`
            },
            {
              role: "user",
              content: `Analise os seguintes dados da máquina e preveja o risco de falha:

${JSON.stringify(machineContext, null, 2)}

Responda APENAS com JSON no formato:
{
  "risk_score": <número 0-100>,
  "confidence": <número 0-100>,
  "prediction_type": "failure_risk" | "maintenance_needed" | "performance_degradation",
  "predicted_days_to_failure": <número ou null>,
  "factors": [
    {"factor": "nome do fator", "impact": "high" | "medium" | "low", "description": "descrição"}
  ],
  "recommendations": ["recomendação 1", "recomendação 2"]
}`
            }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI API error for ${machine.name}:`, aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
            status: 402,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      console.log(`AI response for ${machine.name}:`, content.substring(0, 200));

      // Parse AI response
      let prediction;
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = content;
        if (content.includes("```json")) {
          jsonStr = content.split("```json")[1].split("```")[0].trim();
        } else if (content.includes("```")) {
          jsonStr = content.split("```")[1].split("```")[0].trim();
        }
        prediction = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error(`Failed to parse AI response for ${machine.name}:`, parseError);
        // Generate fallback prediction based on metrics
        prediction = {
          risk_score: Math.min(100, daysOverdue * 5 + correctiveCount * 10 + lossRate),
          confidence: 60,
          prediction_type: daysOverdue > 0 ? "maintenance_needed" : lossRate > 5 ? "performance_degradation" : "failure_risk",
          predicted_days_to_failure: daysOverdue > 7 ? 3 : null,
          factors: [
            daysOverdue > 0 && { factor: "Manutenção atrasada", impact: "high", description: `${daysOverdue} dias de atraso` },
            correctiveCount > 2 && { factor: "Manutenções corretivas", impact: "medium", description: `${correctiveCount} manutenções corretivas recentes` },
            lossRate > 5 && { factor: "Taxa de perdas elevada", impact: "medium", description: `${lossRate.toFixed(1)}% de perdas` },
          ].filter(Boolean),
          recommendations: [
            daysOverdue > 0 && "Executar manutenção preventiva imediatamente",
            "Realizar inspeção visual detalhada",
            "Verificar calibração do equipamento",
          ].filter(Boolean),
        };
      }

      // Calculate predicted failure date
      const predictedFailureDate = prediction.predicted_days_to_failure 
        ? new Date(Date.now() + prediction.predicted_days_to_failure * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;

      // Deactivate old predictions for this machine
      await supabase
        .from("machine_predictions")
        .update({ is_active: false })
        .eq("machine_id", machine.id)
        .eq("is_active", true);

      // Insert new prediction
      const { data: newPrediction, error: insertError } = await supabase
        .from("machine_predictions")
        .insert({
          machine_id: machine.id,
          prediction_type: prediction.prediction_type || "failure_risk",
          risk_score: Math.min(100, Math.max(0, prediction.risk_score || 0)),
          confidence: Math.min(100, Math.max(0, prediction.confidence || 50)),
          predicted_failure_date: predictedFailureDate,
          factors: prediction.factors || [],
          recommendations: prediction.recommendations || [],
          model_version: "v1.0-lovable-ai",
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Failed to insert prediction for ${machine.name}:`, insertError);
        continue;
      }

      predictions.push({
        machine: { id: machine.id, name: machine.name, code: machine.code },
        prediction: newPrediction,
      });
    }

    console.log(`Generated ${predictions.length} predictions`);

    return new Response(JSON.stringify({
      success: true,
      predictions_generated: predictions.length,
      predictions,
      ...(batchTruncated && {
        warning: `Batch limited to ${MAX_BATCH_SIZE} machines. Pass machine_id to target a specific machine.`,
        total_machines: filteredMachines.length,
      }),
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("ML Predictions error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
