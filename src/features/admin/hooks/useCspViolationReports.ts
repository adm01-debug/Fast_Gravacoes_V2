import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Relatórios de violação de CSP (`public.csp_violation_reports`), gravados pelo
 * endpoint público `csp-report` (report-uri). A política do app está em modo
 * Report-Only: o navegador relata o que *seria* bloqueado — inclusive `eval` e
 * script inline. RLS: leitura restrita a coordenador, gestor e admin.
 */
export const cspReportSchema = z.object({
  id: z.string(),
  document_uri: z.string().nullish(),
  violated_directive: z.string().nullish(),
  effective_directive: z.string().nullish(),
  blocked_uri: z.string().nullish(),
  source_file: z.string().nullish(),
  line_number: z.number().nullish(),
  disposition: z.string().nullish(),
  created_at: z.string(),
});

export type CspReport = z.infer<typeof cspReportSchema>;

export const CSP_SELECT =
  "id, document_uri, violated_directive, effective_directive, blocked_uri, source_file, line_number, disposition, created_at";

/** Nomes das diretivas da CSP em português. */
export const CSP_DIRECTIVE_LABELS: Record<string, string> = {
  "script-src": "Scripts",
  "script-src-elem": "Scripts (elemento)",
  "script-src-attr": "Scripts (atributo)",
  "style-src": "Estilos",
  "style-src-elem": "Estilos (elemento)",
  "style-src-attr": "Estilos (atributo)",
  "connect-src": "Conexões (fetch/WebSocket)",
  "img-src": "Imagens",
  "font-src": "Fontes",
  "frame-src": "Frames",
  "worker-src": "Workers",
  "media-src": "Mídia",
  "object-src": "Objetos",
  "default-src": "Padrão (fallback)",
  "form-action": "Envio de formulário",
  "base-uri": "URI base",
  "manifest-src": "Manifesto",
};

/** Fontes que a própria página gera, sem URL (eval, script inline, data:, blob:). */
export const CSP_INLINE_SOURCES = ["inline", "eval", "data", "blob", "wasm-eval"];

export function cspDirective(row: CspReport): string {
  const directive = row.effective_directive?.trim() || row.violated_directive?.trim();
  return directive && directive.length > 0 ? directive : "desconhecida";
}

export function cspDirectiveLabel(directive: string): string {
  return CSP_DIRECTIVE_LABELS[directive] ?? directive;
}

/** Recurso que a página tentou carregar: host quando é URL, senão a marca do navegador. */
export function cspResource(row: CspReport): string {
  const uri = row.blocked_uri?.trim() ?? "";
  if (uri.length === 0) return "não informado";
  if (CSP_INLINE_SOURCES.includes(uri)) return uri;
  try {
    const parsed = new URL(uri);
    return parsed.host || uri;
  } catch {
    return uri.length > 60 ? `${uri.slice(0, 57)}...` : uri;
  }
}

/** Página onde a violação aconteceu, só com caminho e âncora. */
export function cspPage(row: CspReport): string {
  const uri = row.document_uri?.trim() ?? "";
  if (uri.length === 0) return "—";
  try {
    const parsed = new URL(uri);
    return `${parsed.pathname}${parsed.hash}`;
  } catch {
    return uri;
  }
}

/** Origem (arquivo) do recurso bloqueado, sem a URL completa. */
export function cspSource(row: CspReport): string {
  const file = row.source_file?.trim() ?? "";
  if (file.length === 0) return cspResource(row);
  return row.line_number ? `${file}:${row.line_number}` : file;
}

const cspTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatCspTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";
  return cspTimeFormat.format(parsed);
}

export interface CspCounter {
  label: string;
  count: number;
}

export interface CspSummary {
  rows: CspReport[];
  total: number;
  /** Relatos que o navegador só avisou (política em Report-Only). */
  reportedOnly: number;
  /** Relatos em que a política já bloqueou de fato. */
  enforced: number;
  directives: CspCounter[];
  resources: CspCounter[];
  lastReportAt: string | null;
}

/** Conta reincidências mantendo a ordem do que aparece mais. */
function countBy(rows: CspReport[], pick: (row: CspReport) => string): CspCounter[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function summarizeCspReports(rows: CspReport[]): CspSummary {
  const ordered = [...rows].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const lastReport = ordered.find((row) => !Number.isNaN(Date.parse(row.created_at)));

  return {
    rows: ordered,
    total: ordered.length,
    reportedOnly: ordered.filter((row) => row.disposition?.trim() === "report").length,
    enforced: ordered.filter((row) => row.disposition?.trim() === "enforce").length,
    directives: countBy(ordered, (row) => cspDirectiveLabel(cspDirective(row))),
    resources: countBy(ordered, cspResource),
    lastReportAt: lastReport?.created_at ?? null,
  };
}

export function useCspViolationReports(limit = 100) {
  return useQuery<CspSummary>({
    queryKey: ["csp-violation-reports", limit],
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csp_violation_reports")
        .select(CSP_SELECT)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      const parsed = z.array(cspReportSchema).safeParse(data ?? []);
      if (!parsed.success) return summarizeCspReports([]);

      return summarizeCspReports(parsed.data);
    },
  });
}