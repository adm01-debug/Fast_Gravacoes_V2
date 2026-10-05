import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoalAlerts, GoalAlert } from '@/features/notifications';
import { GOAL_TYPE_LABELS, GoalType } from '@/features/production';
import {
  AlertTriangle,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  Bell,
  Gauge,
  CheckCircle2,
  Package,
  RefreshCw
} from 'lucide-react';

const GoalTypeIcon = ({ type }: { type: GoalType }) => {
  switch (type) {
    case 'efficiency': return <Gauge className="h-4 w-4" />;
    case 'jobs_completed': return <CheckCircle2 className="h-4 w-4" />;
    case 'pieces_produced': return <Package className="h-4 w-4" />;
    case 'loss_rate': return <AlertTriangle className="h-4 w-4" />;
    default: return <Target className="h-4 w-4" />;
  }
};

function AlertItem({ alert }: { alert: GoalAlert }) {
  const formatValue = (value: number, type: GoalType) => {
    if (type === 'efficiency' || type === 'loss_rate') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  return (
    <div className={`p-3 rounded-lg border ${
      alert.riskLevel === 'critical'
        ? 'bg-destructive/10 border-destructive/30'
        : 'bg-warning/10 border-warning/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${
          alert.riskLevel === 'critical'
            ? 'bg-destructive/20 text-destructive'
            : 'bg-warning/20 text-warning'
        }`}>
          <GoalTypeIcon type={alert.goalType} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium truncate">{alert.operatorName}</span>
            <Badge
              variant={alert.riskLevel === 'critical' ? 'destructive' : 'outline'}
              className={alert.riskLevel === 'warning' ? 'border-warning text-warning' : ''}
            >
              {alert.riskLevel === 'critical' ? 'Crítico' : 'Alerta'}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {GOAL_TYPE_LABELS[alert.goalType]}
          </p>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Progresso</span>
              <span className="font-medium">{alert.progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress
              value={alert.progressPercentage}
              className={`h-1.5 ${
                alert.riskLevel === 'critical' ? 'bg-destructive/20' : 'bg-warning/20'
              }`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Atual: <span className="font-medium">{formatValue(alert.currentValue, alert.goalType)}</span>
              </span>
              <span>
                Meta: <span className="font-medium">{formatValue(alert.targetValue, alert.goalType)}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {alert.daysRemaining === 0
                ? 'Prazo esgotado!'
                : `${alert.daysRemaining} dia(s) restante(s)`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GoalAlertsWidgetProps {
  maxVisible?: number;
  compact?: boolean;
}

export function GoalAlertsWidget({ maxVisible = 5, compact = false }: GoalAlertsWidgetProps) {
  const { goalAlerts, criticalCount, warningCount, isLoading, forceCheckGoals } = useGoalAlerts();
  const [expanded, setExpanded] = useState(false);

  const visibleAlerts = expanded ? goalAlerts : goalAlerts.slice(0, maxVisible);
  const hasMore = goalAlerts.length > maxVisible;

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-8 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (goalAlerts.length === 0) {
    return (
      <Card className="card-elevated bg-success/5 border-success/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-full">
              <Target className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-success">Todas as metas no caminho certo</p>
              <p className="text-sm text-muted-foreground">
                Nenhum operador com metas em risco
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={forceCheckGoals} aria-label="Verificar metas agora">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">
              {criticalCount > 0 && <span className="text-destructive">{criticalCount} crítico(s)</span>}
              {criticalCount > 0 && warningCount > 0 && ' · '}
              {warningCount > 0 && <span className="text-warning">{warningCount} alerta(s)</span>}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Metas em Risco</p>
          <ul className="text-xs space-y-1">
            {goalAlerts.slice(0, 3).map(alert => (
              <li key={alert.goalId}>
                • {alert.operatorName}: {GOAL_TYPE_LABELS[alert.goalType]} ({alert.progressPercentage.toFixed(0)}%)
              </li>
            ))}
            {goalAlerts.length > 3 && <li>• +{goalAlerts.length - 3} mais...</li>}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Card className={`card-elevated ${
      criticalCount > 0 ? 'border-destructive/30' : 'border-warning/30'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5" />
              Alertas de Metas
            </CardTitle>
            <CardDescription>
              {criticalCount > 0 && (
                <span className="text-destructive font-medium">{criticalCount} crítico(s)</span>
              )}
              {criticalCount > 0 && warningCount > 0 && ' · '}
              {warningCount > 0 && (
                <span className="text-warning font-medium">{warningCount} alerta(s)</span>
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={forceCheckGoals} aria-label="Verificar metas agora">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className={expanded && goalAlerts.length > 5 ? 'h-[400px]' : ''}>
          <div className="space-y-2">
            {visibleAlerts.map(alert => (
              <AlertItem key={alert.goalId} alert={alert} />
            ))}
          </div>
        </ScrollArea>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver mais {goalAlerts.length - maxVisible} alerta(s)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
