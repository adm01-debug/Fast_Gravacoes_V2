import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";

interface TelemetryPayload {
  operation: string;
  table_name?: string | null;
  rpc_name?: string | null;
  duration_ms: number;
  record_count?: number | null;
  query_limit?: number | null;
  query_offset?: number | null;
  count_mode?: string | null;
  severity: string;
  error_message?: string | null;
  user_id?: string | null;
}

/** Classify query duration into severity levels */
export function classifySeverity(durationMs: number, hasError: boolean): string {
  if (hasError) return "error";
  if (durationMs >= 8000) return "very_slow";
  if (durationMs >= 3000) return "slow";
  return "normal";
}

/** Build a telemetry payload from request data */
export function buildTelemetryPayload(
  operation: string,
  tableName: string | null,
  rpcName: string | null,
  durationMs: number,
  opts: {
    recordCount?: number | null;
    queryLimit?: number | null;
    queryOffset?: number | null;
    countMode?: string | null;
    errorMessage?: string | null;
    userId?: string | null;
  } = {}
): TelemetryPayload {
  const hasError = !!opts.errorMessage;
  return {
    operation,
    table_name: tableName,
    rpc_name: rpcName,
    duration_ms: Math.max(0, Math.round(durationMs)),
    record_count: opts.recordCount ?? null,
    query_limit: opts.queryLimit ?? null,
    query_offset: opts.queryOffset ?? null,
    count_mode: opts.countMode ?? null,
    severity: classifySeverity(durationMs, hasError),
    error_message: opts.errorMessage ?? null,
    user_id: opts.userId ?? null,
  };
}

