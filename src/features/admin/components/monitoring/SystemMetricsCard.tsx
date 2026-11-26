import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity as ActivityIcon } from "lucide-react";
import { format } from "date-fns";
import {
  useSystemMetrics,
  estaDesatualizada,
  formatarContagem,
  lerContagem,
  ultimoSnapshot,
  METRICS_STALE_AFTER_MINUTES,
  type SystemMetricsSnapshot,
} from "@/features/admin/hooks/useSystemMetrics";

interface Indicador {
  rotulo: string;
  valor: number | null;
}

function indicadores(snapshot: SystemMetricsSnapshot): Indicador[] {
  const { metrics } = snapshot;
  return [
    { rotulo: "OS em produção", valor: lerContagem(metrics, "jobs", "active") },
    { rotulo: "Total de OS", valor: lerContagem(metrics, "jobs", "total") },
    { rotulo: "OS concluídas hoje", valor: lerContagem(metrics, "jobs", "completedToday") },
    { rotulo: "Máquinas rodando", valor: lerContagem(metrics, "machines", "running") },
    { rotulo: "Máquinas ativas", valor: lerContagem(metrics, "machines", "total") },
    { rotulo: "Operadores ativos hoje", valor: lerContagem(metrics, "operators", "active") },
    { rotulo: "Total de operadores", valor: lerContagem(metrics, "operators", "total") },
  ];
}

function tempoDesde(iso: string): string {
  const minutos = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (minutos < 60) return `${minutos} min atrás`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h atrás`;
  return `${Math.floor(horas / 24)}d atrás`;
}

function DetalheIndicador({ item }: { item: Indicador }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{item.rotulo}</p>
      <p
        className="text-lg font-semibold"
        aria-label={`${item.rotulo}: ${item.valor === null ? "sem dado" : formatarContagem(item.valor)}`}
      >
        {formatarContagem(item.valor)}
      </p>
    </div>
  );
}

/**
 * Telemetria do `metrics-collector` (pg_cron, 5 min). Sem esta tela o coletor
 * escrevia em `system_metrics` sem nenhum leitor no sistema.
 */
export function SystemMetricsCard() {
  const { data, isLoading, error } = useSystemMetrics();
  const snapshot = ultimoSnapshot(data ?? []);
  const desatualizado = estaDesatualizada(snapshot?.collected_at);

  return (
    <Card data-testid="system-metrics-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="h-4 w-4" /> Métricas do sistema
        </CardTitle>
        {snapshot && desatualizado ? (
          <Badge variant="destructive">coleta parada</Badge>
        ) : (
          snapshot && <Badge variant="outline">atualizado {tempoDesde(snapshot.collected_at)}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}

        {!isLoading && error && (
          <p className="text-sm text-muted-foreground">
            Não foi possível ler as métricas do sistema. A leitura é restrita a gestores e admins.
          </p>
        )}

        {!isLoading && !error && !snapshot && (
          <Alert>
            <AlertTitle>Nenhuma coleta registrada</AlertTitle>
            <AlertDescription>
              O coletor (`metrics-collector`) ainda não gravou nenhum snapshot em
              {" "}
              <code>system_metrics</code>. Verifique se o agendamento do pg_cron está ativo.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && snapshot && (
          <>
            {desatualizado && (
              <Alert variant="destructive">
                <AlertTitle>Coleta de métricas parada</AlertTitle>
                <AlertDescription>
                  Último snapshot {tempoDesde(snapshot.collected_at)} (limite esperado:{" "}
                  {METRICS_STALE_AFTER_MINUTES} min). Os números abaixo são a última leitura
                  conhecida.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {indicadores(snapshot).map((item) => (
                <DetalheIndicador key={item.rotulo} item={item} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Coletado em {format(new Date(snapshot.collected_at), "dd/MM/yyyy HH:mm")} ·{" "}
              {(data ?? []).length} snapshot(s) carregado(s). Um traço (—) significa que a contagem
              falhou naquela execução, não que o valor seja zero.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}