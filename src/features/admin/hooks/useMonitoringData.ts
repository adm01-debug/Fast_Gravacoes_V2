import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subHours, startOfHour, format } from "date-fns";

export type MonitoringWindow = "1h" | "24h" | "7d";

const windowToHours: Record<MonitoringWindow, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
};

export interface MonitoringSnapshot {
  rlsViolations: Array<{ id: string; created_at: string; event_type: string; user_email: string | null; details: unknown }>;
  apiErrors: Array<{ id: string; created_at: string; message: string; component_name: string | null; url: string | null }>;
  slowQueries: Array<{ id: string; created_at: string; operation: string; table_name: string | null; duration_ms: number; severity: string | null }>;
  failedLogins: Array<{ id: string; created_at: string; user_email: string; failure_reason: string | null; ip_address: string | null }>;
  totals: {
    rls: number;
    apiErrors: number;
    slowQueries: number;
    failedLogins: number;
    avgQueryMs: number;
  };
  timeline: Array<{ hour: string; errors: number; slow: number; rls: number }>;
}

export function useMonitoringData(windowKey: MonitoringWindow) {
  return useQuery<MonitoringSnapshot>({
    queryKey: ["monitoring", windowKey],
    refetchInterval: 30_000,
    queryFn: async () => {
      const since = subHours(new Date(), windowToHours[windowKey]).toISOString();

      const [rlsRes, errorsRes, slowRes, loginRes, avgRes] = await Promise.all([
        supabase
          .from("security_events")
          .select("id, created_at, event_type, user_email, details")
          .in("event_type", ["RLS_VIOLATION", "UNAUTHORIZED_ACCESS", "PERMISSION_DENIED"])
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("error_logs")
          .select("id, created_at, message, component_name, url")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("query_telemetry")
          .select("id, created_at, operation, table_name, duration_ms, severity")
          .in("severity", ["warn", "critical"])
          .gte("created_at", since)
          .order("duration_ms", { ascending: false })
          .limit(200),
        supabase
          .from("login_audit")
          .select("id, created_at, user_email, failure_reason, ip_address")
          .eq("login_status", "failed")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("query_telemetry")
          .select("duration_ms")
          .gte("created_at", since)
          .limit(1000),
      ]);

      const rls = (rlsRes.data ?? []).map((r) => ({
        ...r,
        user_email: (r.user_email as string | null) ?? null,
      }));
      const errors = errorsRes.data ?? [];
      const slow = (slowRes.data ?? []).map((r) => ({
        ...r,
        table_name: r.table_name as string | null,
        severity: r.severity as string | null,
      }));
      const logins = (loginRes.data ?? []).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        user_email: r.user_email,
        failure_reason: r.failure_reason,
        ip_address: r.ip_address == null ? null : String(r.ip_address),
      }));
      const durations = (avgRes.data ?? []).map((r) => r.duration_ms ?? 0);
      const avgMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      // Timeline bucketed by hour
      const buckets = new Map<string, { errors: number; slow: number; rls: number }>();
      const hoursSpan = Math.min(windowToHours[windowKey], 168);
      for (let i = hoursSpan - 1; i >= 0; i--) {
        const key = format(startOfHour(subHours(new Date(), i)), "MM/dd HH:00");
        buckets.set(key, { errors: 0, slow: 0, rls: 0 });
      }
      const bump = (ts: string, key: keyof { errors: number; slow: number; rls: number }) => {
        const bucket = format(startOfHour(new Date(ts)), "MM/dd HH:00");
        const b = buckets.get(bucket);
        if (b) b[key]++;
      };
      errors.forEach((e) => bump(e.created_at, "errors"));
      slow.forEach((e) => bump(e.created_at, "slow"));
      rls.forEach((e) => bump(e.created_at, "rls"));

      return {
        rlsViolations: rls,
        apiErrors: errors,
        slowQueries: slow,
        failedLogins: logins,
        totals: {
          rls: rls.length,
          apiErrors: errors.length,
          slowQueries: slow.length,
          failedLogins: logins.length,
          avgQueryMs: avgMs,
        },
        timeline: Array.from(buckets.entries()).map(([hour, v]) => ({ hour, ...v })),
      };
    },
  });
}

export interface AlertThresholds {
  rlsPerHour: number;
  errorsPerHour: number;
  slowPerHour: number;
  failedLoginsPerHour: number;
  avgQueryMs: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  rlsPerHour: 5,
  errorsPerHour: 20,
  slowPerHour: 30,
  failedLoginsPerHour: 10,
  avgQueryMs: 800,
};

const STORAGE_KEY = "monitoring:thresholds:v1";

export function loadThresholds(): AlertThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function saveThresholds(t: AlertThresholds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}
