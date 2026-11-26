import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

/**
 * Snapshots de `public.system_metrics`, gravados pelo `metrics-collector`
 * (pg_cron a cada 5 min). A política de leitura é restrita a gestores e admins.
 *
 * O collector grava `null` quando uma contagem falha (ex.: RPC ausente) para não
 * inventar zero — a tela precisa exibir "—" nesses casos, nunca "0".
 */
export const systemMetricsSnapshotSchema = z.object({
  id: z.string(),
  collected_at: z.string(),
  metrics: z.record(z.string(), z.unknown()).default({}),
});

export type SystemMetricsSnapshot = z.infer<typeof systemMetricsSnapshotSchema>;

/** O collector roda a cada 5 min; acima de 30 min sem snapshot a coleta está parada. */
export const METRICS_STALE_AFTER_MINUTES = 30;

export function lerContagem(
  metrics: Record<string, unknown>,
  grupo: string,
  campo: string,
): number | null {
  const bloco = metrics[grupo];
  if (!bloco || typeof bloco !== "object") return null;
  const valor = (bloco as Record<string, unknown>)[campo];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

export function formatarContagem(valor: number | null): string {
  return valor === null ? "—" : valor.toLocaleString("pt-BR");
}

export function estaDesatualizada(
  collectedAt: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!collectedAt) return true;
  const momento = new Date(collectedAt).getTime();
  if (Number.isNaN(momento)) return true;
  return agora.getTime() - momento > METRICS_STALE_AFTER_MINUTES * 60_000;
}

export function ultimoSnapshot(
  snapshots: SystemMetricsSnapshot[],
): SystemMetricsSnapshot | null {
  if (snapshots.length === 0) return null;
  return snapshots.reduce((maisNovo, atual) =>
    new Date(atual.collected_at).getTime() > new Date(maisNovo.collected_at).getTime()
      ? atual
      : maisNovo,
  );
}

export function useSystemMetrics(limit = 20, refreshKey = 0) {
  return useQuery<SystemMetricsSnapshot[]>({
    // `refreshKey` entra na chave para que o botao "Atualizar" da pagina de
    // monitoramento recarregue o cartao alem dos dados de `useMonitoringData`.
    queryKey: ["system-metrics", limit, refreshKey],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_metrics")
        .select("id, collected_at, metrics")
        .order("collected_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      const parsed = z.array(systemMetricsSnapshotSchema).safeParse(data ?? []);
      return parsed.success ? parsed.data : [];
    },
    retry: false,
  });
}