/** Persist telemetry to the database (fire-and-forget) */
export async function emitTelemetry(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: TelemetryPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from("query_telemetry").insert(payload);
    if (error) {
      console.error("[emitTelemetry] Insert error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[emitTelemetry] Exception:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Validates a columns string to prevent FK path traversal.
 * Only simple comma-separated identifiers are allowed — no spaces, no nested
 * selects, no FK relationship expansion (e.g. "*, related_table(*)").
 */
const COLUMNS_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(,[a-zA-Z_][a-zA-Z0-9_]*)*$/;

export function validateColumns(columns: unknown): string | null {
  if (!columns || columns === "*") return "*";
  if (typeof columns !== "string") return null;
  const trimmed = columns.trim();
  if (!COLUMNS_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Defense-in-depth allowlist. Even admins must not use this bridge to
 * hit auth/storage internals or arbitrary security-definer functions.
 * Extend cautiously — every entry bypasses RLS.
 */
export const ALLOWED_TABLES = new Set<string>([
  "jobs",
  "job_status_audit",
  "machines",
  "operators",
  "profiles",
  "user_roles",
  "inventory_items",
  "inventory_movements",
  "technical_sheets",
  "maintenance_records",
  "maintenance_schedules",
  "audit_log",
  "security_events",
  "push_subscriptions",
  "query_telemetry",
  "webhook_logs",
  "bitrix24_sync_history",
]);

export const ALLOWED_RPCS = new Set<string>([
  "get_user_role",
  "has_role",
  "has_any_active_role",
  "verify_audit_chain",
  "increment_sheet_view_count",
  "check_and_notify_kpi_alert",
  "refresh_operator_rankings",
]);

/** Validate incoming bridge request */
export function validateBridgeRequest(body: any): {
  valid: boolean;
  error?: string;
  data?: {
    action: string;
    table?: string;
    rpc?: string;
    params?: Record<string, unknown>;
  };
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }
  if (!body.action || typeof body.action !== "string") {
    return { valid: false, error: "Missing or invalid 'action' field" };
  }
  const validActions = ["select", "insert", "update", "delete", "rpc", "upsert"];
  if (!validActions.includes(body.action)) {
    return { valid: false, error: `Ação inválida. Permitidas: ${validActions.join(", ")}` };
  }
  if (body.action === "rpc") {
    if (!body.rpc || typeof body.rpc !== "string") {
      return { valid: false, error: "RPC action requires a 'rpc' field" };
    }
    if (!ALLOWED_RPCS.has(body.rpc)) {
      return { valid: false, error: "RPC não permitida" };
    }
  } else {
    if (!body.table || typeof body.table !== "string") {
      return { valid: false, error: "Non-RPC actions require a 'table' field" };
    }
    if (!ALLOWED_TABLES.has(body.table)) {
      return { valid: false, error: "Tabela não permitida" };
    }
  }
  return {
    valid: true,
    data: {
      action: body.action,
      table: body.table,
      rpc: body.rpc,
      params: body.params || {},
    },
  };
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "external-db-bridge", requestId });
  const cors = withRequestId(getCorsHeaders(req), requestId);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Etapas 26-27 do plano-50: middleware comum substitui a verificacao manual
    // duplicada (Bearer -> getUser -> role lookup -> gate).
    const auth = await authenticate(req, {
      supabaseUrl,
      supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
      requestId,
      corsHeaders: cors,
    });
    if (!auth.ok) {
      log.warn("auth.rejected");
      return auth.response;
    }

    // Este bridge roda com service-role (bypass de RLS) — restrito a
    // admin/manager. Contrato preservado; elevacao para AAL2 fica como
    // evolucao futura do plano-mestre.
    const forbidden = requireRole(auth.ctx, ["admin", "manager"], { requestId, corsHeaders: cors });
    if (forbidden) {
      log.warn("guard.rejected", { roles: auth.ctx.roles });
      return forbidden;
    }

    const body = await req.json();
    const validation = validateBridgeRequest(body);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { action, table, rpc, params } = validation.data!;

    // Defense-in-depth: never allow an unscoped (empty match) update/delete,
    // which would mutate/wipe an entire table.
    if (action === "delete" || action === "update") {
      const match = params?.match;
      const hasScope = match && typeof match === "object" && Object.keys(match as object).length > 0;
      if (!hasScope) {
        return new Response(
          JSON.stringify({ error: `Action '${action}' requires a non-empty 'match' filter` }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }
    const startTime = performance.now();
    let result: any = null;
    let errorMessage: string | null = null;
    let recordCount: number | null = null;

    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      if (action === "rpc") {
        const { data, error } = await supabase.rpc(rpc!, params as any);
        if (error) throw error;
        result = data;
        recordCount = Array.isArray(data) ? data.length : data ? 1 : 0;
      } else {
        const query = supabase.from(table!);
        switch (action) {
          case "select": {
            const cols = validateColumns(params?.columns);
            if (cols === null) {
              return new Response(
                JSON.stringify({ error: "Invalid 'columns' parameter: only simple comma-separated identifiers are allowed" }),
                { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
              );
            }
            const q = query.select(cols);
            if (params?.limit) q.limit(params.limit as number);
            if (params?.offset) q.range(params.offset as number, (params.offset as number) + ((params.limit as number) || 100) - 1);
            const { data, error } = await q;
            if (error) throw error;
            result = data;
            recordCount = Array.isArray(data) ? data.length : 0;
            break;
          }
          case "insert": {
            const { data, error } = await query.insert(params?.data as any).select();
            if (error) throw error;
            result = data;
            recordCount = Array.isArray(data) ? data.length : 1;
            break;
          }
          case "update": {
            const { data, error } = await query.update(params?.data as any).match(params?.match as any).select();
            if (error) throw error;
            result = data;
            recordCount = Array.isArray(data) ? data.length : 0;
            break;
          }
          case "delete": {
            const { data, error } = await query.delete().match(params?.match as any).select();
            if (error) throw error;
            result = data;
            recordCount = Array.isArray(data) ? data.length : 0;
            break;
          }
          case "upsert": {
            const { data, error } = await query.upsert(params?.data as any).select();
            if (error) throw error;
            result = data;
            recordCount = Array.isArray(data) ? data.length : 0;
            break;
          }
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const durationMs = performance.now() - startTime;
    const telemetry = buildTelemetryPayload(
      action,
      table || null,
      rpc || null,
      durationMs,
      {
        recordCount,
        queryLimit: (params?.limit as number) || null,
        queryOffset: (params?.offset as number) || null,
        countMode: (params?.count as string) || null,
        errorMessage,
        userId: auth.ctx.userId,
      }
    );

    // Only persist telemetry for slow/error queries
    if (telemetry.severity !== "normal") {
      emitTelemetry(supabaseUrl, serviceRoleKey, telemetry).catch(console.error);
    }

    if (errorMessage) {
      // Log the detailed error server-side; return only a generic message to the caller
      // to prevent DB internals (table names, column names, constraint names) from leaking.
      console.error("[external-db-bridge] Operation error:", errorMessage);
      return new Response(
        JSON.stringify({ error: "Operation failed", telemetry: { severity: telemetry.severity, duration_ms: telemetry.duration_ms } }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        data: result,
        meta: {
          duration_ms: telemetry.duration_ms,
          record_count: recordCount,
          severity: telemetry.severity,
        },
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[external-db-bridge] Unhandled exception:", err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
