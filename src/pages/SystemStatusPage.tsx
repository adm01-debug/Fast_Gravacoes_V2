import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity as ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deriveCronStatus,
  deriveEdgeStatus,
  deriveOverallStatus,
  useSystemStatusSummary,
  type OverallStatus,
} from "@/features/admin/hooks/useSystemStatusSummary";

const STATUS_LABEL: Record<OverallStatus, string> = {
  operational: "Todos os sistemas operacionais",
  degraded: "Operação parcialmente degradada",
  outage: "Falha ativa em rotina automática",
  unknown: "Sem coletas recentes",
};

const SHORT_LABEL: Record<OverallStatus, string> = {
  operational: "Operacional",
  degraded: "Degradado",
  outage: "Com falha",
  unknown: "Sem dados",
};

const STATUS_CLASS: Record<OverallStatus, string> = {
  operational: "bg-success/10 text-success border-success/30",
  degraded: "bg-warning/10 text-warning border-warning/30",
  outage: "bg-destructive/10 text-destructive border-destructive/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

function DomainRow({ label, status }: { label: string; status: OverallStatus }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm">{label}</span>
      <Badge variant="outline" className={cn("text-xs", STATUS_CLASS[status])}>
        {SHORT_LABEL[status]}
      </Badge>
    </div>
  );
}


function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Painel de status interno consolidado — acessível a qualquer usuário com
 * papel ativo. Mostra apenas agregados; detalhes ficam em /admin/monitoring.
 */
export default function SystemStatusPage() {
  const { data, isLoading, error } = useSystemStatusSummary();
  const summary = data ?? null;
  const status = deriveOverallStatus(summary);
  const cronStatus = deriveCronStatus(summary);
  const edgeStatus = deriveEdgeStatus(summary);

  return (
    <main className="container mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" /> Status do sistema
        </h1>
        <p className="text-sm text-muted-foreground">
          Saúde consolidada das rotinas automáticas e das funções de servidor nas últimas 24 horas.
        </p>
      </header>

      {isLoading && <Skeleton className="h-32 w-full" />}

      {error && (
        <p className="text-sm text-muted-foreground">
          Não foi possível consultar o status agora. Tente novamente em instantes.
        </p>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline" className={cn("text-sm", STATUS_CLASS[status])}>
              {STATUS_LABEL[status]}
            </Badge>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DomainRow label="Rotinas automáticas" status={cronStatus} />
              <DomainRow label="Funções de servidor" status={edgeStatus} />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Rotinas monitoradas" value={data?.total_jobs ?? 0} />
              <Metric label="Saudáveis" value={data?.healthy_jobs ?? 0} />
              <Metric label="Falhando" value={data?.failing_jobs ?? 0} />
              <Metric label="Silenciosas" value={data?.stale_jobs ?? 0} />
            </div>

            <p className="text-xs text-muted-foreground">
              Última coleta das rotinas:{" "}
              {data?.last_capture
                ? new Date(data.last_capture).toLocaleString("pt-BR")
                : "sem registro nas últimas 24h"}
              {" · "}
              Última verificação das funções:{" "}
              {data?.edge_last_check
                ? new Date(data.edge_last_check).toLocaleString("pt-BR")
                : "sem registro"}
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
