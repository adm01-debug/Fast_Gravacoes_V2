import { useOperatorGoals, calculateGoalProgress, GOAL_TYPE_LABELS } from '@/features/production';
import { useAuth } from '@/features/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useOperatorProductivity } from '@/features/production';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function OperatorGoalsWidget() {
  const { user, isOperator } = useAuth();
  const navigate = useNavigate();
  const { activeGoals, isLoading: loadingGoals } = useOperatorGoals();
  const { operators, isLoading: loadingProd } = useOperatorProductivity('all');

  const myGoals = activeGoals.filter(g => g.operator_id === user?.id);
  const myProductivity = operators?.find(o => o.operatorId === user?.id);

  if (!isOperator || myGoals.length === 0) return null;

  if (loadingGoals || loadingProd) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const goalsWithProgress = myGoals.map(goal => {
    let currentVal = 0;
    if (myProductivity) {
      switch (goal.goal_type) {
        case 'efficiency': currentVal = myProductivity.efficiencyScore; break;
        case 'jobs_completed': currentVal = myProductivity.totalJobsCompleted; break;
        case 'pieces_produced': currentVal = myProductivity.totalPiecesProduced; break;
        case 'loss_rate': currentVal = myProductivity.lossRate; break;
      }
    }
    return calculateGoalProgress(goal, currentVal);
  });

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.3s]">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm text-title flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="gradient-text">Minhas Metas</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] uppercase font-bold"
            onClick={() => navigate('/operator-productivity')}
          >
            Detalhes <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {goalsWithProgress.map(goal => (
          <div key={goal.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {goal.is_achieved ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : goal.progress_percentage < 50 ? (
                  <AlertCircle className="h-3 w-3 text-warning" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-primary" />
                )}
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                  {GOAL_TYPE_LABELS[goal.goal_type]}
                </span>
              </div>
              <span className="text-[11px] font-bold font-mono text-foreground">
                {goal.current_value.toFixed(0)} / {goal.target_value.toFixed(0)}
                {goal.goal_type === 'efficiency' || goal.goal_type === 'loss_rate' ? '%' : ''}
              </span>
            </div>
            <div className="relative pt-1">
              <Progress
                value={goal.progress_percentage}
                className="h-1.5 bg-muted"
              />
              <div
                className={cn(
                  "h-1.5 rounded-full absolute top-1 left-0 transition-all duration-500",
                  goal.is_achieved ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" : goal.progress_percentage < 50 ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                )}
                style={{ width: `${goal.progress_percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

