import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface BottlenecksTabProps {
  alerts: Array<{
    id: string;
    techniqueName: string;
    severity: string;
    message: string;
    occupancyRate?: number;
    affectedJobs?: number;
  }>;
  capacityByDate: Array<{
    date: string | Date;
    occupancyRate?: number;
  }>;
}

export function BottlenecksTab({ alerts, capacityByDate }: BottlenecksTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {alerts.map((alert) => (
        <Card key={alert.id} className={`glass-card border-border/50 ${
          alert.severity === 'critical' ? 'border-destructive/50' :
          alert.severity === 'warning' ? 'border-warning/50' : ''
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{alert.techniqueName}</CardTitle>
              <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'outline'}>
                {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Atenção' : 'Info'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{alert.message}</p>
            {alert.occupancyRate != null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Ocupação</span><span className="font-medium">{Math.round(alert.occupancyRate)}%</span>
                </div>
                <Progress value={alert.occupancyRate} className="h-2" />
              </div>
            )}
            {alert.affectedJobs != null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /><span>{alert.affectedJobs} jobs afetados</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {alerts.length === 0 && (
        <Card className="glass-card border-border/50 col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mb-4" />
            <h3 className="font-semibold text-foreground">Sem Gargalos</h3>
            <p className="text-sm text-muted-foreground mt-1">Todas as técnicas operam dentro da capacidade</p>
          </CardContent>
        </Card>
      )}

      {capacityByDate.length > 0 && (
        <Card className="glass-card border-border/50 col-span-full">
          <CardHeader>
            <CardTitle className="text-lg">Projeção de Capacidade</CardTitle>
            <CardDescription>Próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {capacityByDate.slice(0, 7).map((entry, idx) => {
                const rate = entry.occupancyRate ?? 0;
                const dateStr = entry.date instanceof Date ? entry.date.toISOString() : String(entry.date);
                return (
                  <div key={idx} className="text-center space-y-2 p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-medium">{format(new Date(dateStr), 'dd/MM')}</p>
                    <Progress value={rate} className="h-2" />
                    <p className={`text-sm font-bold ${rate > 90 ? 'text-destructive' : rate > 70 ? 'text-warning' : 'text-success'}`}>{Math.round(rate)}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
