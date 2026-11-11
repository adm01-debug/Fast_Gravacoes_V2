import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Cpu,
  CheckCircle2
} from "lucide-react";
import { useBottleneckPrediction, BottleneckAlert } from "@/features/analytics";


interface AlertCardProps {
  alert: BottleneckAlert;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-primary/20',
    border: 'border-primary/30',
    text: 'text-primary',
    label: 'Crítico'
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    label: 'Atenção'
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    label: 'Informativo'
  }
};

const AlertCard = memo(function AlertCard({ alert }: AlertCardProps) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg ${config.bg} border ${config.border} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon className={`h-5 w-5 ${config.text} mt-0.5`} />
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                style={{
                  backgroundColor: `${alert.techniqueColor}20`,
                  borderColor: `${alert.techniqueColor}50`,
                  color: alert.techniqueColor
                }}
              >
                {alert.techniqueName}
              </Badge>
              <Badge variant="outline" className="text-xs bg-background/50">
                <Calendar className="h-3 w-3 mr-1" />
                {alert.dateLabel}
              </Badge>
            </div>
            <p className="text-sm text-foreground mt-2">{alert.message}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          {alert.machineCount} máquinas
        </span>
        <span>{alert.jobCount} jobs agendados</span>
        {alert.pendingJobCount > 0 && (
          <span className="text-orange-400">+{alert.pendingJobCount} pendentes</span>
        )}
      </div>

      <div className="pt-2 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Recomendação:</span> {alert.recommendation}
        </p>
      </div>

      {/* Capacity bars */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Capacidade atual</span>
          <span className={config.text}>{Math.round(alert.currentCapacity)}%</span>
        </div>
        <div className="h-2 bg-background/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              alert.currentCapacity >= 90 ? 'bg-primary' :
              alert.currentCapacity >= 75 ? 'bg-primary/70' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, alert.currentCapacity)}%` }}
          />
        </div>

        {alert.projectedCapacity > alert.currentCapacity && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Projeção c/ pendentes</span>
              <span className="text-orange-400">{Math.round(alert.projectedCapacity)}%</span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500/50 transition-all"
                style={{ width: `${Math.min(100, alert.projectedCapacity)}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
});
AlertCard.displayName = 'AlertCard';

function BottleneckWidgetComponent() {
  const { alerts, criticalCount, warningCount, isLoading } = useBottleneckPrediction();

  const totalAlerts = useMemo(() => alerts.length, [alerts]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.25s] dark:hover:shadow-[0_8px_32px_-8px_hsl(45,100%,55%,0.25)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg bg-warning/20 dark:glow-warning">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            </div>
            <span className="gradient-text text-sm sm:text-base">Previsão de Gargalos</span>
          </div>
          {totalAlerts > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
              {(criticalCount ?? 0) > 0 && (
                <Badge className="bg-primary/20 text-primary border-primary/30 border text-xs">
                  {criticalCount} crít.
                </Badge>
              )}
              {(warningCount ?? 0) > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 border text-xs">
                  {warningCount} avisos
                </Badge>
              )}
            </div>
          ) : (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border text-xs self-start sm:self-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sem gargalos
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400/50" />
            <p className="text-sm">Nenhum gargalo previsto</p>
            <p className="text-xs mt-1">Capacidade adequada nos próximos 5 dias</p>
          </div>
        ) : (
          <ScrollArea className="h-[380px] pr-2">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export const BottleneckWidget = memo(BottleneckWidgetComponent);
BottleneckWidget.displayName = 'BottleneckWidget';
