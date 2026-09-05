import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { EfficiencyAlertHistory } from '@/features/analytics';

interface HistoryTabProps {
  resolvedAlerts: EfficiencyAlertHistory[];
  isLoading: boolean;
}

export function HistoryTab({ resolvedAlerts, isLoading }: HistoryTabProps) {
  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5" />Alertas Resolvidos</CardTitle>
        <CardDescription>Histórico de alertas de eficiência resolvidos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resolvedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mb-4" />
            <h3 className="font-semibold text-foreground">Sem Histórico</h3>
            <p className="text-sm text-muted-foreground mt-1">Nenhum alerta resolvido ainda</p>
          </div>
        ) : (
          resolvedAlerts.map((alert) => (
            <div key={alert.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{alert.title}</h4>
                <Badge variant="secondary" className="text-xs">
                  {alert.severity === 'error' ? 'Crítico' : alert.severity === 'warning' ? 'Atenção' : 'Info'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{alert.description}</p>
              {alert.resolution_notes && (
                <div className="p-2 bg-success/10 rounded text-xs">
                  <span className="font-medium text-success">Resolução:</span> {alert.resolution_notes}
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Detectado: {format(new Date(alert.detected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                {alert.resolved_at && <span>Resolvido: {format(new Date(alert.resolved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
