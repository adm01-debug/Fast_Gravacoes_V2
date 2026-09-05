import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlarmClockOff as AlarmClockOffIcon, Timer as TimerIcon } from "lucide-react";
import { format } from "date-fns";
import {
  useCronHealth,
  isCronCritical,
  CRON_FAILURE_ALERT_THRESHOLD,
  type CronHealthRow,
} from "@/features/admin/hooks/useCronHealth";

function StatusBadge({ row }: { row: CronHealthRow }) {
  if (isCronCritical(row)) {
    return <Badge variant="destructive">{row.consecutive_failures} falhas seguidas</Badge>;
  }
  if ((row.consecutive_failures ?? 0) > 0) {
    return <Badge variant="secondary">{row.consecutive_failures} falha(s)</Badge>;
  }
  if (row.active === false) return <Badge variant="outline">inativo</Badge>;
  return <Badge variant="outline">ok</Badge>;
}

export function CronHealthCard() {
  const { data, isLoading, error } = useCronHealth();

  const rows = data ?? [];
  const critical = rows.filter(isCronCritical);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TimerIcon className="h-4 w-4" /> Rotinas automáticas (cron)
        </CardTitle>
        {critical.length > 0 && (
          <Badge variant="destructive">{critical.length} crítica(s)</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}

        {error && (
          <p className="text-sm text-muted-foreground">
            Não foi possível ler a saúde das rotinas (acesso restrito a coordenadores e gestores).
          </p>
        )}

        {!isLoading && !error && critical.length > 0 && (
          <Alert variant="destructive">
            <AlarmClockOffIcon className="h-4 w-4" />
            <AlertTitle>Rotina automática falhando</AlertTitle>
            <AlertDescription>
              {critical.map((c) => c.jobname ?? `job ${c.jobid}`).join(", ")} — falhou{" "}
              {CRON_FAILURE_ALERT_THRESHOLD}+ ciclos consecutivos. Verifique os segredos e o
              endpoint da função.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma rotina agendada encontrada.</p>
        )}

        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.jobid}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.jobname ?? `job ${row.jobid}`}</p>
                <p className="text-xs text-muted-foreground">
                  {row.schedule ?? "—"}
                  {row.last_run
                    ? ` · última: ${format(new Date(row.last_run), "dd/MM HH:mm")}`
                    : " · nunca executada"}
                  {row.last_duration_ms != null ? ` · ${row.last_duration_ms}ms` : ""}
                </p>
                {row.last_error && (
                  <p className="text-xs text-destructive truncate">{row.last_error}</p>
                )}
              </div>
              <StatusBadge row={row} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
