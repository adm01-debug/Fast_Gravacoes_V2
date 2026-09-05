// Health Monitor — cron-triggered watcher that polls internal health-check
// and forwards degraded/failed states to Sentry (via Store API) and the
// security_events table for auditing.
//
// Schedule via pg_cron every 5 minutes. Secure via CRON_SECRET header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId } from "../_shared/logger.ts";

interface HealthResponse {
  status: "pass" | "warn" | "fail";
  checks?: Record<string, { status: string; observedValue?: unknown; output?: string }>;
}

async function forwardToSentry(dsn: string, payload: HealthResponse, requestId: string) {
  // Parse DSN: https://<key>@<host>/<project_id>
  const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
  if (!match) return;
  const [, key, host, projectId] = match;
  const url = `https://${host}/api/${projectId}/store/`;
  const auth = `Sentry sentry_version=7, sentry_key=${key}, sentry_client=lovable-health-monitor/1.0`;

  const failing = Object.entries(payload.checks ?? {})
    .filter(([, c]) => c.status !== "pass")
    .map(([k, c]) => `${k}=${c.status}`)
    .join(", ") || "unknown";

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    level: payload.status === "fail" ? "error" : "warning",
    logger: "health-monitor",
    message: `Health degraded: ${failing}`,
    tags: { component: "edge-functions", request_id: requestId, health_status: payload.status },
    extra: { checks: payload.checks ?? {} },
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": auth },
      body: JSON.stringify(event),
    });
  } catch {
    // Swallow — Sentry outages must never fail the monitor.
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "health-monitor", requestId });
  const corsHeaders = { ...getCorsHeaders(req), "Content-Type": "application/json" };

  // Cron auth
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    log.warn("unauthorized_cron_call");
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Poll internal health-check
  let health: HealthResponse | null = null;
  const startedAt = Date.now();
  let latencyMs = 0;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/health-check`, {
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
    });
    health = (await res.json()) as HealthResponse;
    latencyMs = Date.now() - startedAt;
  } catch (e) {
    log.error("health_fetch_failed", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ ok: false, error: "health fetch failed" }), { status: 502, headers: corsHeaders });
  }

  const status = health?.status ?? "fail";
  log.info("health_polled", { status, latencyMs });

  // Persistir a coleta para alimentar o resumo consolidado de /status.
  // Falha na persistência nunca deve derrubar o monitor.
  const { error: persistError } = await supabase.from("edge_health_history").insert({
    status,
    checks: health?.checks ?? {},
    latency_ms: latencyMs,
    source: "health-monitor",
  });
  if (persistError) {
    log.warn("edge_health_persist_failed", { error: persistError.message });
  }

  if (status !== "pass") {
    // Audit in security_events
    await supabase.from("security_events").insert({
      event_type: "HEALTH_DEGRADED",
      description: `Edge functions health = ${status}`,
      metadata: { checks: health?.checks ?? {}, requestId },
    });

    // Forward to Sentry if DSN configured
    const dsn = Deno.env.get("SENTRY_DSN");
    if (dsn) {
      await forwardToSentry(dsn, health as HealthResponse, requestId);
    }
  }

  return new Response(JSON.stringify({ ok: true, status, requestId }), { status: 200, headers: corsHeaders });
});
