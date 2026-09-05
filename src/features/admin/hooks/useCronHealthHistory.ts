import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

/**
 * Histórico de saúde das rotinas automáticas (`public.cron_health_history`).
 * Alimentado a cada 15 min por `public.snapshot_cron_health()` e legível
 * apenas por coordenadores/gestores (RLS).
 */
export const cronHealthHistoryRowSchema = z.object({
  id: z.string(),
  jobid: z.number(),
  jobname: z.string().nullable(),
  consecutive_failures: z.number().nullable(),
  last_status: z.string().nullable(),
  last_duration_ms: z.number().nullable(),
  captured_at: z.string(),
  is_stale: z.boolean().nullable().optional(),
  expected_interval_minutes: z.number().nullable().optional(),
});

export type CronHealthHistoryRow = z.infer<typeof cronHealthHistoryRowSchema>;

export interface CronHealthTrend {
  jobid: number;
  jobname: string;
  points: Array<{ capturedAt: string; failures: number; durationMs: number | null }>;
  failureRatePct: number;
  avgDurationMs: number | null;
  /** Percentil 95 da duração observada — evidencia caudas lentas ocultas pela média. */
  p95DurationMs: number | null;
  maxDurationMs: number | null;
  /** p95 das últimas 24h — janela "recente" usada na detecção de degradação. */
  p95RecentMs: number | null;
  /** p95 do período anterior às últimas 24h — linha de base histórica. */
  p95BaselineMs: number | null;
  /** Variação percentual do p95 recente sobre a linha de base (null se indisponível). */
  p95DegradationPct: number | null;
  worstFailures: number;
  /** Rotina sem execução dentro do intervalo esperado na coleta mais recente. */
  isStale: boolean;
  expectedIntervalMinutes: number | null;
}

/**
 * Percentil por interpolação linear (método R-7, igual ao de planilhas).
 * Retorna `null` para amostras vazias.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = (sorted.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}




export function useCronHealthHistory(days = 7) {
  return useQuery<CronHealthTrend[]>({
    queryKey: ["cron-health-history", days],
    refetchInterval: 300_000,
    retry: false,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("cron_health_history")
        .select(
          "id, jobid, jobname, consecutive_failures, last_status, last_duration_ms, captured_at, is_stale, expected_interval_minutes",
        )

        .gte("captured_at", since)
        .order("captured_at", { ascending: true })
        .limit(2000);

      if (error) throw new Error(error.message);

      const parsed = z.array(cronHealthHistoryRowSchema).safeParse(data ?? []);
      if (!parsed.success) return [];

      const byJob = new Map<number, CronHealthHistoryRow[]>();
      for (const row of parsed.data) {
        const list = byJob.get(row.jobid) ?? [];
        list.push(row);
        byJob.set(row.jobid, list);
      }

      return Array.from(byJob.entries())
        .map(([jobid, rows]) => {
          const durations = rows
            .map((r) => r.last_duration_ms)
            .filter((d): d is number => typeof d === "number");
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          const recentDurations = rows
            .filter((r) => new Date(r.captured_at).getTime() >= cutoff)
            .map((r) => r.last_duration_ms)
            .filter((d): d is number => typeof d === "number");
          const baselineDurations = rows
            .filter((r) => new Date(r.captured_at).getTime() < cutoff)
            .map((r) => r.last_duration_ms)
            .filter((d): d is number => typeof d === "number");

          // Exige amostra mínima em ambas as janelas para evitar falso positivo.
          const MIN_SAMPLES = 3;
          const p95Recent =
            recentDurations.length >= MIN_SAMPLES ? percentile(recentDurations, 0.95) : null;
          const p95Baseline =
            baselineDurations.length >= MIN_SAMPLES ? percentile(baselineDurations, 0.95) : null;

          const failedSamples = rows.filter((r) => (r.consecutive_failures ?? 0) > 0).length;

          return {
            jobid,
            jobname: rows[rows.length - 1]?.jobname ?? `job ${jobid}`,
            points: rows.map((r) => ({
              capturedAt: r.captured_at,
              failures: r.consecutive_failures ?? 0,
              durationMs: r.last_duration_ms,
            })),
            failureRatePct: rows.length > 0 ? (failedSamples / rows.length) * 100 : 0,
            avgDurationMs:
              durations.length > 0
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                : null,
            p95DurationMs: (() => {
              const v = percentile(durations, 0.95);
              return v === null ? null : Math.round(v);
            })(),
            maxDurationMs: durations.length > 0 ? Math.max(...durations) : null,
            p95RecentMs: p95Recent === null ? null : Math.round(p95Recent),
            p95BaselineMs: p95Baseline === null ? null : Math.round(p95Baseline),
            p95DegradationPct:
              p95Recent === null || p95Baseline === null || p95Baseline <= 0
                ? null
                : Math.round(((p95Recent - p95Baseline) / p95Baseline) * 100),

            worstFailures: rows.reduce((max, r) => Math.max(max, r.consecutive_failures ?? 0), 0),
            isStale: rows[rows.length - 1]?.is_stale === true,
            expectedIntervalMinutes: rows[rows.length - 1]?.expected_interval_minutes ?? null,
          };

        })
        .sort((a, b) => b.failureRatePct - a.failureRatePct);
    },
  });
}
