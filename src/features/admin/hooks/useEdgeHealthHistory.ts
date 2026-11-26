import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Histórico de saúde das funções de servidor (`public.edge_health_history`).
 * O `health-monitor` grava uma coleta a cada ~5 min com uma checagem por
 * domínio (autenticação, armazenamento, banco, segredos e fila). RLS: leitura
 * restrita a coordenadores e gestores.
 */
export const edgeCheckStatusSchema = z.enum(["pass", "warn", "fail"]);

export type EdgeCheckStatus = z.infer<typeof edgeCheckStatusSchema>;

const STATUS_ALIASES: Record<string, EdgeCheckStatus> = {
  pass: "pass",
  healthy: "pass",
  ok: "pass",
  up: "pass",
  warn: "warn",
  warning: "warn",
  degraded: "warn",
  fail: "fail",
  error: "fail",
  unhealthy: "fail",
  outage: "fail",
  down: "fail",
};

/** Mesmo vocabulário aceito por `supabase/functions/_shared/checkStatus.ts`. */
export function toEdgeStatus(raw: unknown): EdgeCheckStatus {
  return STATUS_ALIASES[String(raw ?? "").trim().toLowerCase()] ?? "fail";
}

const edgeCheckSchema = z.object({
  status: z.unknown().optional(),
  time: z.string().optional(),
  observedUnit: z.string().nullish(),
  observedValue: z.number().nullish(),
});

export const edgeHealthRowSchema = z.object({
  id: z.string(),
  status: z.unknown(),
  checks: z.record(z.string(), edgeCheckSchema).nullish(),
  latency_ms: z.number().nullish(),
  source: z.string(),
  captured_at: z.string(),
});

export type EdgeHealthRow = z.infer<typeof edgeHealthRowSchema>;

/** Rótulos em português das checagens emitidas pelo `health-monitor`. */
export const EDGE_CHECK_LABELS: Record<string, string> = {
  "auth:session": "Autenticação (sessão)",
  "storage:list": "Armazenamento (listagem)",
  "database:read": "Banco de dados (leitura)",
  "config:secrets": "Configuração de segredos",
  "queue:tpm_notifications": "Fila de notificações TPM",
};

const KNOWN_CHECK_ORDER = Object.keys(EDGE_CHECK_LABELS);

export function edgeCheckLabel(key: string): string {
  return EDGE_CHECK_LABELS[key] ?? key;
}

/** Converte a unidade observada em texto legível (sem inventar unidade). */
export function formatObserved(unit?: string | null, value?: number | null): string {
  if (value === null || value === undefined) return "—";
  if (unit === "ms") return `${value} ms`;
  if (unit === "items") return value === 1 ? "1 item na fila" : `${value} itens na fila`;
  if (unit === "missing") {
    return value === 0 ? "nenhum segredo ausente" : `${value} segredo(s) ausente(s)`;
  }
  return String(value);
}

export interface EdgeCheckSummary {
  key: string;
  label: string;
  /** Estado da coleta mais recente em que a checagem apareceu. */
  status: EdgeCheckStatus;
  observed: string;
  /** Quantas coletas da janela trouxeram falha nessa checagem. */
  failures: number;
}

export interface EdgeHealthSummary {
  rows: EdgeHealthRow[];
  latest: EdgeHealthRow | null;
  latestStatus: EdgeCheckStatus | null;
  checks: EdgeCheckSummary[];
  passRatePct: number | null;
  lastFailAt: string | null;
}

/** Consolida uma checagem por domínio, usando a coleta mais recente de cada uma. */
export function summarizeEdgeChecks(rows: EdgeHealthRow[]): EdgeCheckSummary[] {
  const chronological = [...rows].sort(
    (a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at),
  );
  const byKey = new Map<string, EdgeCheckSummary>();

  for (const row of chronological) {
    for (const [key, check] of Object.entries(row.checks ?? {})) {
      const status = toEdgeStatus(check.status);
      const previous = byKey.get(key);
      byKey.set(key, {
        key,
        label: edgeCheckLabel(key),
        status,
        observed: formatObserved(check.observedUnit, check.observedValue),
        failures: (previous?.failures ?? 0) + (status === "fail" ? 1 : 0),
      });
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const indexA = KNOWN_CHECK_ORDER.indexOf(a.key);
    const indexB = KNOWN_CHECK_ORDER.indexOf(b.key);
    if (indexA === -1 && indexB === -1) return a.key.localeCompare(b.key);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

export function summarizeEdgeHealth(rows: EdgeHealthRow[]): EdgeHealthSummary {
  const ordered = [...rows].sort(
    (a, b) => Date.parse(b.captured_at) - Date.parse(a.captured_at),
  );
  const latest = ordered[0] ?? null;
  const passed = ordered.filter((row) => toEdgeStatus(row.status) === "pass").length;
  const lastFail = ordered.find((row) => toEdgeStatus(row.status) !== "pass") ?? null;

  return {
    rows: ordered,
    latest,
    latestStatus: latest ? toEdgeStatus(latest.status) : null,
    checks: summarizeEdgeChecks(ordered),
    passRatePct: ordered.length > 0 ? Math.round((passed / ordered.length) * 100) : null,
    lastFailAt: lastFail?.captured_at ?? null,
  };
}

export function useEdgeHealthHistory(limit = 24) {
  return useQuery<EdgeHealthSummary>({
    queryKey: ["edge-health-history", limit],
    refetchInterval: 120_000,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edge_health_history")
        .select("id, status, checks, latency_ms, source, captured_at")
        .order("captured_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      const parsed = z.array(edgeHealthRowSchema).safeParse(data ?? []);
      if (!parsed.success) return summarizeEdgeHealth([]);

      return summarizeEdgeHealth(parsed.data);
    },
  });
}