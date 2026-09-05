import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireUserOrCronSecret } from '../_shared/cronAuth.ts';

import { getCorsHeaders } from "../_shared/cors.ts";

interface ScheduleItem {
  id: string;
  name: string;
  next_due_at: string;
  machine_id: string;
  machines: { name: string; code: string } | null;
}

interface PredictionItem {
  id: string;
  machine_id: string;
  risk_score: number;
  prediction_type: string;
  predicted_failure_date: string | null;
  machines: { name: string; code: string } | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const unauthorized = await requireUserOrCronSecret(req, {
    supabaseUrl,
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    corsHeaders: getCorsHeaders(req),
  });
  if (unauthorized) return unauthorized;

  try {
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    console.log('Generating daily maintenance summary for:', today.toISOString());

    // Fetch overdue maintenance schedules
    const { data: overdueSchedules, error: overdueError } = await supabase
      .from('maintenance_schedules')
      .select('id, name, next_due_at, machine_id, machines(name, code)')
      .eq('is_active', true)
      .lt('next_due_at', today.toISOString())
      .order('next_due_at', { ascending: true });

    if (overdueError) {
      console.error('Error fetching overdue schedules:', overdueError);
    }

    // Fetch maintenance due today
    const { data: dueTodaySchedules, error: dueTodayError } = await supabase
      .from('maintenance_schedules')
      .select('id, name, next_due_at, machine_id, machines(name, code)')
      .eq('is_active', true)
      .gte('next_due_at', today.toISOString())
      .lt('next_due_at', tomorrow.toISOString())
      .order('next_due_at', { ascending: true });

    if (dueTodayError) {
      console.error('Error fetching due today schedules:', dueTodayError);
    }

    // Fetch upcoming maintenance (next 7 days)
    const { data: upcomingSchedules, error: upcomingError } = await supabase
      .from('maintenance_schedules')
      .select('id, name, next_due_at, machine_id, machines(name, code)')
      .eq('is_active', true)
      .gte('next_due_at', tomorrow.toISOString())
      .lte('next_due_at', nextWeek.toISOString())
      .order('next_due_at', { ascending: true });

    if (upcomingError) {
      console.error('Error fetching upcoming schedules:', upcomingError);
    }

    // Fetch high-risk ML predictions
    const { data: highRiskPredictions, error: predictionsError } = await supabase
      .from('machine_predictions')
      .select('id, machine_id, risk_score, prediction_type, predicted_failure_date, machines(name, code)')
      .eq('is_active', true)
      .gte('risk_score', 70)
      .order('risk_score', { ascending: false });

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
    }

    // Helper to safely access nested machine data
    const getMachineName = (item: unknown): string => {
      const obj = item as { machines?: { name?: string } | { name?: string }[] };
      if (Array.isArray(obj.machines) && obj.machines[0]) {
        return obj.machines[0].name || 'Máquina desconhecida';
      }
      if (obj.machines && typeof obj.machines === 'object' && 'name' in obj.machines) {
        return (obj.machines as { name: string }).name || 'Máquina desconhecida';
      }
      return 'Máquina desconhecida';
    };

    const getMachineCode = (item: unknown): string => {
      const obj = item as { machines?: { code?: string } | { code?: string }[] };
      if (Array.isArray(obj.machines) && obj.machines[0]) {
        return obj.machines[0].code || '';
      }
      if (obj.machines && typeof obj.machines === 'object' && 'code' in obj.machines) {
        return (obj.machines as { code: string }).code || '';
      }
      return '';
    };

    const mapSchedule = (s: unknown) => {
      const item = s as { id: string; name: string; next_due_at: string };
      return {
        id: item.id,
        name: item.name,
        machine: getMachineName(s),
        machine_code: getMachineCode(s),
        due_at: item.next_due_at,
      };
    };

    const mapPrediction = (p: unknown) => {
      const item = p as { id: string; risk_score: number; prediction_type: string; predicted_failure_date: string | null };
      return {
        id: item.id,
        machine: getMachineName(p),
        machine_code: getMachineCode(p),
        risk_score: item.risk_score,
        prediction_type: item.prediction_type,
        predicted_failure_date: item.predicted_failure_date,
      };
    };

    const allPredictions = (highRiskPredictions || []) as unknown[];
    const criticalPredictions = allPredictions.filter((p) => {
      const pred = p as { risk_score: number };
      return pred.risk_score >= 85;
    });

    // Build summary
    const summary = {
      generated_at: new Date().toISOString(),
      date: today.toISOString().split('T')[0],
      maintenance: {
        overdue: {
          count: overdueSchedules?.length || 0,
          items: (overdueSchedules || []).slice(0, 5).map(mapSchedule),
        },
        due_today: {
          count: dueTodaySchedules?.length || 0,
          items: (dueTodaySchedules || []).map(mapSchedule),
        },
        upcoming_7_days: {
          count: upcomingSchedules?.length || 0,
          items: (upcomingSchedules || []).slice(0, 10).map(mapSchedule),
        },
      },
      predictions: {
        critical: {
          count: criticalPredictions.length,
          items: criticalPredictions.slice(0, 5).map(mapPrediction),
        },
        high_risk: {
          count: allPredictions.length,
          items: allPredictions.slice(0, 10).map(mapPrediction),
        },
      },
      alerts: {
        has_critical: criticalPredictions.length > 0 || (overdueSchedules?.length || 0) > 0,
        total_attention_items: 
          (overdueSchedules?.length || 0) + 
          (dueTodaySchedules?.length || 0) + 
          criticalPredictions.length,
      },
    };

    // Store the summary for users to fetch
    const { error: insertError } = await supabase
      .from('daily_summaries')
      .upsert({
        date: today.toISOString().split('T')[0],
        summary_type: 'maintenance_predictions',
        data: summary,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'date,summary_type',
      });

    if (insertError) {
      console.error('Error storing summary:', insertError);
    }

    console.log('Daily summary generated successfully:', {
      overdue: summary.maintenance.overdue.count,
      dueToday: summary.maintenance.due_today.count,
      upcoming: summary.maintenance.upcoming_7_days.count,
      criticalPredictions: summary.predictions.critical.count,
      highRiskPredictions: summary.predictions.high_risk.count,
    });

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error generating daily summary:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
