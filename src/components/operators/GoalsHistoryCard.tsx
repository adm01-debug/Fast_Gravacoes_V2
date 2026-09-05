import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  OperatorGoal,
  calculateGoalProgress,
  GOAL_TYPE_LABELS,
  GoalType
} from '@/features/production';
import { OperatorProductivityMetrics } from '@/features/production';
import {
  History,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { format, parseISO, isBefore, isAfter, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from '@/lib/recharts';

interface GoalsHistoryCardProps {
  goals: OperatorGoal[];
  operators: OperatorProductivityMetrics[];
}

interface PeriodGroup {
  periodKey: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  goals: OperatorGoal[];
  achievedCount: number;
  totalCount: number;
  averageProgress: number;
}

export function GoalsHistoryCard({ goals, operators }: GoalsHistoryCardProps) {
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  // Filter goals by operator
  const filteredGoals = useMemo(() => {
    if (selectedOperator === 'all') return goals;
    return goals.filter(g => g.operator_id === selectedOperator);
  }, [goals, selectedOperator]);

  // Get current date for comparison
  const now = new Date();

  // Group goals by period (month)
  const periodGroups = useMemo((): PeriodGroup[] => {
    const groups: Record<string, OperatorGoal[]> = {};

    filteredGoals.forEach(goal => {
      const start = parseISO(goal.period_start);
      const periodKey = format(start, 'yyyy-MM');

      if (!groups[periodKey]) {
        groups[periodKey] = [];
      }
      groups[periodKey].push(goal);
    });

    return Object.entries(groups)
      .map(([periodKey, periodGoals]) => {
        const firstGoal = periodGoals[0];
        const startDate = parseISO(firstGoal.period_start);
        const endDate = parseISO(firstGoal.period_end);

        // Calculate achievements for this period
        let achievedCount = 0;
        let totalProgress = 0;

        periodGoals.forEach(goal => {
          const operatorMetrics = operators.find(o => o.operatorId === goal.operator_id);
          if (operatorMetrics) {
            let currentValue: number;
            switch (goal.goal_type) {
              case 'efficiency': currentValue = operatorMetrics.efficiencyScore; break;
              case 'jobs_completed': currentValue = operatorMetrics.totalJobsCompleted; break;
              case 'pieces_produced': currentValue = operatorMetrics.totalPiecesProduced; break;
              case 'loss_rate': currentValue = operatorMetrics.lossRate; break;
              default: currentValue = 0;
            }
            const progress = calculateGoalProgress(goal, currentValue);
            totalProgress += progress.progress_percentage;
            if (progress.is_achieved) achievedCount++;
          }
        });

        return {
          periodKey,
          periodLabel: format(startDate, "MMMM 'de' yyyy", { locale: ptBR }),
          startDate,
          endDate,
          goals: periodGoals,
          achievedCount,
          totalCount: periodGoals.length,
          averageProgress: periodGoals.length > 0 ? Math.round(totalProgress / periodGoals.length) : 0,
        };
      })
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [filteredGoals, operators]);

  // Separate current and past periods
  const currentPeriod = periodGroups.find(p =>
    !isBefore(now, p.startDate) && !isAfter(now, p.endDate)
  );
  const pastPeriods = periodGroups.filter(p => isBefore(p.endDate, now));

  // Calculate period comparison data
  const comparisonData = useMemo(() => {
    return periodGroups
      .slice(0, 6)
      .reverse()
      .map(p => ({
        period: format(p.startDate, 'MMM/yy', { locale: ptBR }),
        achieved: p.achievedCount,
        notAchieved: p.totalCount - p.achievedCount,
        total: p.totalCount,
        rate: p.totalCount > 0 ? Math.round((p.achievedCount / p.totalCount) * 100) : 0,
        progress: p.averageProgress,
      }));
  }, [periodGroups]);

  const getOperatorName = (operatorId: string) => {
    const op = operators.find(o => o.operatorId === operatorId);
    return op?.operatorName || 'Operador';
  };

  const formatValue = (value: number, type: GoalType) => {
    if (type === 'efficiency' || type === 'loss_rate') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  if (goals.length === 0) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-8 text-center text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma meta registrada ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Metas
            </CardTitle>
            <CardDescription>
              Acompanhamento de metas por período com comparativo de desempenho
            </CardDescription>
          </div>
          <Select value={selectedOperator} onValueChange={setSelectedOperator}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos operadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos operadores</SelectItem>
              {operators.map(op => (
                <SelectItem key={op.operatorId} value={op.operatorId}>
                  {op.operatorName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Por Período
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Comparativo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {/* Current Period */}
            {currentPeriod && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Período Atual</Badge>
                    <span className="font-medium capitalize">{currentPeriod.periodLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-warning" />
                    <span className="font-bold">{currentPeriod.achievedCount}/{currentPeriod.totalCount}</span>
                  </div>
                </div>
                <Progress value={currentPeriod.averageProgress} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Progresso médio: {currentPeriod.averageProgress}%
                </p>
              </div>
            )}

            {/* Past Periods */}
            {pastPeriods.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Períodos Anteriores</h4>
                {pastPeriods.map(period => (
                  <div
                    key={period.periodKey}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedPeriod(
                        expandedPeriod === period.periodKey ? null : period.periodKey
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize">{period.periodLabel}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {period.achievedCount === period.totalCount ? (
                            <Badge className="bg-success text-success-foreground">
                              100% atingidas
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {period.achievedCount}/{period.totalCount} atingidas
                            </Badge>
                          )}
                        </div>
                        {expandedPeriod === period.periodKey ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {expandedPeriod === period.periodKey && (
                      <div className="p-3 pt-0 space-y-2 border-t">
                        {period.goals.map(goal => {
                          const operatorMetrics = operators.find(o => o.operatorId === goal.operator_id);
                          let currentValue = 0;
                          if (operatorMetrics) {
                            switch (goal.goal_type) {
                              case 'efficiency': currentValue = operatorMetrics.efficiencyScore; break;
                              case 'jobs_completed': currentValue = operatorMetrics.totalJobsCompleted; break;
                              case 'pieces_produced': currentValue = operatorMetrics.totalPiecesProduced; break;
                              case 'loss_rate': currentValue = operatorMetrics.lossRate; break;
                            }
                          }
                          const progress = calculateGoalProgress(goal, currentValue);

                          return (
                            <div
                              key={goal.id}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                            >
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {selectedOperator === 'all' && (
                                      <span className="text-muted-foreground mr-1">
                                        {getOperatorName(goal.operator_id)}:
                                      </span>
                                    )}
                                    {GOAL_TYPE_LABELS[goal.goal_type as GoalType]}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Meta: {formatValue(goal.target_value, goal.goal_type as GoalType)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {progress.is_achieved ? (
                                  <Badge className="bg-success text-success-foreground">
                                    <Trophy className="h-3 w-3 mr-1" />
                                    Atingida
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    {progress.progress_percentage}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pastPeriods.length === 0 && !currentPeriod && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum histórico de metas disponível
              </p>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            {comparisonData.length > 1 ? (
              <>
                {/* Comparison Chart */}
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="period" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          value,
                          name === 'achieved' ? 'Atingidas' : 'Não atingidas'
                        ]}
                      />
                      <Legend
                        formatter={(value) => value === 'achieved' ? 'Atingidas' : 'Não atingidas'}
                      />
                      <Bar dataKey="achieved" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="notAchieved" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Period-over-period comparison */}
                {comparisonData.length >= 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {comparisonData.slice(-2).map((period, index, arr) => {
                      const isLatest = index === arr.length - 1;
                      const previousPeriod = index > 0 ? arr[index - 1] : null;
                      const rateChange = previousPeriod
                        ? period.rate - previousPeriod.rate
                        : 0;
                      const progressChange = previousPeriod
                        ? period.progress - previousPeriod.progress
                        : 0;

                      return (
                        <div
                          key={period.period}
                          className={`p-4 rounded-lg border ${
                            isLatest ? 'border-primary/50 bg-primary/5' : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium">{period.period}</span>
                            {isLatest && <Badge variant="default">Mais recente</Badge>}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Taxa de sucesso</span>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">{period.rate}%</span>
                                {previousPeriod && rateChange !== 0 && (
                                  <span className={`text-xs flex items-center ${
                                    rateChange > 0 ? 'text-success' : 'text-destructive'
                                  }`}>
                                    {rateChange > 0 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {Math.abs(rateChange)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progresso médio</span>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">{period.progress}%</span>
                                {previousPeriod && progressChange !== 0 && (
                                  <span className={`text-xs flex items-center ${
                                    progressChange > 0 ? 'text-success' : 'text-destructive'
                                  }`}>
                                    {progressChange > 0 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {Math.abs(progressChange)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Metas</span>
                              <span className="font-medium">
                                {period.achieved}/{period.total}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Necessário pelo menos 2 períodos para comparativo</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
