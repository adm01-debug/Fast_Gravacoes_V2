import { useMemo, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, Activity, Gauge, Target,
  CheckCircle, PieChart, LineChart, Printer,
  Users, Wrench, ShieldAlert, Zap, Download, FileText, FileSpreadsheet, Package, Timer, ArrowUpRight, RefreshCcw, Clock, TrendingDown
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from '@/lib/recharts';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOperatorProductivity } from '@/features/production';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DrillDownDialog } from './drilldown/DrillDownDialog';
import { LossesTable } from './losses/LossesTable';
import { DelaysAnalysis } from './delays/DelaysAnalysis';
import { FuturisticStatCard } from './FuturisticStatCard';
import { useBIExport } from '@/features/admin';
import { BITooltip } from './BITooltip';
import { BIEmptyState } from './BIEmptyState';
import { BILoadingSkeleton } from './BILoadingSkeleton';
const BIAIInsights = lazy(() => import('./BIAIInsights').then(m => ({ default: m.BIAIInsights })));
import { BIPredictiveROI } from './BIPredictiveROI';
import { CHART_COLORS, GRADIENTS } from '@/constants/biConstants';

import { BIJob, BIMetrics, BIProps } from './types';
import { BIMetrics as BIPredictiveROIMetrics } from '@/features/analytics/types';
import { Job } from '@/types/job';

type MachineUtil = NonNullable<BIMetrics['machineUtilization']>[number];
type StatusSlice = BIMetrics['statusDistribution'][number];

