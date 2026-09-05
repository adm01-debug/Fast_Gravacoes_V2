 
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { endOfDay } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { logger } from '@/lib/logger';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, Target, Zap, Clock, TrendingUp,
  ArrowUpRight, AlertTriangle, Sparkles, ChevronDown, ChevronUp, Activity,
  LayoutGrid, BrainCircuit, History
} from 'lucide-react';
import { useSchedulingData } from '@/features/jobs';
import { useSmartSequencingWithActions } from '@/features/jobs';
import { useLoadBalancingWithActions } from '@/features/analytics/hooks/useLoadBalancingWithActions';
import { useOEE } from '@/features/production';
import { useMTBFMTTR } from '@/features/production';
import { OEETrendChart } from '@/features/analytics/components/oee/OEETrendChart';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PlanningEfficiencyDashboard() {
  const { jobs } = useSchedulingData();
  const { totalSavings, suggestions: sequencingSuggestions, applyAllSequencing, isApplying: isApplyingSequencing } = useSmartSequencingWithActions();
  const { suggestions: balancingSuggestions, byTechnique, applyAllSuggestions, isApplying: isApplyingBalancing } = useLoadBalancingWithActions();
  const { data: oeeData } = useOEE(14, 14); // Compare last 14 days vs previous 14
  const { summary: reliabilitySummary } = useMTBFMTTR(30);
  const [showTrend, setShowTrend] = useState(false);

  const handleBulkOptimization = async () => {
    try {
      if (balancingSuggestions.length > 0) {
        await applyAllSuggestions();
      }
      if (sequencingSuggestions.length > 0) {
        await applyAllSequencing();
      }
    } catch (error) {
      logger.error('Falha ao aplicar sugestões de planejamento', error, 'PlanningEfficiencyDashboard');
    }
  };

  const isApplying = isApplyingSequencing || isApplyingBalancing;
  const hasSuggestions = sequencingSuggestions.length > 0 || balancingSuggestions.length > 0;

  const stats = useMemo(() => {
    if (!jobs || jobs.length === 0) return null;

    const currentJobs = jobs.filter(j => !['finished', 'cancelled'].includes(j.status));
    const totalJobs = currentJobs.length;
    if (totalJobs === 0) return null;

    // Calculate planning efficiency based on deadline adherence and optimization potential
    const delayedCount = jobs.filter(j => j.status === 'delayed').length;
    const finishedJobs = jobs.filter(j => j.status === 'finished');
    const withinDeadlineCount = finishedJobs.filter(j => {
      if (!j.scheduled_date || !j.actual_end_time) return true;
      const deadline = parseDateOnly(j.scheduled_date);
      // The deadline is the whole scheduled day, so compare against its end.
      return !!deadline && new Date(j.actual_end_time) <= endOfDay(deadline);
    }).length;

    const efficiencyScore = finishedJobs.length > 0
      ? Math.round((withinDeadlineCount / finishedJobs.length) * 100)
      : 85; // Default if no finished jobs

    const deadlineHealth = Math.round(((totalJobs - delayedCount) / totalJobs) * 100) || 0;

    // Use actual OEE from real flow metrics (Availability, Performance, Quality)
    const estimatedOEE = oeeData?.overallOEE ?? 75;

    // Calculate bottleneck risk
    const hasHighBottleneck = (sequencingSuggestions?.some(s => s.bottleneckRisk === 'high')) ||
                             (balancingSuggestions?.some(s => s.currentLoad > 90));

    return { efficiencyScore, deadlineHealth, totalJobs, delayedCount, estimatedOEE, oeeData, hasHighBottleneck };
  }, [jobs, oeeData, sequencingSuggestions, balancingSuggestions]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Efficiency Score */}
      <Card className="glass-card overflow-hidden group border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative">
        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
           <BrainCircuit className="h-16 w-16 text-primary" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-[9px] font-black text-primary animate-pulse tracking-tighter">
              <Sparkles className="h-2.5 w-2.5" />
              AI-DRIVEN ENGINE
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Score de Planejamento</p>
          <div className="flex items-end gap-2 mb-3">
            <h3 className="text-3xl font-black text-title tracking-tighter">{stats.efficiencyScore}%</h3>
            <div className="text-[10px] text-success font-bold flex items-center mb-1 bg-success/10 px-1.5 py-0.5 rounded-full border border-success/20">
              <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
              +2.4%
            </div>
          </div>
          <Progress value={stats.efficiencyScore} className="h-1.5 bg-primary/10" />
        </CardContent>
      </Card>

      {/* Deadline Health */}
      <Card className={cn(
        "glass-card overflow-hidden group border-green-500/20",
        stats.hasHighBottleneck && "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
              <Clock className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">
            {stats.hasHighBottleneck ? "⚠️ RISCO DE GARGALO" : "Saúde dos Prazos"}
          </p>
          <div className="flex items-end gap-2 mb-3">
            <h3 className="text-3xl font-black text-title tracking-tighter">{stats.deadlineHealth}%</h3>
            {stats.delayedCount > 0 && (
              <div className="text-[10px] text-red-400 font-bold flex items-center mb-1">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                {stats.delayedCount} atrasados
              </div>
            )}
          </div>
          <Progress value={stats.deadlineHealth} className="h-1.5 bg-green-500/10" variant="success" />
        </CardContent>
      </Card>

      {/* Setup Savings */}
      <Card className="glass-card overflow-hidden group border-warning/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-warning/10 rounded-lg group-hover:bg-warning/20 transition-colors">
              <Zap className="h-5 w-5 text-warning" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Recuperação de Setup</p>
          <div className="flex items-end gap-2 mb-3">
            <h3 className="text-3xl font-black text-title tracking-tighter">-{totalSavings}m</h3>
            <div className="text-[10px] text-warning font-bold flex items-center mb-1 uppercase">
              Economia de IA
            </div>
          </div>
          <div className="flex gap-1 h-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn(
                "flex-1 rounded-full bg-muted",
                i <= 3 && "bg-warning/50"
              )} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Machine Reliability Risk */}
      <Card className={cn(
        "glass-card overflow-hidden group border-purple-500/20",
        reliabilitySummary.criticalMachines.length > 0 && "border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            {reliabilitySummary.criticalMachines.length > 0 && (
              <Badge variant="destructive" className="text-[8px] px-1 py-0 h-4">RISCO ALTO</Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Confiabilidade de Ativos</p>
          <div className="flex items-end gap-2 mb-3">
            <h3 className="text-3xl font-black text-title tracking-tighter">{Math.round(reliabilitySummary.averageAvailability)}<span className="text-lg opacity-50">%</span></h3>
            <div className="text-[10px] text-muted-foreground font-bold flex items-center mb-1 uppercase">
              Disponibilidade
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground uppercase font-semibold">Máquinas Críticas</span>
              <span className={cn(
                "font-bold",
                reliabilitySummary.criticalMachines.length > 0 ? "text-red-400" : "text-green-400"
              )}>
                {reliabilitySummary.criticalMachines.length}
              </span>
            </div>
            <div className="flex gap-0.5 h-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-full",
                    i < (reliabilitySummary.criticalMachines.length) ? "bg-red-400" : "bg-muted"
                  )}
                />
              ))}
            </div>
            {reliabilitySummary.criticalMachines.length > 0 && (
              <p className="text-[9px] text-red-400/80 leading-tight italic">
                Atenção: {reliabilitySummary.criticalMachines[0].machineName} apresenta MTBF crítico.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Throughput / OEE Trends */}
      <Card className="glass-card overflow-hidden group border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">OEE Real (Fluxo Fabril)</p>
          <div className="flex items-end gap-2 mb-3">
            <h3 className="text-3xl font-black text-title tracking-tighter">{Math.round(stats.estimatedOEE)}<span className="text-lg opacity-50">%</span></h3>
            <div className={cn(
              "text-[10px] font-bold flex items-center mb-1 uppercase",
              stats.estimatedOEE >= 85 ? "text-green-400" : stats.estimatedOEE >= 70 ? "text-warning" : "text-red-400"
            )}>
              {stats.estimatedOEE >= 85 ? "World Class" : stats.estimatedOEE >= 70 ? "Bom" : "Crítico"}
            </div>
          </div>
          <div className="space-y-1 mt-1">
            <div className="flex justify-between text-[8px] text-muted-foreground uppercase font-semibold">
              <span>Disponibilidade</span>
              <span>{Math.round(stats.oeeData?.overallAvailability || 0)}%</span>
            </div>
            <Progress value={stats.oeeData?.overallAvailability || 0} className="h-0.5 bg-blue-500/10" />
            <div className="flex justify-between text-[8px] text-muted-foreground uppercase font-semibold">
              <span>Desempenho</span>
              <span>{Math.round(stats.oeeData?.overallPerformance || 0)}%</span>
            </div>
            <Progress value={stats.oeeData?.overallPerformance || 0} className="h-0.5 bg-blue-500/10" />
            <div className="flex justify-between text-[8px] text-muted-foreground uppercase font-semibold">
              <span>Qualidade</span>
              <span>{Math.round(stats.oeeData?.overallQuality || 0)}%</span>
            </div>
            <Progress value={stats.oeeData?.overallQuality || 0} className="h-0.5 bg-blue-500/10" />
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showTrend && oeeData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:col-span-2 lg:col-span-4 overflow-hidden"
          >
            <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <OEETrendChart
                  data={oeeData.trendData}
                  worldClassBenchmark={oeeData.worldClassBenchmark}
                  comparison={oeeData.comparison}
                />
              </div>

              {/* Technique Load Distribution */}
              <Card className="glass-card border-primary/10">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <CardTitle className="text-xs uppercase font-bold tracking-wider">Carga por Técnica</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  {byTechnique.map((tech) => (
                    <div key={tech.technique.id} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="font-semibold truncate max-w-[150px]">{tech.technique.name}</span>
                        <span className={cn(
                          "font-bold",
                          tech.averageOccupancy > 90 ? "text-red-400" : tech.averageOccupancy > 75 ? "text-warning" : "text-green-400"
                        )}>
                          {Math.round(tech.averageOccupancy)}%
                        </span>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        {tech.machines.map((machine, idx) => (
                          <TooltipProvider key={machine.machine.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "flex-1 rounded-sm transition-all cursor-help",
                                    machine.occupancyRate > 95 ? "bg-red-500" :
                                    machine.occupancyRate > 80 ? "bg-warning" :
                                    machine.occupancyRate < 20 ? "bg-blue-400/50" : "bg-primary/40"
                                  )}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[10px] font-bold">{machine.machine.name}</p>
                                <p className="text-[10px]">{Math.round(machine.occupancyRate)}% de ocupação</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                      {tech.isUnbalanced && (
                        <p className="text-[8px] text-warning flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-2 w-2" /> Desbalanceado (∆ {Math.round(tech.maxOccupancy - tech.minOccupancy)}%)
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="md:col-span-2 lg:col-span-4 flex justify-between items-center -mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary gap-2"
          onClick={() => setShowTrend(!showTrend)}
        >
          {showTrend ? (
            <>Ocultar Tendências <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Ver Histórico e Tendências de OEE <ChevronDown className="h-3 w-3" /></>
          )}
        </Button>

        {hasSuggestions && (
          <Button
            size="sm"
            variant="outline"
            disabled={isApplying}
            className="text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-primary animate-in fade-in zoom-in duration-500"
            onClick={handleBulkOptimization}
          >
            {isApplying ? (
              <Activity className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {isApplying ? 'Otimizando...' : 'Executar Otimização em Massa'}
          </Button>
        )}
      </div>
    </div>
  );
}
