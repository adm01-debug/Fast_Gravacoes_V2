import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity as ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toEdgeStatus,
  useEdgeHealthHistory,
  type EdgeCheckStatus,
} from "@/features/admin/hooks/useEdgeHealthHistory";

const STATUS_LABEL: Record<EdgeCheckStatus, string> = {
  pass: "Operacional",
  warn: "Atenção",
  fail: "Falha",
};

const STATUS_CLASS: Record<EdgeCheckStatus, string> = {
  pass: "bg-success/10 text-success border-success/30",
  warn: "bg-warning/10 text-warning border-warning/30",
  fail: "bg-destructive/10 text-destructive border-destructive/30",
};

const BAR_CLASS: Record<EdgeCheckStatus, string> = {
  pass: "bg-success/60",
  warn: "bg-warning",
  fail: "bg-destructive",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Detalhe da última coleta do `health-monitor`: uma linha por domínio checado
 * (autenticação, armazenamento, banco, segredos e fila) e a proporção de
 * coletas sem falha na janela carregada.
 */
export function EdgeHealthCard() {
  const { data, isLoading, error } = useEdgeHealthHistory();
  const latest = data?.latest ?? null;
  const rows = data?.rows ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ActivityIcon className="h-4 w-4" /> Saúde das funções de servidor
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {latest
              ? "Última checagem em " +
                when(latest.captured_at) +
                (latest.latency_ms === null || latest.latency_ms === undefined
                  ? ""
                  : " · " + latest.latency_ms + " ms")
              : "Checagem automática a cada 5 minutos"}
          </p>
        </div>
        {data?.latestStatus && (
          <Badge variant="outline" className={cn("text-xs", STATUS_CLASS[data.latestStatus])}>
            {STATUS_LABEL[data.latestStatus]}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}

        {!isLoading && error && (
          <p className="text-sm text-muted-foreground">
            Não foi possível ler o histórico das funções de servidor (acesso restrito a
            coordenadores e gestores).
          </p>
        )}

        {!isLoading && !error && latest === null && (
          <p className="text-sm text-muted-foreground">
            Ainda não há coletas registradas. O health-monitor grava uma checagem a cada 5 minutos.
          </p>
        )}

        {!isLoading && !error && latest !== null && (
          <>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {(data?.checks ?? []).map((check) => (
                <li
                  key={check.key}
                  className="flex items-center justify-between gap-2 rounded-md border p-3"
                >
                  <span className="text-sm truncate">{check.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {check.observed}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", STATUS_CLASS[check.status])}>
                      {STATUS_LABEL[check.status]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>coletas analisadas: {rows.length}</span>
              <span>{data?.passRatePct ?? 0}% sem falha</span>
              <span>origem: {latest.source}</span>
              {data?.lastFailAt && (
                <span>última coleta com problema em {when(data.lastFailAt)}</span>
              )}
            </div>

            {rows.length > 1 && (
              <div className="flex items-end gap-[2px]" aria-hidden="true">
                {[...rows].reverse().map((row) => (
                  <div
                    key={row.id}
                    className={cn(
                      "h-6 w-full min-w-[3px] rounded-sm",
                      BAR_CLASS[toEdgeStatus(row.status)],
                    )}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}