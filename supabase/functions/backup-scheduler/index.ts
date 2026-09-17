import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronSecret } from "../_shared/cronAuth.ts";

const PAGE_SIZE = 5000;
const MAX_PAGES = 20; // hard cap: 100k rows per table

async function fetchAllRows(
  supabase: any,  // ReturnType<typeof createClient> gera generics incompativeis com o client instanciado via env
  table: string,
): Promise<{ rows: Record<string, unknown>[]; truncated: boolean }> {
  const rows: Record<string, unknown>[] = [];
  let page = 0;

  while (page < MAX_PAGES) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break; // last page
    page++;
  }

  const truncated = page >= MAX_PAGES;
  if (truncated) {
    console.warn(`backup-scheduler: table '${table}' hit ${MAX_PAGES}-page cap (${rows.length} rows); data may be incomplete`);
  }
  return { rows, truncated };
}

serve(async (req) => {
  // Reads/exports full tables — fail closed if CRON_SECRET is not configured.
  const unauthorized = requireCronSecret(req, { failClosed: true });
  if (unauthorized) return unauthorized;

  try {
    // Guard with a shared secret so only cron infrastructure can trigger this
    const apiKey = Deno.env.get("BACKUP_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const provided = req.headers.get("x-api-key") || req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (provided !== apiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const tables = ["jobs", "profiles", "machines", "quality_checks", "maintenance_logs"];
    const backupId = `backup-${Date.now()}`;
    const results: Record<string, number> = {};

    for (const table of tables) {
      let rows: Record<string, unknown>[];
      try {
        ({ rows } = await fetchAllRows(supabase, table));
      } catch (err) {
        console.error(`Error backing up ${table}:`, err instanceof Error ? err.message : String(err));
        continue;
      }

      const backupData = JSON.stringify(rows);
      const { error: uploadError } = await supabase.storage
        .from("backups")
        .upload(`${backupId}/${table}.json`, backupData, {
          contentType: "application/json",
        });

      if (uploadError) {
        console.error(`Failed to upload backup for ${table}:`, uploadError.message);
      } else {
        results[table] = rows.length;
      }
    }

    // Log backup — failure here is non-fatal but should be visible.
    const { error: logError } = await supabase.from("backup_logs").insert({
      backup_id: backupId,
      tables_backed_up: results,
      created_at: new Date().toISOString(),
    });
    if (logError) {
      console.error("backup-scheduler: failed to write backup_logs entry:", logError.message);
    }

    return new Response(JSON.stringify({ success: true, backupId, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error('Backup scheduler error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
