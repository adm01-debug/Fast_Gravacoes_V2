import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useKPIs } from '@/features/analytics/hooks/useKPIs';
import { useOEE } from '@/features/production';
import { useSchedulingData } from '@/features/jobs';
import { useOperators } from '@/features/production';
import { useOperatorMachines } from '@/features/production';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { BIStatCard } from '@/features/analytics/components/bi/BIStatCard';
import { BILoadingSkeleton } from '@/features/analytics/components/bi/BILoadingSkeleton';
import { BIPeriodFilters } from '@/features/analytics/components/bi/BIPeriodFilters';
import { BIHeader } from '@/features/analytics/components/bi/BIHeader';
import { FuturisticBI } from '@/features/analytics/components/bi/FuturisticBI';
import { BINormalView } from '@/features/analytics/components/bi/BINormalView';
import { DrillDownDialog } from '@/features/analytics/components/bi/drilldown/DrillDownDialog';
import { BIJob, BIMetrics as BIMetricsTyped } from '@/features/analytics/components/bi/types';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp, AlertTriangle, Printer, CheckCircle, Clock, Target,
  BarChart3, PieChart, LineChart, ArrowUp, ArrowDown, Minus,
  Gauge, Activity, ArrowRight, Package, Layout
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from '@/lib/recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DelaysAnalysis } from '@/features/analytics/components/bi/delays/DelaysAnalysis';
import { LossesTable } from '@/features/analytics/components/bi/losses/LossesTable';
import { AIInsights } from '@/features/analytics/components/bi/AIInsights';

import { BIMetrics as BIMetricsLegacy, BIJob as BIJobLegacy } from '@/features/analytics/types';
type PeriodFilter = '7d' | '30d' | '90d' | 'custom';
interface DateRange { from: Date; to: Date; }

import { CHART_COLORS, PIE_COLORS, STUDIO_MAP, STUDIO_LIST } from '@/constants/biConstants';

function getComparisonDelta(current: number, previous: number) {
  if (previous === 0) return { delta: 0, trend: 'neutral' as const };
  const delta = ((current - previous) / previous) * 100;
  return { delta: Math.abs(delta), trend: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'neutral' as const };
}

