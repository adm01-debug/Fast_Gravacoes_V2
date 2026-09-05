import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tendência diária de desempenho das rotinas automáticas
 * (`public.cron_p95_daily`, consolidada de hora em hora por
 * `public.rollup_cron_p95_daily`). Retenção de 365 dias — permite avaliar
 * degradação de longo prazo, além da janela de 90 dias do histórico bruto.
 */
export const cronP95DailyRowSchema = z.object({
  day: z.string(),
  jobid: z.number(),
  jobname: z.string().nullable(),
  samples: z.number(),
  p95_ms: z.number().nullable(),
  avg_ms: z.number().nullable(),
  max_ms: z.number().nullable(),
  failure_rate_pct: z.coerce.number(),
});

export type CronP95DailyRow = z.infer<typeof cronP95DailyRowSchema>;

export interface CronP95DailySeries {
  jobid: number;
  jobname: string;
  points: Array<{ day: string; p95Ms: number | null; avgMs: number | null; failureRatePct: number }>;
  /** Variação percentual do p95 do último dia sobre a mediana dos dias anteriores. */
  driftPct: number | null;
  latestP95Ms: number | null;
}

/** Mediana simples — robusta a outliers, usada como linha de base histórica. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Calcula o desvio do último ponto contra a mediana dos anteriores (mín. 3 dias). */
export function computeDrift(p95Series: Array<number | null>): number | null {
  const valid = p95Series.filter((v): v is number => typeof v === "number");
  if (valid.length < 4) return null;
  const latest = valid[valid.length - 1];
  const baseline = median(valid.slice(0, -1));
  if (baseline === null || baseline <= 0) return null;
  return Math.round(((latest - baseline) / baseline) * 100);
}

export function useCronP95Daily(days = 90) {
  return useQuery<CronP95DailySeries[]>({
    queryKey: ["cron-p95-daily", days],
    refetchInterval: 600_000,
    retry: false,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("cron_p95_daily")
        .select("day, jobid, jobname, samples, p95_ms, avg_ms, max_ms, failure_rate_pct")
        .gte("day", since)
        .order("day", { ascending: true })
        .limit(5000);

      if (error) throw new Error(error.message);

      const parsed = z.array(cronP95DailyRowSchema).safeParse(data ?? []);
      if (!parsed.success) return [];

      const byJob = new Map<number, CronP95DailyRow[]>();
      for (const row of parsed.data) {
        const list = byJob.get(row.jobid) ?? [];
        list.push(row);
        byJob.set(row.jobid, list);
      }

      return Array.from(byJob.entries())
        .map(([jobid, rows]) => {
          const points = rows.map((r) => ({
            day: r.day,
            p95Ms: r.p95_ms,
            avgMs: r.avg_ms,
            failureRatePct: r.failure_rate_pct,
          }));
          const driftPct = computeDrift(points.map((p) => p.p95Ms));
          return {
            jobid,
            jobname: rows[rows.length - 1]?.jobname ?? `job ${jobid}`,
            points,
            driftPct,
            latestP95Ms: points[points.length - 1]?.p95Ms ?? null,
          };
        })
        .sort((a, b) => (b.driftPct ?? -Infinity) - (a.driftPct ?? -Infinity));
    },
  });
}
