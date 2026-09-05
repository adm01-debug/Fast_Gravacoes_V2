import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret } from "../_shared/cronAuth.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

interface PurgeResult { table_name: string; deleted_count: number }

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "cron-cleanup", requestId });
  const jsonHeaders = withRequestId({ ...getCorsHeaders(req), "Content-Type": "application/json" }, requestId);

  const unauthorized = requireCronSecret(req, { failClosed: true });
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1) Purge de logs conforme política de retenção centralizada em SQL.
    const { data: purgeRows, error: purgeError } = await supabase.rpc("purge_old_logs");
    if (purgeError) {
      log.error("purge_old_logs.failed", purgeError);
    }

    const purge = (purgeRows ?? []) as PurgeResult[];
    const purgeSummary: Record<string, number> = {};
    for (const row of purge) purgeSummary[row.table_name] = Number(row.deleted_count);

    // 2) Arquivamento de jobs finalizados (> 180 dias).
    let archivedJobs = 0;
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldJobs, error: oldJobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "finished")
      .lt("actual_end_time", sixMonthsAgo);

    if (oldJobsError) {
      log.error("jobs.archive_query_failed", oldJobsError);
    } else if (oldJobs && oldJobs.length > 0) {
      const { error: archiveError } = await supabase.from("archived_jobs").insert(oldJobs);
      if (archiveError) {
        log.error("jobs.archive_insert_failed", archiveError);
      } else {
        const ids = (oldJobs as Array<{ id: string }>).map((j) => j.id);
        const { error: deleteError } = await supabase.from("jobs").delete().in("id", ids);
        if (deleteError) {
          log.error("jobs.archive_delete_failed", deleteError);
        } else {
          archivedJobs = oldJobs.length;
        }
      }
    }

    const totalPurged = purge.reduce((acc, r) => acc + Number(r.deleted_count), 0);
    log.info("cleanup.completed", { totalPurged, archivedJobs, byTable: purgeSummary });

    return new Response(
      JSON.stringify({ success: true, requestId, purged: purgeSummary, archivedJobs, totalPurged }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    log.error("unhandled_error", error);
    return new Response(JSON.stringify({ error: "Internal server error", requestId }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
