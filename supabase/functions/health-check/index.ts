// Consolidated health-check — inspired by RFC "Health Check Response Format
// for HTTP APIs" (draft-inadarei-api-health-check). Returns per-component
// status with latency and observation timestamps, without leaking secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";

interface CheckResult {
  status: "pass" | "warn" | "fail";
  observedValue?: number | string;
  observedUnit?: string;
  time: string;
  output?: string;
}

const CRITICAL_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
];

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; ms: number; error: string | null }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { result, ms: Date.now() - start, error: null };
  } catch (e) {
    return { result: null, ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "health-check", requestId });
  const started = Date.now();

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(url, serviceKey);

  const checks: Record<string, CheckResult> = {};

  // 1. Database
  {
    const t = await timed(() =>
      withTimeout(supabase.from("profiles").select("id", { count: "exact", head: true }), 3000, "db")
    );
    checks["database:read"] = {
      status: t.error ? "fail" : t.ms > 1500 ? "warn" : "pass",
      observedValue: t.ms,
      observedUnit: "ms",
      time: new Date().toISOString(),
      output: t.error ?? undefined,
    };
  }

  // 2. Storage
  {
    const t = await timed(() => withTimeout(supabase.storage.listBuckets(), 3000, "storage"));
    checks["storage:list"] = {
      status: t.error ? "fail" : t.ms > 1500 ? "warn" : "pass",
      observedValue: t.ms,
      observedUnit: "ms",
      time: new Date().toISOString(),
      output: t.error ?? undefined,
    };
  }

  // 3. Auth
  {
    const t = await timed(() => withTimeout(supabase.auth.getSession(), 2000, "auth"));
    checks["auth:session"] = {
      status: t.error ? "fail" : "pass",
      observedValue: t.ms,
      observedUnit: "ms",
      time: new Date().toISOString(),
      output: t.error ?? undefined,
    };
  }

  // 4. Notification queue backlog
  {
    const t = await timed(async () => {
      const { count, error } = await supabase
        .from("tpm_notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("processed", false);
      if (error) throw error;
      return count ?? 0;
    });
    const backlog = (t.result as number | null) ?? 0;
    checks["queue:tpm_notifications"] = {
      status: t.error ? "warn" : backlog > 500 ? "warn" : "pass",
      observedValue: backlog,
      observedUnit: "items",
      time: new Date().toISOString(),
      output: t.error ?? undefined,
    };
  }

  // 5. Critical secrets present (do NOT leak values).
  {
    const missing = CRITICAL_SECRETS.filter((k) => !Deno.env.get(k));
    checks["config:secrets"] = {
      status: missing.length === 0 ? "pass" : "fail",
      observedValue: missing.length,
      observedUnit: "missing",
      time: new Date().toISOString(),
      output: missing.length > 0 ? `Missing: ${missing.join(", ")}` : undefined,
    };
  }

  const allStatuses = Object.values(checks).map((c) => c.status);
  const overall: "pass" | "warn" | "fail" = allStatuses.includes("fail")
    ? "fail"
    : allStatuses.includes("warn")
      ? "warn"
      : "pass";

  const statusText = overall === "pass" ? "healthy" : overall === "warn" ? "degraded" : "unhealthy";

  log.info("health_check", { overall, latencyMs: Date.now() - started });

  const body = {
    status: statusText,
    version: "2.0.0",
    releaseId: Deno.env.get("APP_VERSION") ?? "unknown",
    serviceId: "fast-gravacoes-edge",
    timestamp: new Date().toISOString(),
    responseTime: `${Date.now() - started}ms`,
    checks,
    requestId,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: withRequestId(
      { ...getCorsHeaders(req), "Content-Type": "application/health+json" },
      requestId,
    ),
  });
});
