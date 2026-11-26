import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { requireCronSecret } from "../_shared/cronAuth.ts";

import { getCorsHeaders } from "../_shared/cors.ts";
import { getOrCreateRequestId } from "../_shared/logger.ts";
import { authenticate, requireRole, type AppRole } from "../_shared/auth.ts";

// Papeis que podem disparar o recalculo. Fonte unica: a lista mais restritiva
// das duas que a funcao tinha (a que exigia is_active e nao aceitava manager).
const ALLOWED_RANKING_ROLES: readonly AppRole[] = ["admin", "coordinator"];

interface RankingResult {
  operator_id: string;
  total_produced: number;
  total_quantity: number;
  total_lost: number;
  jobs_count: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const requestId = getOrCreateRequestId(req);
  const corsHeaders = getCorsHeaders(req);

  // Duas portas: segredo de cron (execucao agendada) ou sessao de usuario com
  // papel ativo. O criterio de papel e unico e vem do middleware comum
  // (_shared/auth.ts) — antes havia duas verificacoes com listas diferentes na
  // mesma funcao, e a primeira aceitava papel revogado (sem is_active).
  const cronApiKey = Deno.env.get("CRON_API_KEY");
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const providedKey = req.headers.get("x-api-key") || authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const isCronKey = !!cronApiKey && providedKey === cronApiKey;
  // Chamadas de cron no padrao dual-header (Bearer service_role +
  // x-cron-secret) nao resolvem usuario — o segredo precisa ser avaliado ANTES
  // do getUser, senao o Bearer service_role vira 401 e o x-cron-secret nunca e
  // consultado.
  const isCron = isCronKey ||
    !requireCronSecret(req, { failClosed: true, corsHeaders });

