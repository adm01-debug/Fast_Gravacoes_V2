import { Wrench, AlertTriangle, Clock, CheckCircle, BrainCircuit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MaintenanceAlert } from '@/features/maintenance/hooks/useTPM';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TPMAlertsPanelProps {
  alerts: MaintenanceAlert[];
  onResolve: (alertId: string) => void;
  onStartMaintenance: (scheduleId: string) => void;
}

const alertTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  critical: { icon: AlertTriangle, color: 'text-primary bg-primary/10', label: 'Crítico' },
  overdue: { icon: Clock, color: 'text-warning bg-warning/10', label: 'Atrasado' },
  due: { icon: Wrench, color: 'text-blue-500 bg-blue-500/10', label: 'Vence Hoje' },
  upcoming: { icon: Clock, color: 'text-success bg-success/10', label: 'Próximo' },
  predictive: { icon: BrainCircuit, color: 'text-accent-purple bg-accent-purple/10', label: 'IA Preditiva' },
};

export function TPMAlertsPanel({ alerts, onResolve, onStartMaintenance }: TPMAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card className="card-glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-title">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Alertas de Manutenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-3 text-success" />
            <p className="font-medium">Nenhum alerta pendente</p>
            <p className="text-sm">Todas as manutenções estão em dia</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-title">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Alertas de Manutenção
          <Badge variant="destructive" className="ml-2">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {alerts.map((alert) => {
          const config = alertTypeConfig[alert.alert_type] || alertTypeConfig.upcoming;
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border border-border/50 ${
                alert.alert_type === 'critical' ? 'bg-primary/5 border-primary/30' : 'bg-card/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={alert.alert_type === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.machine && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Máquina: {alert.machine.name} ({alert.machine.code})
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 ml-11">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onStartMaintenance(alert.schedule_id)}
                >
                  <Wrench className="h-3 w-3 mr-1" />
                  Iniciar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(alert.id)}
                >
                  Dispensar
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
