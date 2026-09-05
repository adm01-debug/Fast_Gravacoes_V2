import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret } from "../_shared/cronAuth.ts";

serve(async (req) => {
  const unauthorized = requireCronSecret(req, { failClosed: true });
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();
    const metrics: Record<string, unknown> = {};

    // Jobs metrics
    const { count: totalJobs } = await supabase.from("jobs").select("*", { count: "exact", head: true });
    const { count: activeJobs } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "production");
    const { count: completedToday } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("actual_end_time", todayStartISO);

    metrics.jobs = { total: totalJobs, active: activeJobs, completedToday };

    // Operators metrics. The profiles table has no "status" column, so an
    // operator is considered "active" when they scanned a job today. Distinct
    // count is done in SQL (RPC) to avoid the PostgREST row cap undercounting.
    const { count: totalOperators } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { data: activeOperatorsRpc, error: activeOperatorsError } = await supabase.rpc("count_active_operators_since", { p_since: todayStartISO });
    if (activeOperatorsError) {
      console.error("metrics-collector: count_active_operators_since failed:", activeOperatorsError.message);
    }
    // null (unknown) on failure — never persist a fake 0 that looks like real data.
    const activeOperators = activeOperatorsError ? null : Number(activeOperatorsRpc ?? 0);

    metrics.operators = { total: totalOperators, active: activeOperators };

    // Machines metrics. The machines table has no "status" column, so a machine
    // is considered "running" when it currently has a job in production.
    const { count: totalMachines } = await supabase
      .from("machines")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const { data: runningMachinesRpc, error: runningMachinesError } = await supabase.rpc("count_running_machines");
    if (runningMachinesError) {
      console.error("metrics-collector: count_running_machines failed:", runningMachinesError.message);
    }
    const runningMachines = runningMachinesError ? null : Number(runningMachinesRpc ?? 0);

    metrics.machines = { total: totalMachines, running: runningMachines };

    // Store metrics
    await supabase.from("system_metrics").insert({
      collected_at: new Date().toISOString(),
      metrics,
    });

    return new Response(JSON.stringify({ success: true, metrics }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Metrics collector error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
