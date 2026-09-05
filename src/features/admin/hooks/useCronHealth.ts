import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

/**
 * Saúde dos agendamentos automáticos (pg_cron).
 * Lê `public.get_cron_health()` — função SECURITY DEFINER que só responde
 * para coordenadores/gestores e devolve o status da última execução mais
 * a contagem de falhas consecutivas por rotina.
 */
export const cronHealthRowSchema = z.object({
  jobid: z.number(),
  jobname: z.string().nullable(),
  schedule: z.string().nullable(),
  active: z.boolean().nullable(),
  last_status: z.string().nullable(),
  last_run: z.string().nullable(),
  last_duration_ms: z.number().nullable(),
  consecutive_failures: z.number().nullable(),
  last_error: z.string().nullable(),
});

export type CronHealthRow = z.infer<typeof cronHealthRowSchema>;

/** Nº de ciclos falhados seguidos a partir do qual a rotina é considerada crítica. */
export const CRON_FAILURE_ALERT_THRESHOLD = 3;

export function useCronHealth() {
  return useQuery<CronHealthRow[]>({
    queryKey: ["cron-health"],
    refetchInterval: 60_000,
    queryFn: async () => {
      // `get_cron_health` é uma função customizada; o client tipado ainda não a
      // conhece, por isso a chamada é feita de forma não tipada + validada com Zod.
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      )("get_cron_health");

      if (error) throw new Error(error.message);
      const parsed = z.array(cronHealthRowSchema).safeParse(data ?? []);
      return parsed.success ? parsed.data : [];
    },
    retry: false,
  });
}

export function isCronCritical(row: CronHealthRow): boolean {
  return (row.consecutive_failures ?? 0) >= CRON_FAILURE_ALERT_THRESHOLD;
}