export function FuturisticBI({ biMetrics, kpis, oeeData, isLoading }: BIProps) {
  const navigate = useNavigate();
  const { operators } = useOperatorProductivity(30);
  const { stats: tpmStats } = useTPM();
  const { isExporting, handleExport: baseHandleExport } = useBIExport(biMetrics);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setLastUpdated(new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const jobsWithLosses = useMemo(() => {
    if (!biMetrics.periodJobsList) return [];
    return (biMetrics.periodJobsList as BIJob[])
      .filter((j: BIJob) => (j.lost_pieces || 0) > 0)
      .sort((a: BIJob, b: BIJob) => (b.lost_pieces || 0) - (a.lost_pieces || 0))
      .slice(0, 10);
  }, [biMetrics.periodJobsList]);

  const delayedJobsList = useMemo(() => {
    if (!biMetrics.periodJobsList) return [];
    return (biMetrics.periodJobsList as BIJob[])
      .filter((j: BIJob) => j.status === 'delayed')
      .slice(0, 10);
  }, [biMetrics.periodJobsList]);

  const handleExport = useCallback((format: 'csv' | 'pdf', type: string) => {
    baseHandleExport(format, type, { jobsWithLosses, delayedJobsList });
  }, [baseHandleExport, jobsWithLosses, delayedJobsList]);

  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownJobs, setDrillDownJobs] = useState<Job[]>([]);
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({ produced: true, lost: true });

  const toggleSeries = (key: string) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDrillDown = (title: string, segment: string) => {
    setDrillDownTitle(title);
    if (biMetrics.periodJobsList) {
      const filtered = (biMetrics.periodJobsList as BIJob[]).filter((j: BIJob) => {
        if (segment === 'all') return true;
        const s = segment.toLowerCase();
        return (
          j.status === s ||
          j.machine_id === segment ||
          j.technique_id === segment ||
          (s === 'lost' && (j.lost_pieces || 0) > 0) ||
          (s === 'delayed' && j.status === 'delayed') ||
          (s === 'revenue' && j.status === 'finished') ||
          (s === 'queue' && (j.status === 'scheduled' || j.status === 'queue')) ||
          (s === 'production' && j.status === 'production') ||
          (segment.includes('Studio') && (
            (segment === 'Studio Alfa' && j.technique_id?.includes('Laser')) ||
            (segment === 'Studio Beta' && j.technique_id?.includes('UV')) ||
            (segment === 'Studio Gamma' && !j.technique_id?.includes('Laser') && !j.technique_id?.includes('UV'))
          ))
        );
      }).map((j: BIJob) => {
        const total = (j.produced_quantity || j.quantity || 1) + (j.lost_pieces || 0);
        return {
          ...j,
          order_number: j.order_number || `OS-${j.id.slice(0, 5)}`,
          product: j.product_name || 'Produto',
          produced_quantity: j.produced_quantity || 0,
          lost_pieces: j.lost_pieces || 0,
          efficiency: total > 0 ? (((total - (j.lost_pieces || 0)) / total) * 100).toFixed(1) + '%' : '--'
        };
      });
      setDrillDownJobs(filtered as unknown as Job[]);
    } else {
      setDrillDownJobs([]);
    }
    setDrillDownOpen(true);
  };

  const studioData = useMemo(() => {
    if (!biMetrics.machineUtilization) return [];
    const machineGroups: Record<string, MachineUtil[]> = {};
    (biMetrics.machineUtilization || []).forEach((m: MachineUtil) => {
      const studioName = m.technique.includes('Laser') ? 'Studio Alfa' :
                        m.technique.includes('UV') ? 'Studio Beta' :
                        'Studio Gamma';
      if (!machineGroups[studioName]) machineGroups[studioName] = [];
      machineGroups[studioName].push(m);
    });
    return Object.entries(machineGroups).map(([name, machines]: [string, MachineUtil[]]) => {
      const totalJobs = (machines || []).reduce((sum: number, m: MachineUtil) => sum + (m.totalJobs || 0), 0);
      const avgUtilization = (machines || []).reduce((sum: number, m: MachineUtil) => sum + (m.utilization || 0), 0) / (machines?.length || 1);
      return {
        name,
        jobs: totalJobs,
        utilization: avgUtilization,
        color: name === 'Studio Alfa' ? CHART_COLORS.primary : name === 'Studio Beta' ? CHART_COLORS.purple : CHART_COLORS.cyan
      };
    }).sort((a, b) => b.jobs - a.jobs);
  }, [biMetrics.machineUtilization]);

  const balanceMetrics = useMemo(() => {
    if (studioData.length < 2) return { score: 100, status: 'Equilibrado', color: 'text-success' };
    const values = studioData.map(s => s.jobs);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const diff = max - min;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const deviation = avg > 0 ? (diff / avg) * 100 : 0;
    let status = 'Equilibrado';
    let color = 'text-success';
    if (deviation > 50) { status = 'Desequilibrado'; color = 'text-destructive'; }
    else if (deviation > 25) { status = 'Atenção'; color = 'text-warning'; }
    return { score: Math.max(0, 100 - deviation), status, color, deviation };
  }, [studioData]);

  if (isLoading) {
    return (
      <div className="py-12 space-y-8">
        <BILoadingSkeleton />
      </div>
    );
  }

  if (!biMetrics.periodJobsList || biMetrics.periodJobsList.length === 0) {
    return (
      <div className="py-12 space-y-8">
        <BIEmptyState />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <FuturisticStatCard
          title="Pedidos a Fazer"
          value={biMetrics.toDoJobs || 0}
          subtitle="Backlog de Ordens"
          icon={Package}
          gradient={GRADIENTS.purple}
          glowColor="purple"
          onExport={(format) => handleExport(format, 'Pedidos_A_Fazer')}
          onClick={() => handleDrillDown('PEDIDOS AGUARDANDO', 'queue')}
        />
        <FuturisticStatCard
          title="Em Produção"
          value={kpis.inProgressJobs}
          subtitle="Live Status"
          icon={Zap}
          gradient={GRADIENTS.success}
          glowColor="success"
          onExport={(format) => handleExport(format, 'Producao_Atual')}
          onClick={() => handleDrillDown('PEDIDOS EM PRODUÇÃO', 'production')}
        />
        <FuturisticStatCard
          title="Atrasos Críticos"
          value={kpis.delayedJobs}
          subtitle="Risco de Lead Time"
          icon={ShieldAlert}
          variant="danger"
          gradient={GRADIENTS.danger}
          glowColor="danger"
          onExport={(format) => handleExport(format, 'Atrasos_Criticos')}
          onClick={() => handleDrillDown('PEDIDOS ATRASADOS', 'delayed')}
        />
        <FuturisticStatCard
          title="Taxa de Perda"
          value={`${(biMetrics.periodLossRate || 0).toFixed(2)}%`}
          subtitle="Quality Yield"
          icon={TrendingUp}
          gradient={GRADIENTS.primary}
          glowColor="primary"
          onExport={(format) => handleExport(format, 'Taxa_Perda')}
          onClick={() => handleDrillDown('TAXA DE PERDA', 'lost')}
        />
        <FuturisticStatCard
          title="Balanceamento"
          value={`${balanceMetrics.score.toFixed(0)}%`}
          subtitle={balanceMetrics.status}
          icon={RefreshCcw}
          variant={balanceMetrics.score < 70 ? 'danger' : balanceMetrics.score < 90 ? 'warning' : 'success'}
          gradient={balanceMetrics.score < 70 ? GRADIENTS.danger : balanceMetrics.score < 90 ? GRADIENTS.warning : GRADIENTS.success}
          glowColor={balanceMetrics.score < 70 ? 'danger' : balanceMetrics.score < 90 ? 'warning' : 'success'}
          onExport={(format) => handleExport(format, 'Load_Balancing')}
          onClick={() => navigate('/admin/telemetria')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-black/40 border-primary/20 backdrop-blur-xl group hover:border-primary/40 transition-all duration-500 overflow-hidden relative">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-title tracking-wider uppercase">Fluxo de Produção</span>
            </CardTitle>
            <div className="flex items-center gap-4 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => toggleSeries('produced')} className={cn("flex items-center gap-2 transition-all", !visibleSeries.produced && "opacity-30 grayscale")}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }} />
                      <span className="text-[10px] font-bold text-white/70">PRODUZIDO</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Visibilidade Produção</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => toggleSeries('lost')} className={cn("flex items-center gap-2 transition-all", !visibleSeries.lost && "opacity-30 grayscale")}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.danger }} />
                      <span className="text-[10px] font-bold text-white/70">PERDAS</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Visibilidade Perdas</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={biMetrics.dailyTrend}>
                <defs>
                  <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.6}/>
                    <stop offset="40%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/>
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.6}/>
                    <stop offset="40%" stopColor={CHART_COLORS.danger} stopOpacity={0.2}/>
                    <stop offset="100%" stopColor={CHART_COLORS.danger} stopOpacity={0}/>
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600 }}
                />
                <RechartsTooltip
                  content={<BITooltip showPercentage />}
                  cursor={{ stroke: 'rgba(14, 165, 233, 0.3)', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                {visibleSeries.produced && (
                  <Area
                    type="monotone"
                    dataKey="produced"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorProduced)"
                    animationDuration={2500}
                    strokeLinecap="round"
                    filter="url(#glow)"
                    activeDot={{ r: 8, stroke: CHART_COLORS.primary, strokeWidth: 3, fill: '#fff' }}
                  />
                )}
                {visibleSeries.lost && (
                  <Area
                    type="monotone"
                    dataKey="lost"
                    stroke={CHART_COLORS.danger}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorLost)"
                    animationDuration={2500}
                    strokeLinecap="round"
                    filter="url(#glow)"
                    activeDot={{ r: 6, stroke: CHART_COLORS.danger, strokeWidth: 3, fill: '#fff' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-primary/20 backdrop-blur-xl group hover:border-primary/40 transition-all duration-500 overflow-hidden relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <PieChart className="h-5 w-5 text-primary" />
              <span className="text-title tracking-wider uppercase">Distribuição de Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie data={biMetrics.statusDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {biMetrics.statusDistribution.map((entry: StatusSlice, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip content={<BITooltip />} />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LossesTable
            jobs={jobsWithLosses as unknown as Job[]}
            onExport={handleExport}
            onShowDetails={(job) => handleDrillDown(`PERDAS DETALHADAS: ${job.order_number || job.id}`, 'lost')}
          />
        </div>
        <Suspense fallback={<div className="h-full bg-black/20 animate-pulse rounded-2xl" />}>
          <BIAIInsights biMetrics={biMetrics} oeeData={oeeData} />
        </Suspense>
        <BIPredictiveROI biMetrics={biMetrics as unknown as BIPredictiveROIMetrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black/40 border-primary/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-primary" />
              <span className="text-title tracking-wider uppercase">Eficiência Geral</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[
                { subject: 'OEE', A: oeeData.overallOEE },
                { subject: 'Disp.', A: oeeData.overallAvailability },
                { subject: 'Perf.', A: oeeData.overallPerformance },
                { subject: 'Qual.', A: oeeData.overallQuality },
                { subject: 'Meta', A: 90 },
              ]}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <Radar name="Atual" dataKey="A" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.6} />
                <RechartsTooltip content={<BITooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<BILoadingSkeleton />}>
        <BIAIInsights biMetrics={biMetrics} oeeData={oeeData} />
      </Suspense>
      <DrillDownDialog open={drillDownOpen} onOpenChange={setDrillDownOpen} title={drillDownTitle} jobs={drillDownJobs} onExport={(format) => handleExport(format, `DrillDown_${drillDownTitle}`)} />
    </motion.div>
  );
}
