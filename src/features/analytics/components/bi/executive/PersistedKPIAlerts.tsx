import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BellRing, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useKPIAlerts } from '@/features/analytics/hooks/useKPIAlerts';

/**
 * Lista os alertas de limiar persistidos por `public.check_and_notify_kpi_alert`.
 * Sem esta superficie a tabela `kpi_alerts` acumulava alertas que ninguem via
 * nem conseguia encerrar.
 */
const PersistedKPIAlertsComponent = () => {
  const { alertas, total, isLoading, error, resolveAlert } = useKPIAlerts();

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Alertas do motor de KPI
          {total > 0 && (
            <Badge variant="destructive" className="ml-1">{total} aberto(s)</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Limites de metrica cruzados pelo monitoramento automatico. Resolver um alerta o remove da fila.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {!isLoading && error && (
          <p className="text-sm text-destructive">
            Não foi possível carregar os alertas: {error.message}
          </p>
        )}

        {!isLoading && !error && alertas.length === 0 && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            Nenhum alerta aberto.
          </p>
        )}

        {alertas.map((alerta) => {
          const critico = (alerta.severity ?? '') === 'critical';
          return (
            <div
              key={alerta.id}
              className={cn(
                'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
                critico ? 'bg-red-500/10 border-red-500/20' : 'bg-warning/10 border-warning/20',
              )}
            >
              <div className="min-w-0">
                <p className="font-bold text-sm flex items-center gap-2">
                  <AlertTriangle className={cn('h-4 w-4', critico ? 'text-red-500' : 'text-warning')} />
                  {alerta.metric_name}
                  <Badge variant='outline' className="text-[10px] uppercase">
                    {alerta.severity ?? 'aviso'}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Valor {alerta.metric_value} · limite {alerta.threshold}
                  {alerta.created_at
                    ? ' · ' + format(new Date(alerta.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={resolveAlert.isPending}
                onClick={() => resolveAlert.mutate(alerta.id)}
              >
                Resolver
              </Button>
            </div>
          );
        })}

        {total > alertas.length && (
          <p className="text-xs text-muted-foreground">
            Mostrando os {alertas.length} mais recentes de {total} alertas abertos.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const PersistedKPIAlerts = memo(PersistedKPIAlertsComponent);
