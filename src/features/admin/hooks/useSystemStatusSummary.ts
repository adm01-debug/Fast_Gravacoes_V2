import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resumo agregado da saúde do sistema (`public.get_system_status_summary`).
 * Função SECURITY DEFINER que exige apenas um papel ativo — devolve somente
 * números, nunca mensagens de erro ou detalhes internos das rotinas.
 */
export const overallStatusSchema = z.enum(["operational", "degraded", "outage", "unknown"]);

export const systemStatusSummarySchema = z.object({
  total_jobs: z.number(),
  healthy_jobs: z.number(),
  failing_jobs: z.number(),
  stale_jobs: z.number(),
  last_capture: z.string().nullable(),
  /** Saúde das funções de servidor na última coleta (≤ 60 min). */
  edge_status: overallStatusSchema.nullable().default("unknown"),
  edge_last_check: z.string().nullable().default(null),
});

export type SystemStatusSummary = z.infer<typeof systemStatusSummarySchema>;

export type OverallStatus = z.infer<typeof overallStatusSchema>;

/** Severidade relativa — usada para combinar domínios independentes. */
const SEVERITY: Record<OverallStatus, number> = {
  operational: 0,
  unknown: 1,
  degraded: 2,
  outage: 3,
};

/** Estado das rotinas automáticas isoladamente. */
export function deriveCronStatus(summary: SystemStatusSummary | null): OverallStatus {
  if (!summary || summary.total_jobs === 0) return "unknown";
  if (summary.failing_jobs > 0) return "outage";
  if (summary.stale_jobs > 0) return "degraded";
  return "operational";
}

/** Estado das funções de servidor isoladamente. */
export function deriveEdgeStatus(summary: SystemStatusSummary | null): OverallStatus {
  return summary?.edge_status ?? "unknown";
}

/**
 * Deriva o estado global combinando rotinas automáticas e funções de servidor.
 * Vence sempre o domínio mais severo (outage > degraded > unknown > operational).
 */
export function deriveOverallStatus(summary: SystemStatusSummary | null): OverallStatus {
  const cron = deriveCronStatus(summary);
  const edge = deriveEdgeStatus(summary);
  return SEVERITY[edge] > SEVERITY[cron] ? edge : cron;
}

export function useSystemStatusSummary() {
  return useQuery<SystemStatusSummary | null>({
    queryKey: ["system-status-summary"],
    refetchInterval: 120_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      )("get_system_status_summary");

      if (error) throw new Error(error.message);

      const parsed = z.array(systemStatusSummarySchema).safeParse(data ?? []);
      if (!parsed.success || parsed.data.length === 0) return null;
      return parsed.data[0];
    },
  });
}
