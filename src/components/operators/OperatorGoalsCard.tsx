import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  OperatorGoal,
  GoalWithProgress,
  calculateGoalProgress,
  GOAL_TYPE_LABELS
} from '@/features/production';
import { OperatorProductivityMetrics } from '@/features/production';
import { Target, Trophy, TrendingUp, TrendingDown, Minus, CheckCircle2, Package, AlertTriangle, Gauge } from 'lucide-react';

interface OperatorGoalsCardProps {
  goals: OperatorGoal[];
  metrics: OperatorProductivityMetrics;
  compact?: boolean;
}

const GoalTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'efficiency': return <Gauge className="h-4 w-4" />;
    case 'jobs_completed': return <CheckCircle2 className="h-4 w-4" />;
    case 'pieces_produced': return <Package className="h-4 w-4" />;
    case 'loss_rate': return <AlertTriangle className="h-4 w-4" />;
    default: return <Target className="h-4 w-4" />;
  }
};

function GoalProgressItem({ goal, compact }: { goal: GoalWithProgress; compact?: boolean }) {

  const getProgressTextColor = () => {
    if (goal.is_achieved) return 'text-success';
    if (goal.progress_percentage >= 75) return 'text-success';
    if (goal.progress_percentage >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'efficiency' || type === 'loss_rate') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <GoalTypeIcon type={goal.goal_type} />
            <div className="flex-1 min-w-0">
              <Progress
                value={goal.progress_percentage}
                className={`h-2 ${goal.is_achieved ? 'bg-success/20' : ''}`}
              />
            </div>
            {goal.is_achieved && <Trophy className="h-4 w-4 text-warning" />}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{GOAL_TYPE_LABELS[goal.goal_type]}</p>
            <p>Meta: {formatValue(goal.target_value, goal.goal_type)}</p>
            <p>Atual: {formatValue(goal.current_value, goal.goal_type)}</p>
            <p>Progresso: {goal.progress_percentage}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GoalTypeIcon type={goal.goal_type} />
          <span className="text-sm font-medium">{GOAL_TYPE_LABELS[goal.goal_type]}</span>
        </div>
        {goal.is_achieved ? (
          <Badge variant="default" className="bg-success text-success-foreground">
            <Trophy className="h-3 w-3 mr-1" />
            Atingida!
          </Badge>
        ) : (
          <Badge variant="outline" className={getProgressTextColor()}>
            {goal.progress_percentage}%
          </Badge>
        )}
      </div>

      <Progress
        value={goal.progress_percentage}
        className={`h-2 ${goal.is_achieved ? 'bg-success/20' : ''}`}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Atual: <span className={`font-medium ${getProgressTextColor()}`}>
            {formatValue(goal.current_value, goal.goal_type)}
          </span>
        </span>
        <span>
          Meta: <span className="font-medium">{formatValue(goal.target_value, goal.goal_type)}</span>
        </span>
      </div>
    </div>
  );
}

export function OperatorGoalsCard({ goals, metrics, compact }: OperatorGoalsCardProps) {
  const goalsWithProgress = useMemo((): GoalWithProgress[] => {
    return goals.map(goal => {
      let currentValue: number;

      switch (goal.goal_type) {
        case 'efficiency':
          currentValue = metrics.efficiencyScore;
          break;
        case 'jobs_completed':
          currentValue = metrics.totalJobsCompleted;
          break;
        case 'pieces_produced':
          currentValue = metrics.totalPiecesProduced;
          break;
        case 'loss_rate':
          currentValue = metrics.lossRate;
          break;
        default:
          currentValue = 0;
      }

      return calculateGoalProgress(goal, currentValue);
    });
  }, [goals, metrics]);

  const achievedCount = goalsWithProgress.filter(g => g.is_achieved).length;
  const totalCount = goalsWithProgress.length;

  if (totalCount === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Target className="h-3 w-3" />
          <span>Metas: {achievedCount}/{totalCount}</span>
        </div>
        <div className="space-y-1">
          {goalsWithProgress.map(goal => (
            <GoalProgressItem key={goal.id} goal={goal} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas do Período
          </div>
          <Badge variant={achievedCount === totalCount ? 'default' : 'secondary'}>
            {achievedCount}/{totalCount} atingidas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goalsWithProgress.map(goal => (
          <GoalProgressItem key={goal.id} goal={goal} />
        ))}
      </CardContent>
    </Card>
  );
}

// Summary component for dashboard
interface GoalsSummaryProps {
  allGoals: OperatorGoal[];
  allMetrics: OperatorProductivityMetrics[];
}

export function GoalsSummary({ allGoals, allMetrics }: GoalsSummaryProps) {
  const summary = useMemo(() => {
    let achieved = 0;
    let total = 0;
    let totalProgress = 0;

    allGoals.forEach(goal => {
      const operatorMetrics = allMetrics.find(m => m.operatorId === goal.operator_id);
      if (!operatorMetrics) return;

      let currentValue: number;
      switch (goal.goal_type) {
        case 'efficiency': currentValue = operatorMetrics.efficiencyScore; break;
        case 'jobs_completed': currentValue = operatorMetrics.totalJobsCompleted; break;
        case 'pieces_produced': currentValue = operatorMetrics.totalPiecesProduced; break;
        case 'loss_rate': currentValue = operatorMetrics.lossRate; break;
        default: currentValue = 0;
      }

      const progress = calculateGoalProgress(goal, currentValue);
      total++;
      totalProgress += progress.progress_percentage;
      if (progress.is_achieved) achieved++;
    });

    return {
      achieved,
      total,
      averageProgress: total > 0 ? Math.round(totalProgress / total) : 0,
      achievementRate: total > 0 ? Math.round((achieved / total) * 100) : 0,
    };
  }, [allGoals, allMetrics]);

  if (summary.total === 0) {
    return null;
  }

  return (
    <Card className="card-elevated bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Metas Ativas</p>
            <div className="flex items-center gap-4">
              <p className="text-2xl font-bold">
                {summary.achieved}/{summary.total}
              </p>
              <div className="flex items-center gap-1 text-sm">
                {summary.averageProgress >= 70 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : summary.averageProgress >= 40 ? (
                  <Minus className="h-4 w-4 text-warning" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="text-muted-foreground">
                  {summary.averageProgress}% progresso médio
                </span>
              </div>
            </div>
          </div>
          <Badge
            variant={summary.achievementRate >= 70 ? 'default' : 'secondary'}
            className={summary.achievementRate >= 70 ? 'bg-success' : ''}
          >
            {summary.achievementRate}% taxa de sucesso
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
