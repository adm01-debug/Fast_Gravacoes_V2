import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bell, BellOff, Calendar, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { useDailySummaryNotifications } from '@/features/notifications/hooks/useDailySummaryNotifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export function DailySummaryCard() {
  const {
    lastSummary,
    isLoading,
    manualRefresh,
    requestPermission,
    permission,
  } = useDailySummaryNotifications();

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Resumo Diário
          </CardTitle>
          <div className="flex gap-1">
            {permission !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableNotifications}
                className="gap-1 h-7 text-xs"
              >
                <Bell className="h-3 w-3" />
                Ativar alertas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={manualRefresh}
              disabled={isLoading}
              className="h-7 w-7"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1">
        {isLoading && !lastSummary ? (
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
        ) : lastSummary ? (
          <div className="space-y-3">
            {/* Compact grid for both sections */}
            <div className="grid grid-cols-5 gap-2">
              {/* Maintenance mini stats */}
              <div className="flex flex-col items-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="text-lg font-bold text-destructive">
                  {lastSummary.maintenance.overdue.count}
                </span>
                <span className="text-[10px] text-muted-foreground">Atras.</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-warning/10 border border-warning/20">
                <span className="text-lg font-bold text-warning">
                  {lastSummary.maintenance.due_today.count}
                </span>
                <span className="text-[10px] text-muted-foreground">Hoje</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-lg font-bold text-primary">
                  {lastSummary.maintenance.upcoming_7_days.count}
                </span>
                <span className="text-[10px] text-muted-foreground">7 dias</span>
              </div>
              {/* ML predictions */}
              <div className="flex flex-col items-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="text-lg font-bold text-destructive">
                  {lastSummary.predictions.critical.count}
                </span>
                <span className="text-[10px] text-muted-foreground">Crítico</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-lg font-bold text-orange-500">
                  {lastSummary.predictions.high_risk.count}
                </span>
                <span className="text-[10px] text-muted-foreground">Risco</span>
              </div>
            </div>

            {/* Compact Status */}
            <div className="flex items-center justify-between text-xs">
              {lastSummary.alerts.has_critical ? (
                <Badge variant="destructive" className="gap-1 text-[10px] h-5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Atenção
                </Badge>
              ) : lastSummary.alerts.total_attention_items > 0 ? (
                <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning border-warning/30 text-[10px] h-5">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {lastSummary.alerts.total_attention_items} pendentes
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30 text-[10px] h-5">
                  <CheckCircle className="h-2.5 w-2.5" />
                  OK
                </Badge>
              )}
              <span className="text-muted-foreground">
                {format(new Date(lastSummary.generated_at), 'HH:mm')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-3 text-center text-muted-foreground">
            {permission !== 'granted' ? (
              <p className="text-xs flex items-center gap-1">
                <BellOff className="h-3 w-3" />
                Ative notificações para resumo às 8h
              </p>
            ) : (
              <p className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Clique atualizar
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