  if (!isCron) {
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
      requestId,
      corsHeaders,
    });
    if (!auth.ok) return auth.response;

    const forbidden = requireRole(auth.ctx, ALLOWED_RANKING_ROLES, { requestId, corsHeaders });
    if (forbidden) return forbidden;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // A autorizacao ja foi resolvida no gate acima (segredo de cron ou
    // authenticate + requireRole) — nada de re-checagem de papel aqui.

    const body = await req.json().catch(() => ({}));
    const rankingType: string = body.ranking_type || "weekly";
    const ALLOWED_RANKING_TYPES = ["daily", "weekly", "monthly"];
    if (!ALLOWED_RANKING_TYPES.includes(rankingType)) {
      return new Response(JSON.stringify({ error: "ranking_type inválido. Use: daily, weekly ou monthly" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    console.log(`Calculating ${rankingType} rankings...`);

    // Calculate date range
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (rankingType === "daily") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (rankingType === "weekly") {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      periodStart = new Date(now.setDate(diff));
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Get completed jobs in period with operator assignments
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id,
        produced_quantity,
        quantity,
        lost_pieces,
        machine_id,
        operator_id,
        actual_end_time
      `)
      .eq("status", "finished")
      .gte("actual_end_time", periodStart.toISOString())
      .lt("actual_end_time", periodEnd.toISOString());

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      throw jobsError;
    }

    // Get operator-machine assignments
    const { data: assignments, error: assignError } = await supabase
      .from("operator_machines")
      .select("operator_id, machine_id");

    if (assignError) {
      console.error("Error fetching assignments:", assignError);
      throw assignError;
    }

    // Build machine to operator map
    const machineToOperator: Record<string, string> = {};
    (assignments || []).forEach((a) => {
      machineToOperator[a.machine_id] = a.operator_id;
    });

    // Aggregate stats by operator
    const operatorStats: Record<string, RankingResult> = {};

    (jobs || []).forEach((job) => {
      // Only attribute jobs that have a recorded operator_id (written by updateStatus
      // when production starts). Falling back to the current machine→operator map would
      // silently misattribute credit when assignments change or operators share machines.
      const operatorId = job.operator_id;
      if (!operatorId) {
        console.warn(`Job ${job.id} has no operator_id — skipping from rankings`);
        return;
      }

      if (!operatorStats[operatorId]) {
        operatorStats[operatorId] = {
          operator_id: operatorId,
          total_produced: 0,
          total_quantity: 0,
          total_lost: 0,
          jobs_count: 0,
        };
      }

      operatorStats[operatorId].total_produced += job.produced_quantity || 0;
      operatorStats[operatorId].total_quantity += job.quantity || 0;
      operatorStats[operatorId].total_lost += job.lost_pieces || 0;
      operatorStats[operatorId].jobs_count += 1;
    });

    // Calculate rankings with points
    const rankings = Object.values(operatorStats)
      .map((stats) => {
        const efficiency = stats.total_quantity > 0 
          ? (stats.total_produced / stats.total_quantity) * 100 
          : 0;
        const quality = (stats.total_produced + stats.total_lost) > 0
          ? (stats.total_produced / (stats.total_produced + stats.total_lost)) * 100
          : 100;
        
        // Points formula: production + efficiency bonus + quality bonus
        const points = Math.round(
          stats.total_produced + 
          efficiency * 10 + 
          quality * 5 +
          stats.jobs_count * 2
        );

        return {
          operator_id: stats.operator_id,
          ranking_type: rankingType,
          total_points: points,
          total_produced: stats.total_produced,
          efficiency_rate: Math.round(efficiency * 100) / 100,
          quality_rate: Math.round(quality * 100) / 100,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          calculated_at: new Date().toISOString(),
        };
      })
      .sort((a, b) => b.total_points - a.total_points)
      .map((r, index) => ({
        ...r,
        position: index + 1,
      }));

    console.log(`Calculated ${rankings.length} rankings`);

    // Upsert new rankings first so the table is never left empty.
    // The UNIQUE constraint is on (operator_id, ranking_type, period_start,
    // period_end) — period_end has to be listed here, otherwise PostgREST
    // rejects the ON CONFLICT with 400 and nothing is ever written.
    if (rankings.length > 0) {
      const { error: upsertError } = await supabase
        .from("operator_rankings")
        .upsert(rankings, { onConflict: "operator_id,ranking_type,period_start,period_end" });

      if (upsertError) {
        console.error("Error upserting rankings:", upsertError);
        throw upsertError;
      }
    }

    // Remove stale entries from previous runs: period rows whose operator_id is
    // no longer in the newly calculated set (operator had no qualifying jobs).
    // Using a post-upsert delete means the window with no data never occurs.
    let staleDelete = supabase
      .from("operator_rankings")
      .delete()
      .eq("ranking_type", rankingType)
      .gte("period_start", periodStart.toISOString())
      .eq("period_end", periodEnd.toISOString());
    if (rankings.length > 0) {
      staleDelete = staleDelete.not(
        "operator_id", "in",
        `(${rankings.map((r) => r.operator_id).join(",")})`,
      );
    }
    await staleDelete;

    // Award achievements for top performers
    const achievements = [];
    
    if (rankings.length > 0) {
      const topOperator = rankings[0];
      
      // Check if already has this achievement this period
      const { data: existing } = await supabase
        .from("operator_achievements")
        .select("id")
        .eq("operator_id", topOperator.operator_id)
        .eq("achievement_type", `top_${rankingType}`)
        .gte("period_start", periodStart.toISOString())
        .eq("period_end", periodEnd.toISOString())
        .maybeSingle();

      if (!existing) {
        const achievementNames: Record<string, string> = {
          daily: "Campeão do Dia",
          weekly: "Campeão da Semana",
          monthly: "Campeão do Mês",
        };

        achievements.push({
          operator_id: topOperator.operator_id,
          achievement_type: `top_${rankingType}`,
          achievement_name: achievementNames[rankingType] || "Top Performer",
          description: `Primeiro lugar no ranking ${rankingType} com ${topOperator.total_points} pontos`,
          icon: "🏆",
          points: rankingType === "monthly" ? 500 : rankingType === "weekly" ? 200 : 50,
          achieved_at: new Date().toISOString(),
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        });
      }

      // Quality Master achievement (>99% quality)
      for (const ranking of rankings) {
        if (ranking.quality_rate >= 99 && ranking.total_produced >= 100) {
          const { data: qualityExists } = await supabase
            .from("operator_achievements")
            .select("id")
            .eq("operator_id", ranking.operator_id)
            .eq("achievement_type", "quality_master")
            .gte("achieved_at", periodStart.toISOString())
            .maybeSingle();

          if (!qualityExists) {
            achievements.push({
              operator_id: ranking.operator_id,
              achievement_type: "quality_master",
              achievement_name: "Mestre da Qualidade",
              description: `Taxa de qualidade de ${ranking.quality_rate}% com ${ranking.total_produced} peças produzidas`,
              icon: "⭐",
              points: 100,
              achieved_at: new Date().toISOString(),
              period_start: periodStart.toISOString(),
              period_end: periodEnd.toISOString(),
            });
          }
        }
      }
    }

    // Insert achievements
    if (achievements.length > 0) {
      const { error: achieveError } = await supabase
        .from("operator_achievements")
        .insert(achievements);

      if (achieveError) {
        console.error("Error inserting achievements:", achieveError);
      } else {
        console.log(`Awarded ${achievements.length} achievements`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rankings_count: rankings.length,
        achievements_awarded: achievements.length,
        period: {
          type: rankingType,
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error calculating rankings:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
