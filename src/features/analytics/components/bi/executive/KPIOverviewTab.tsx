import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, CheckCircle2, Factory,
  AlertTriangle, Target, Clock, Zap, BrainCircuit, Sparkles, Settings2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from '@/lib/recharts';
import { KPITooltip, KPI_DEFINITIONS } from '@/components/ui/kpi-tooltip';
import { KPIData } from '@/features/analytics/hooks/useKPIs';

interface KPIOverviewTabProps {
  kpis: KPIData;
  visibleKPIs: Record<string, boolean>;
  completionRate: number;
  statusData: Array<{ name: string; value: number; color: string }>;
  handleDrillDown: (title: string, segment: "delayed" | "finished" | "lost" | "production" | "queue") => void;
}

const KPIOverviewTabComponent = ({
  kpis, visibleKPIs, completionRate, statusData, handleDrillDown
}: KPIOverviewTabProps) => {
  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {visibleKPIs.completion && (
          <KPITooltip
            title="Taxa de Conclusão"
            description="Percentual de jobs finalizados em relação ao total."
            formula="Jobs Concluídos / Total de Jobs"
            target={`≥ ${kpis.targets.completionRate}%`}
          >
            <Card className="glass-card hover-scale relative overflow-hidden group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6"><Settings2 className="h-3 w-3" /></Button>
              </div>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Taxa de Conclusão</p>
                    <p className="text-2xl sm:text-3xl font-bold">{completionRate.toFixed(1)}%</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={cn(
                        "h-5 px-1 text-[10px] gap-0.5 border-none bg-transparent",
                        kpis.comparison.completionRateDiff >= 0 ? "text-green-400" : "text-primary"
                      )}>
                        {kpis.comparison.completionRateDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(kpis.comparison.completionRateDiff).toFixed(1)}%
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">vs anterior</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                  </div>
                </div>
                <div className="relative mt-3">
                  <Progress value={completionRate} className="h-2 [&>div]:bg-green-500" />
                  <div className="absolute top-[-4px] w-[2px] h-4 bg-foreground/20" style={{ left: `${kpis.targets.completionRate}%` }} title={`Meta: ${kpis.targets.completionRate}%`} />
                </div>
              </CardContent>
            </Card>
          </KPITooltip>
        )}

        {visibleKPIs.occupancy && (
          <KPITooltip
            title="Ocupação Média"
            description="Percentual médio de utilização das máquinas."
            formula="Tempo em Uso / Tempo Disponível"
            target={`≥ ${kpis.targets.occupancyRate}%`}
          >
            <Card className="glass-card hover-scale group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6"><Settings2 className="h-3 w-3" /></Button>
              </div>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Ocupação Média</p>
                    <p className="text-2xl sm:text-3xl font-bold">{kpis.averageOccupancy.toFixed(1)}%</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={cn(
                        "h-5 px-1 text-[10px] gap-0.5 border-none bg-transparent",
                        kpis.comparison.occupancyDiff >= 0 ? "text-green-400" : "text-primary"
                      )}>
                        {kpis.comparison.occupancyDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(kpis.comparison.occupancyDiff).toFixed(1)}%
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">vs anterior</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Factory className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                  </div>
                </div>
                <div className="relative mt-3">
                  <Progress value={kpis.averageOccupancy} className="h-2 [&>div]:bg-cyan-500" />
                  <div className="absolute top-[-4px] w-[2px] h-4 bg-foreground/20" style={{ left: `${kpis.targets.occupancyRate}%` }} title={`Meta: ${kpis.targets.occupancyRate}%`} />
                </div>
              </CardContent>
            </Card>
          </KPITooltip>
        )}

        {visibleKPIs.loss && (
          <KPITooltip {...KPI_DEFINITIONS.lossRate}>
            <Card
              className="glass-card hover-scale group cursor-pointer"
              onClick={() => handleDrillDown('TAXA DE PERDA', 'lost')}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6"><Settings2 className="h-3 w-3" /></Button>
              </div>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Índice de Perdas</p>
                    <p className={cn(
                      "text-2xl sm:text-3xl font-bold",
                      kpis.lossRate > 5 ? "text-primary" : kpis.lossRate > 2 ? "text-warning" : "text-green-400"
                    )}>
                      {kpis.lossRate.toFixed(2)}%
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={cn(
                        "h-5 px-1 text-[10px] gap-0.5 border-none bg-transparent",
                        kpis.comparison.lossRateDiff <= 0 ? "text-green-400" : "text-primary"
                      )}>
                        {kpis.comparison.lossRateDiff <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {Math.abs(kpis.comparison.lossRateDiff).toFixed(2)}%
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">vs anterior</span>
                    </div>
                  </div>
                  <div className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    kpis.lossRate > 5 ? "bg-primary/20" : kpis.lossRate > 2 ? "bg-warning/20" : "bg-green-500/20"
                  )}>
                    {kpis.lossRate > 2 ? (
                      <TrendingDown className={cn("h-5 w-5 sm:h-6 sm:w-6", kpis.lossRate > 5 ? "text-primary" : "text-warning")} />
                    ) : (
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </KPITooltip>
        )}

        {visibleKPIs.delayed && (
          <Card className="glass-card hover-scale">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Jobs Atrasados</p>
                  <p className={cn(
                    "text-2xl sm:text-3xl font-bold",
                    kpis.delayedJobs > 0 ? "text-primary" : "text-green-400"
                  )}>
                    {kpis.delayedJobs}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">requerem atenção</p>
                </div>
                <div className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  kpis.delayedJobs > 0 ? "bg-primary/20" : "bg-green-500/20"
                )}>
                  <AlertTriangle className={cn("h-5 w-5 sm:h-6 sm:w-6", kpis.delayedJobs > 0 ? "text-primary" : "text-green-400")} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Evolution (Historical) */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Histórico de Performance
              </CardTitle>
              <CardDescription>Evolução semanal de eficiência e produtividade</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">LIVE TRACKING</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpis.performanceHistory}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="efficiency" stroke="#10B981" fillOpacity={1} fill="url(#colorEff)" name="Eficiência (%)" />
                <Area type="monotone" dataKey="productivity" stroke="#06B6D4" fillOpacity={1} fill="url(#colorProd)" name="Produtividade (peças)" />
                <Area
                  type="step"
                  dataKey={() => 85}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  fill="none"
                  name="Meta Eficiência (85%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Distribuição de Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today Summary */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Volume de Produção (Hoje)
            </CardTitle>
            <CardDescription>Resumo de jobs processados nas últimas 24h</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-primary">{kpis.todayStats.scheduled}</p>
                <p className="text-sm text-muted-foreground font-medium">Agendados</p>
              </div>
              <div className="p-4 rounded-xl bg-cyan-500/10 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-cyan-400">{kpis.todayStats.inProgress}</p>
                <p className="text-sm text-muted-foreground font-medium">Em Produção</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-green-400">{kpis.todayStats.completed}</p>
                <p className="text-sm text-muted-foreground font-medium">Concluídos</p>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-primary">{kpis.todayStats.delayed}</p>
                <p className="text-sm text-muted-foreground font-medium">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictive Insights */}
      <Card className="glass-card border-primary/30 bg-primary/5 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
              Projeção de Performance (AI Insights)
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1">
              <Sparkles className="h-3 w-3" />
              PREDICTIVE
            </Badge>
          </div>
          <CardDescription>Tendências baseadas no histórico recente e volume atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.predictions}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="estimatedVolume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Volume Estimado" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-xs font-bold uppercase tracking-wider">Insight da Semana</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Projeção indica um aumento de {Math.abs(kpis.comparison.volumeDiff).toFixed(1)}% na demanda.
                  Recomendado revisar manutenção preventiva para evitar gargalos em {kpis.predictions[2]?.date || 'breve'}.
                </p>
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="text-xs text-muted-foreground">Confiança do Modelo</span>
                <span className="text-xs font-bold">{(kpis.predictions[0]?.confidence * 100 || 90).toFixed(0)}%</span>
              </div>
              <Progress value={kpis.predictions[0]?.confidence * 100 || 90} className="h-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const KPIOverviewTab = memo(KPIOverviewTabComponent);
