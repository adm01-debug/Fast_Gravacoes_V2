import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ShieldCheck, ArrowDownRight, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PredictiveAlertsProps {
  alerts: {
    machineId: string;
    machineName: string;
    type: 'performance' | 'quality' | 'availability' | string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    trend: number;
  }[];
}

export const PredictiveAlerts = memo(function PredictiveAlerts({ alerts }: PredictiveAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <Card className="border-success/20 bg-success/5 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 text-success">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Saúde da Planta: Excelente</h3>
              <p className="text-xs opacity-80">Nenhuma tendência negativa detectada nos últimos 7 dias. Operação estável.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2 px-1 text-muted-foreground uppercase tracking-wider">
        <Wrench className="h-4 w-4 text-primary" />
        Inteligência Preditiva
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, idx) => (
          <Alert 
            key={`${alert.machineId}-${idx}`} 
            variant={alert.severity === 'high' ? 'destructive' : 'default'}
            className={alert.severity === 'medium' ? 'border-indicator-warning/50 bg-indicator-warning/5' : ''}
          >
            <AlertTriangle className="h-4 w-4" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <AlertTitle className="text-sm font-bold">
                  {alert.machineName}
                </AlertTitle>
                <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="text-[10px] h-5">
                   <ArrowDownRight className="h-3 w-3 mr-1" />
                   {Math.abs(alert.trend).toFixed(1)}%
                </Badge>
              </div>
              <AlertDescription className="text-xs">
                {alert.message}
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-primary/20 hover:bg-primary/10">
                    Agendar Manutenção
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px]">
                    Ignorar
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
});