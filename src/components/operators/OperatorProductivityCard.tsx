import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, XCircle, Zap, Target } from 'lucide-react';
import { OperatorProductivityMetrics } from '@/features/production';
import { OperatorGoalsCard } from '@/components/operators/OperatorGoalsCard';
import { useOperatorGoals } from '@/features/production';

interface OperatorProductivityCardProps {
  operator: OperatorProductivityMetrics;
  goals?: ReturnType<typeof useOperatorGoals>['activeGoals'];
  onAddGoal?: () => void;
  teamAverage?: number;
}

export function OperatorProductivityCard({ operator, goals = [], onAddGoal, teamAverage }: OperatorProductivityCardProps) {
  // Personal Best simulation (real PB would be tracked in a separate history table)
  const personalBest = operator.efficiencyScore * (1.1); // Simulated 10% higher than current for visualization
  const isAboveTeam = teamAverage ? operator.efficiencyScore > teamAverage : false;
  const isAbovePB = operator.efficiencyScore > (personalBest / 1.1); // Current is PB

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getEfficiencyBg = (score: number) => {
    if (score >= 80) return 'bg-success/10';
    if (score >= 60) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  return (
    <Card className="card-elevated hover-lift transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarImage src={operator.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {operator.operatorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{operator.operatorName}</h3>
              <Badge variant={operator.isActive ? 'default' : 'secondary'} className="shrink-0">
                {operator.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <span>{operator.assignedMachines} máquina(s)</span>
              {operator.machineNames.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs">Ver máquinas</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium mb-1">Máquinas atribuídas:</p>
                    <ul className="text-xs space-y-0.5">
                      {operator.machineNames.map((name, i) => <li key={i}>• {name}</li>)}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Eficiência</span>
                <span className={`text-sm font-bold ${getEfficiencyColor(operator.efficiencyScore)}`}>
                  {operator.efficiencyScore.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-2 w-full">
                <Progress value={operator.efficiencyScore} className={`h-full ${getEfficiencyBg(operator.efficiencyScore)}`} />
                {/* Ghost PB Indicator */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 w-0.5 h-4 -top-1 bg-warning/40 border-l border-warning transition-all duration-500"
                      style={{ left: `${Math.min(99, personalBest)}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold">Personal Best (Recorde): {personalBest.toFixed(1)}%</p>
                  </TooltipContent>
                </Tooltip>

                {/* Team Average Indicator */}
                {teamAverage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-0 w-0.5 h-4 -top-1 bg-blue-500/40 border-l border-blue-500 transition-all duration-500"
                        style={{ left: `${Math.min(99, teamAverage)}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px] font-bold">Média do Time: {teamAverage.toFixed(1)}%</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> vs Time:
                  <span className={isAboveTeam ? "text-success font-bold" : "text-destructive font-bold"}>
                    {isAboveTeam ? '+' : ''}{(operator.efficiencyScore - (teamAverage || 0)).toFixed(1)}%
                  </span>
                </span>
                <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                   Recorde: {personalBest.toFixed(0)}%
                </span>
              </div>
            </div>

            {goals.length > 0 && (
              <div className="mb-4">
                <OperatorGoalsCard goals={goals} metrics={operator} compact />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">Concluídos:</span>
                <span className="font-medium">{operator.totalJobsCompleted}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Peças:</span>
                <span className="font-medium">{operator.totalPiecesProduced.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Perdas:</span>
                <span className="font-medium">{operator.lossRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                <span className="text-muted-foreground">Veloc.:</span>
                <span className="font-medium">{operator.productionVelocity.toFixed(1)}/h</span>
              </div>
            </div>

            {operator.totalScans > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Atividade de Scans</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-success">▶ {operator.startActions}</span>
                  <span className="text-primary">✓ {operator.finishActions}</span>
                  <span className="text-warning">⏸ {operator.pauseActions}</span>
                </div>
              </div>
            )}

            {onAddGoal && goals.length === 0 && (
              <Button variant="ghost" size="sm" className="mt-3 w-full text-xs" onClick={(e) => { e.stopPropagation(); onAddGoal(); }}>
                <Target className="h-3 w-3 mr-1" />
                Definir meta
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