function ComparisonKPICard({ title, value1, value2, icon: Icon, format: formatFn = (v: number) => v.toLocaleString(), higherIsBetter = true }: { title: string; value1: number; value2: number; icon: React.ElementType; format?: (v: number) => string; higherIsBetter?: boolean }) {
  const { delta, trend } = getComparisonDelta(value1, value2);
  const isPositive = higherIsBetter ? trend === 'up' : trend === 'down';
  return (
    <Card className="card-interactive overflow-hidden group hover:shadow-glow-primary transition-all duration-300">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all"><Icon className="h-5 w-5 text-primary" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-muted-foreground">Período 1</p><p className="text-2xl font-bold gradient-text">{formatFn(value1)}</p></div>
          <div><p className="text-xs text-muted-foreground">Período 2</p><p className="text-2xl font-bold text-muted-foreground">{formatFn(value2)}</p></div>
        </div>
        <div className={cn("mt-4 flex items-center gap-2 text-sm font-medium", isPositive ? "text-success" : trend === 'neutral' ? "text-muted-foreground" : "text-primary")}>
          {trend === 'up' ? <ArrowUp className="h-4 w-4" /> : trend === 'down' ? <ArrowDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          <span>{delta.toFixed(1)}% {trend === 'up' ? 'maior' : trend === 'down' ? 'menor' : 'igual'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BIDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [customRange, setCustomRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [periodFilter2, setPeriodFilter2] = useState<PeriodFilter>('30d');
  const [customRange2, setCustomRange2] = useState<DateRange>({ from: subDays(new Date(), 60), to: subDays(new Date(), 31) });
  const [isCalendarOpen2, setIsCalendarOpen2] = useState(false);
  const [viewMode, setViewMode] = useState<'futuristic' | 'classic'>('futuristic');
  const [studioFilter, setStudioFilter] = useState<string>('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>('all');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownJobs, setDrillDownJobs] = useState<BIJob[]>([]);

  const periodDays = useMemo(() => {
    if (periodFilter === 'custom') return differenceInDays(customRange.to, customRange.from) || 30;
    return periodFilter === '7d' ? 7 : periodFilter === '90d' ? 90 : 30;
  }, [periodFilter, customRange]);

  const { data: kpis, isLoading: kpisLoading } = useKPIs();
  const { data: oeeData, isLoading: oeeLoading } = useOEE(periodDays);
  const { jobs, machines, techniques, isLoading: schedulingLoading } = useSchedulingData();
  const { data: operators } = useOperators();
  const { assignments } = useOperatorMachines();
  const isLoading = kpisLoading || oeeLoading || schedulingLoading;

  const dateRange = useMemo((): DateRange => {
    if (periodFilter === 'custom') return customRange;
    const days = periodFilter === '7d' ? 7 : periodFilter === '90d' ? 90 : 30;
    return { from: subDays(new Date(), days), to: new Date() };
  }, [periodFilter, customRange]);

  const dateRange2 = useMemo((): DateRange => {
    if (periodFilter2 === 'custom') return customRange2;
    const days = periodFilter2 === '7d' ? 7 : periodFilter2 === '90d' ? 90 : 30;
    const endDate = subDays(dateRange.from, 1);
    return { from: subDays(endDate, days), to: endDate };
  }, [periodFilter2, customRange2, dateRange.from]);

  const calculatePeriodMetrics = useCallback((range: DateRange): BIMetricsTyped | null => {
    if (!jobs || !machines || !techniques) return null;
    let filteredJobs = jobs.filter(j => {
      if (!j.created_at) return false;
      try { return isWithinInterval(parseISO(j.created_at), { start: startOfDay(range.from), end: endOfDay(range.to) }); }
      catch { return false; }
    });

    if (machineFilter !== 'all') {
      filteredJobs = filteredJobs.filter(j => j.machine_id === machineFilter);
    }

    if (collaboratorFilter !== 'all') {
      const assignedMachineIds = assignments
        ?.filter(a => a.operator_id === collaboratorFilter)
        .map(a => a.machine_id) || [];
      filteredJobs = filteredJobs.filter(j => j.machine_id && assignedMachineIds.includes(j.machine_id));
    }

    if (studioFilter !== 'all') {
      const studioMap: Record<string, string[]> = {
        'Studio Alfa': ['laser-co2', 'laser-fiber'],
        'Studio Beta': ['uv-print', 'sublimation'],
        'Studio Gamma': ['pad-printing', 'silkscreen', 'embroidery']
      };
      const allowedTechniques = studioMap[studioFilter] || [];
      filteredJobs = filteredJobs.filter(j => j.technique_id && allowedTechniques.includes(j.technique_id));
    }

    const statusDistribution = [
      { name: 'Finalizados', value: filteredJobs.filter(j => j.status === 'finished').length, color: PIE_COLORS[0] },
      { name: 'Em Produção', value: filteredJobs.filter(j => j.status === 'production').length, color: PIE_COLORS[1] },
      { name: 'Agendados', value: filteredJobs.filter(j => j.status === 'scheduled').length, color: PIE_COLORS[2] },
      { name: 'Na Fila', value: filteredJobs.filter(j => j.status === 'queue').length, color: PIE_COLORS[3] },
      { name: 'Atrasados', value: filteredJobs.filter(j => j.status === 'delayed').length, color: PIE_COLORS[4] },
    ].filter(s => s.value > 0);

    const trendDays = Math.min(differenceInDays(range.to, range.from), 30);
    const dailyTrend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = subDays(range.to, i);
      const dayJobs = filteredJobs.filter(j => {
        if (!j.actual_end_time) return false;
        try { return isWithinInterval(parseISO(j.actual_end_time), { start: startOfDay(date), end: endOfDay(date) }); }
        catch { return false; }
      });
      // Null produced_quantity means "not recorded" — not "fully produced".
      const produced = dayJobs.reduce((sum, j) => sum + (j.produced_quantity ?? 0), 0);
      const lost = dayJobs.reduce((sum, j) => sum + (j.lost_pieces ?? 0), 0);
      dailyTrend.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, 'dd MMM', { locale: ptBR }),
        jobs: dayJobs.length,
        produced,
        lost,
        efficiency: produced > 0 ? Math.max(0, (produced - lost) / produced * 100) : 0,
      });
    }

    const techniquePerformance = techniques.map(tech => {
      const techJobs = filteredJobs.filter(j => j.technique_id === tech.id && j.status === 'finished');
      const totalProduced = techJobs.reduce((sum, j) => sum + (j.produced_quantity ?? 0), 0);
      const totalLost = techJobs.reduce((sum, j) => sum + (j.lost_pieces ?? 0), 0);
      return {
        id: tech.id, name: tech.short_name || tech.name, jobs: techJobs.length,
        produced: totalProduced, lost: totalLost, machines: machines.filter(m => m.technique_id === tech.id).length,
        quality: totalProduced > 0 ? Math.max(0, (totalProduced - totalLost) / totalProduced * 100) : 100, color: tech.color,
      };
    }).filter(t => t.jobs > 0).sort((a, b) => b.produced - a.produced);

    const machineUtilization = machines.map(machine => {
      const machineJobs = filteredJobs.filter(j => j.machine_id === machine.id);
      const completedJobs = machineJobs.filter(j => j.status === 'finished');
      const technique = techniques.find(t => t.id === machine.technique_id);
      return {
        machine: machine.code || machine.name,
        technique: technique?.short_name || technique?.name || '',
        totalJobs: machineJobs.length, 
        completedJobs: completedJobs.length,
        utilization: machineJobs.length > 0 ? (completedJobs.length / machineJobs.length * 100) : 0,
        value: machineJobs.length > 0 ? (completedJobs.length / machineJobs.length * 100) : 0
      };
    }).filter(m => m.totalJobs > 0).sort((a, b) => b.utilization - a.utilization);

    const periodCompletedJobs = filteredJobs.filter(j => j.status === 'finished').length;
    const periodCompletedPieces = filteredJobs.filter(j => j.status === 'finished').reduce((sum, j) => sum + (j.produced_quantity ?? 0), 0);
    const periodLostPieces = filteredJobs.reduce((sum, j) => sum + (j.lost_pieces ?? 0), 0);
    const totalAttempted = periodCompletedPieces + periodLostPieces;
    const periodLossRate = totalAttempted > 0 ? (periodLostPieces / totalAttempted) * 100 : 0;

    return {
      totalJobs: filteredJobs.length,
      completedJobs: periodCompletedJobs,
      delayedJobs: filteredJobs.filter(j => j.status === 'delayed').length,
      totalPieces: filteredJobs.reduce((sum, j) => sum + (j.quantity || 0), 0),
      completedPieces: periodCompletedPieces,
      lostPieces: periodLostPieces,
      avgEfficiency: '95%',
      lossImpact: periodLostPieces * 15,
      statusDistribution, 
      dailyTrend, 
      techniquePerformance,
      machineUtilization: machineUtilization.slice(0, 10),
      periodJobs: filteredJobs.length, 
      periodJobsList: filteredJobs.map(j => ({ ...j, efficiency: '95%' } as BIJob)), 
      periodCompletedJobs, 
      periodCompletedPieces,
      periodLostPieces, 
      periodLossRate,
      toDoJobs: filteredJobs.filter(j => j.status === 'scheduled' || j.status === 'queue').length,
      activeMachines: machines.filter(m => m.is_active).length, 
      activeTechniques: techniques.length,
    };
  }, [jobs, machines, techniques, machineFilter, collaboratorFilter, assignments, studioFilter]);

  const biMetrics = useMemo(() => {
    if (!jobs || !machines || !techniques || !kpis || !oeeData) return null;
    const metrics = calculatePeriodMetrics(dateRange);
    if (!metrics) return null;
    const halfPeriod = subDays(dateRange.from, differenceInDays(dateRange.to, dateRange.from));
    const prevPeriodJobs = jobs.filter(j => {
      if (!j.created_at) return false;
      try { return isWithinInterval(parseISO(j.created_at), { start: startOfDay(halfPeriod), end: endOfDay(subDays(dateRange.from, 1)) }); }
      catch { return false; }
    });
    const productionTrend = metrics.periodJobs > prevPeriodJobs.length ? 'up' : metrics.periodJobs < prevPeriodJobs.length ? 'down' : 'neutral';
    const trendPercentage = prevPeriodJobs.length > 0 ? Math.abs(((metrics.periodJobs - prevPeriodJobs.length) / prevPeriodJobs.length) * 100).toFixed(0) : '0';
    return { ...metrics, productionTrend, trendPercentage };
  }, [jobs, machines, techniques, kpis, oeeData, dateRange, calculatePeriodMetrics]);

  const biMetrics2 = useMemo(() => {
    if (!comparisonMode || !jobs || !machines || !techniques) return null;
    return calculatePeriodMetrics(dateRange2);
  }, [comparisonMode, jobs, machines, techniques, dateRange2, calculatePeriodMetrics]);

  const handleDrillDown = useCallback((title: string, jobs: BIJob[]) => {
    setDrillDownTitle(title);
    setDrillDownJobs(jobs);
    setDrillDownOpen(true);
  }, []);

  const handleExport = async (format: 'csv' | 'pdf') => {
    // Basic export implementation
  };

  if (isLoading || !biMetrics || !kpis || !oeeData) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <BILoadingSkeleton />
        </div>
      </MainLayout>
    );
  }

  const getPeriodLabel = (filter: string = periodFilter, range: { from: Date; to: Date } = customRange) => {
    if (filter === 'custom') return `${format(range.from, 'dd/MM/yyyy')} - ${format(range.to, 'dd/MM/yyyy')}`;
    return filter === '7d' ? 'Últimos 7 dias' : filter === '90d' ? 'Últimos 90 dias' : 'Últimos 30 dias';
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-8" id="bi-dashboard-content">
        <Breadcrumbs />
        <BIHeader comparisonMode={comparisonMode} setComparisonMode={setComparisonMode} onNavigate={navigate} />
        
        <BIPeriodFilters
          periodFilter={periodFilter} setPeriodFilter={setPeriodFilter}
          customRange={customRange} setCustomRange={setCustomRange}
          isCalendarOpen={isCalendarOpen} setIsCalendarOpen={setIsCalendarOpen}
          periodLabel={getPeriodLabel()} periodJobs={biMetrics.periodJobs}
          comparisonMode={comparisonMode}
          periodFilter2={periodFilter2} setPeriodFilter2={setPeriodFilter2}
          customRange2={customRange2} setCustomRange2={setCustomRange2}
          isCalendarOpen2={isCalendarOpen2} setIsCalendarOpen2={setIsCalendarOpen2}
          periodLabel2={getPeriodLabel(periodFilter2, customRange2)} periodJobs2={biMetrics2?.periodJobs ?? 0}
          studioFilter={studioFilter} setStudioFilter={setStudioFilter}
          collaboratorFilter={collaboratorFilter} setCollaboratorFilter={setCollaboratorFilter}
          machineFilter={machineFilter} setMachineFilter={setMachineFilter}
          studios={['Studio Alfa', 'Studio Beta', 'Studio Gamma']}
          collaborators={(operators || []).map((o) => ({ id: o.user_id, name: o.full_name || 'Sem nome' }))}
          machines={machines.map(m => ({ id: m.id, name: m.name }))}
        />

        {viewMode === 'futuristic' ? (
          <FuturisticBI 
            biMetrics={biMetrics} 
            kpis={kpis} 
            oeeData={oeeData} 
            isLoading={isLoading} 
          />
        ) : (
          <BINormalView
            biMetrics={biMetrics}
            kpis={kpis}
            oeeData={oeeData}
            getPeriodLabel={getPeriodLabel}
            onDrillDown={handleDrillDown}
          />
        )}

        <DrillDownDialog
          open={drillDownOpen}
          onOpenChange={setDrillDownOpen}
          title={drillDownTitle}
          jobs={drillDownJobs as unknown as Parameters<typeof DrillDownDialog>[0]['jobs']}
          onExport={handleExport}
        />
      </div>
    </MainLayout>
  );
}
