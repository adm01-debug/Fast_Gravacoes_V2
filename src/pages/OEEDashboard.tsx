import { useState, Suspense, useMemo, memo, useCallback, useEffect } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Clock,
  Gauge,
  Target,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Shield,
  ShieldCheck,
  ZapOff,
  Settings2,
  Leaf,
  Droplets,
  Zap,
  Sparkles,
  FileDown,
  ArrowRight,
  Calculator,
  Lightbulb,
  ArrowUpRight,
  Play,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Bookmark,
  Save,
  Trash2
} from 'lucide-react';
import { useOEE, WORLD_CLASS_OEE, getOEEColor, useOEEAlerts, useProductionLosses } from '@/features/production';
import { useOEEDashboardFilters } from '@/features/analytics/hooks/useOEEDashboardFilters';
import { exportOeeCsv, exportOeePdf } from '@/features/analytics/lib/oeeReportExport';
import { STUDIOS, INDUSTRY_BENCHMARKS } from '@/features/analytics/constants/oee';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import { Progress } from '@/components/ui/progress';
import {
  OEEAuditPanel,
  OEEBenchmarkTooltip,
  OEEOverviewTab,
  OEESimulatorPanel,
  OEEStudiosTab,
} from '@/features/analytics';
const OEEGaugeCard = lazyWithRetry(() => import('@/features/analytics/components/oee/OEEGaugeCard').then(m => ({ default: m.OEEGaugeCard })));
import { Skeleton } from '@/components/ui/skeleton';
import { KPITooltip, KPI_DEFINITIONS } from '@/components/ui/kpi-tooltip';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useDashboardPresets, DashboardPreset } from '@/features/admin';

import { KPIPageSkeleton, ChartSkeleton, TableSkeleton } from '@/components/loading';

// Lazy load heavy dashboard components
const OEEMachineTable = lazyWithRetry(() => import('@/features/analytics/components/oee/OEEMachineTable').then(m => ({ default: m.OEEMachineTable })));
const OEETrendChart = lazyWithRetry(() => import('@/features/analytics/components/oee/OEETrendChart').then(m => ({ default: m.OEETrendChart })));
const OEELossesChart = lazyWithRetry(() => import('@/features/analytics/components/oee/OEELossesChart').then(m => ({ default: m.OEELossesChart })));
const OEETechniqueComparison = lazyWithRetry(() => import('@/features/analytics/components/oee/OEETechniqueComparison').then(m => ({ default: m.OEETechniqueComparison })));
const OEEHeatmap = lazyWithRetry(() => import('@/features/analytics/components/oee/OEEHeatmap').then(m => ({ default: m.OEEHeatmap })));
const PredictiveAlerts = lazyWithRetry(() => import('@/features/analytics/components/oee/PredictiveAlerts').then(m => ({ default: m.PredictiveAlerts })));
const ParetoLossesChart = lazyWithRetry(() => import('@/features/analytics/components/oee/ParetoLossesChart').then(m => ({ default: m.ParetoLossesChart })));
const OEELossDrilldown = lazyWithRetry(() => import('@/features/analytics/components/oee/OEELossDrilldown').then(m => ({ default: m.OEELossDrilldown })));
const OEEShiftComparison = lazyWithRetry(() => import('@/features/analytics/components/oee/OEEShiftComparison').then(m => ({ default: m.OEEShiftComparison })));
const OEERecommendations = lazyWithRetry(() => import('@/features/analytics/components/oee/OEERecommendations').then(m => ({ default: m.OEERecommendations })));
const OEERankingGap = lazyWithRetry(() => import('@/features/analytics/components/oee/OEERankingGap').then(m => ({ default: m.OEERankingGap })));
const StudioEfficiencyGrid = lazyWithRetry(() => import('@/features/analytics/components/oee/StudioEfficiencyGrid').then(m => ({ default: m.StudioEfficiencyGrid })));
const MaterialEfficiencyChart = lazyWithRetry(() => import('@/features/analytics/components/oee/MaterialEfficiencyChart').then(m => ({ default: m.MaterialEfficiencyChart })));
const StudioHealthMonitor = lazyWithRetry(() => import('@/features/analytics/components/oee/StudioHealthMonitor').then(m => ({ default: m.StudioHealthMonitor })));
const HyperInsights = lazyWithRetry(() => import('@/features/analytics/components/oee/HyperInsights').then(m => ({ default: m.HyperInsights })));



interface OEEPreset {
  name: string;
  filters: {
    period?: string;
    machineId?: string;
    techniqueId?: string;
    shift?: string;
  };
}

const OEEDashboard = memo(function OEEDashboard() {
  const { t } = useTranslation();
  const {
    period, setPeriod,
    machineId, setMachineId,
    techniqueId, setTechniqueId,
    studioId, setStudioId,
    shift, setShift,
    activeTab, setActiveTab,
    oeeFilters,
    lossFilters,
    handleShare,
  } = useOEEDashboardFilters();

  const [showSimulator, setShowSimulator] = useState(false);
  const [simValues, setSimValues] = useState({ availability: 85, performance: 90, quality: 98 });
  const [presetName, setPresetName] = useState('');
  const { presets, savePreset, deletePreset } = useDashboardPresets('oee');
  const [showConfig, setShowSimulatorLocal] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [industryBenchmark, setIndustryBenchmark] = useState('world_class');
  const { trigger: haptic } = useHapticFeedback();

  const currentBenchmark = INDUSTRY_BENCHMARKS[industryBenchmark];

  const { data, isLoading, downloadReport } = useOEE(parseInt(period, 10), 30, oeeFilters);
  const { losses, isLoading: lossesLoading } = useProductionLosses(undefined, lossFilters);

  const applyPreset = (preset: DashboardPreset) => {
    const p = preset as unknown as OEEPreset;
    if (p.filters.period) setPeriod(p.filters.period);
    if (p.filters.machineId) setMachineId(p.filters.machineId);
    if (p.filters.techniqueId) setTechniqueId(p.filters.techniqueId);
    if (p.filters.shift) setShift(p.filters.shift);
    toast.success(`Filtro "${p.name}" aplicado`);
  };

  const handleSavePreset = () => {
    if (!presetName) return;
    savePreset({ name: presetName, filters: { period, machineId, techniqueId, shift } });
    setPresetName('');
    toast.success('Preset salvo com sucesso');
  };

  const handleDownloadReport = useCallback(async (reportFormat: 'excel' | 'pdf' | 'csv') => {
    if (!data) return;

    if (reportFormat === 'csv') {
      exportOeeCsv(data);
    } else if (reportFormat === 'pdf') {
      await exportOeePdf(data, { period, machineId, techniqueId, shift });
    } else {
      downloadReport(reportFormat);
    }
    toast.success(t('common.reportExported', 'Relatório exportado com sucesso!'));
  }, [data, downloadReport, t, period, machineId, techniqueId, shift]);

  // Activate OEE alerts - and optimize rendering
  useOEEAlerts();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const machinesAtWorldClass = useMemo(() => data?.byMachine.filter(m => m.oee >= WORLD_CLASS_OEE).length ?? 0, [data?.byMachine]);
  const machinesBelowTarget = useMemo(() => data?.byMachine.filter(m => m.oee < 65 && m.totalJobs > 0).length ?? 0, [data?.byMachine]);
  const activeMachinesCount = useMemo(() => data?.byMachine.filter(m => m.totalJobs > 0).length ?? 0, [data?.byMachine]);

  if (isLoading) {
    return (
      <MainLayout>
        <KPIPageSkeleton />
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>{t('oee.loadingError', 'Não foi possível carregar os dados de OEE.')}</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <Helmet>
          <title>OEE Dashboard | FAST GRAVAÇÕES</title>
          <meta name="description" content="Análise de Eficiência Global dos Equipamentos (OEE) e indicadores de performance industrial." />
        </Helmet>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
               <Badge className="bg-primary/20 text-foreground border-primary/30 text-[8px] font-black uppercase tracking-tighter px-1.5 py-0 h-4">Industrial Intelligence</Badge>
               <div className="h-px w-12 bg-primary/20" />
            </div>
            <h1 className="text-display-lg flex items-center gap-3 tracking-tighter">
              <span className="text-primary italic">FAST</span> GRAVAÇÕES - GESTÃO DE GRAVAÇÃO
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-70">
              QUALIDADE + VELOCIDADE
            </p>
          </div>


          <div className="flex flex-wrap items-center gap-2">
            <VoiceButton />
            
            <Button 
              variant="outline" 
              size="sm" 
              aria-label="Compartilhar dashboard"
              onClick={handleShare}
              className="flex gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-transform"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Presets de filtros" className="flex gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-transform">
                  <Bookmark className="h-4 w-4" />
                  <span className="hidden sm:inline">Presets</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-4">
                  <h4 className="font-bold text-sm">Presets do Dashboard</h4>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nome do preset..." 
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" aria-label="Salvar preset" onClick={handleSavePreset} className="h-8 px-3">
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                  <div role="region" aria-label="Presets salvos" tabIndex={0} className="space-y-2 max-h-40 overflow-auto">
                    {presets && presets.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-4 italic">Nenhum preset salvo</p>
                    ) : (
                      presets?.map((preset) => (
                        <div key={preset.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                          <span role="button" tabIndex={0} aria-label={`Aplicar preset ${preset.name}`} className="text-xs font-medium truncate flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" onClick={() => applyPreset(preset)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyPreset(preset); } }}>{preset.name}</span>
                          <Button variant="ghost" size="icon" aria-label={`Excluir preset ${preset.name}`} className="h-6 w-6 text-destructive" onClick={() => deletePreset(preset.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label={t('common.export', 'Exportar')} className="flex gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-transform">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.export', 'Exportar')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownloadReport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadReport('pdf')}>
                  <FileText className="h-4 w-4 mr-2 text-red-500" /> Relatório PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadReport('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-500" /> Dados CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger aria-label={t('common.period', 'Período')} className="w-[100px] sm:w-28 md:w-36 glass-card border-primary/20">
                <SelectValue placeholder={t('common.period', 'Período')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('common.last7Days', '7 dias')}</SelectItem>
                <SelectItem value="14">{t('common.last14Days', '14 dias')}</SelectItem>
                <SelectItem value="30">{t('common.last30Days', '30 dias')}</SelectItem>
                <SelectItem value="60">{t('common.last60Days', '60 dias')}</SelectItem>
                <SelectItem value="90">{t('common.last90Days', '90 dias')}</SelectItem>
                <SelectItem value="180">{t('common.last180Days', '180 dias')}</SelectItem>
                <SelectItem value="365">{t('common.last365Days', '365 dias')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={studioId} onValueChange={setStudioId}>
              <SelectTrigger aria-label="Studio" className="w-[120px] sm:w-36 md:w-52 glass-card border-primary/20">
                <SelectValue placeholder="Studio" />
              </SelectTrigger>
              <SelectContent>
                {STUDIOS.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={techniqueId} onValueChange={setTechniqueId}>
              <SelectTrigger aria-label={t('common.technique', 'Técnica')} className="w-[110px] sm:w-32 md:w-44 glass-card border-primary/20">
                <SelectValue placeholder={t('common.technique', 'Técnica')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allTechniques', 'Todas Técnicas')}</SelectItem>
                {data.byTechnique
                  .filter(tech => {
                    if (studioId === 'all') return true;
                    const studio = STUDIOS.find(s => s.id === studioId);
                    return !!studio?.techniques?.includes(tech.techniqueId) || tech.techniqueName.toLowerCase().includes(studio?.id.split('_')[0] || '');
                  })
                  .map(tech => (
                  <SelectItem key={tech.techniqueId} value={tech.techniqueId}>{tech.techniqueName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger aria-label={t('common.machine', 'Máquina')} className="w-[110px] sm:w-32 md:w-44 glass-card border-primary/20">
                <SelectValue placeholder={t('common.machine', 'Máquina')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allMachines', 'Todas Máquinas')}</SelectItem>
                {data.byMachine
                  .filter(m => techniqueId === 'all' || m.techniqueId === techniqueId)
                  .map(m => (
                    <SelectItem key={m.machineId} value={m.machineId}>{m.machineName}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger aria-label="Turno" className="w-[100px] sm:w-28 md:w-36 glass-card border-primary/20">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Turnos</SelectItem>
                <SelectItem value="1">Turno 1 (Manhã)</SelectItem>
                <SelectItem value="2">Turno 2 (Tarde)</SelectItem>
                <SelectItem value="3">Turno 3 (Noite)</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </div>

        {/* AI Performance Insight Banner */}
        <Card className="bg-black/40 border-primary/30 backdrop-blur-2xl relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="h-32 w-32 text-primary" />
          </div>
          <CardContent className="py-6 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                 <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse uppercase text-[10px] font-black">Studio Intelligence 10/10</Badge>
                 <h2 className="text-xl font-bold tracking-tight">Análise Preditiva FAST - {data.overallOEE.toFixed(1)}%</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.overallOEE >= 85 
                  ? "Sua operação atingiu o nível de excelência industrial. A sincronia entre Studios e Materiais está otimizada." 
                  : `Detectamos gargalos no Studio ${data.byStudio[0]?.studioName || 'Principal'}. A performance com ${data.byMaterial[0]?.material || 'materiais variados'} pode ser melhorada em ${(85 - data.overallOEE).toFixed(1)}% para atingir a meta global.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 bg-background/40 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
              <div className="text-center px-4 border-r border-border/50">
                 <p className="text-2xl font-black text-primary">{data.overallAvailability.toFixed(0)}%</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('oee.availabilityShort', 'Disponib.')}</p>
              </div>
              <div className="text-center px-4 border-r border-border/50">
                 <p className="text-2xl font-black text-indicator-info">{data.overallPerformance.toFixed(0)}%</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('oee.performanceShort', 'Perform.')}</p>
              </div>
              <div className="text-center px-4">
                 <p className="text-2xl font-black text-accent-purple">{data.overallQuality.toFixed(0)}%</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('common.quality', 'Qualidade')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Predictive Maintenance & Health Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionErrorBoundary compact><Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded-xl" />}>
            <PredictiveAlerts alerts={data.maintenanceAlerts} />
          </Suspense></SectionErrorBoundary>
          <SectionErrorBoundary compact><Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded-xl" />}>
            <OEERecommendations data={data} />
          </Suspense></SectionErrorBoundary>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-indicator-info bg-indicator-info/10">
              <CardHeader className="p-4 pb-0">
                <Badge variant="outline" className="text-[9px] font-black uppercase border-indicator-info/30 text-indicator-info">Hyper 10/10</Badge>
              </CardHeader>
              <CardContent className="p-4 pt-2 flex gap-4">
                <div className="h-10 w-10 rounded-full bg-indicator-info/20 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-indicator-info" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Status da Linha</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    Operação estabilizada com {machinesAtWorldClass} máquinas em modo de alta performance.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indicator-warning bg-indicator-warning/10">
              <CardContent className="p-4 flex gap-4">
                <div className="h-10 w-10 rounded-full bg-indicator-warning/20 flex items-center justify-center shrink-0">
                  <Lightbulb className="h-5 w-5 text-indicator-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{data.overallPerformance < 85 ? t('oee.performanceBottleneck', 'Gargalo de Performance') : 'Otimização Ativa'}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {data.overallPerformance < 85 ? `A técnica ${data.byTechnique[0]?.techniqueName} apresenta perdas.` : 'Performance estabilizada.'}
                  </p>
                  <Button variant="link" size="sm" onClick={() => setActiveTab('losses')} className="p-0 h-auto text-indicator-warning text-[10px] font-black uppercase mt-1">
                    {t('common.viewDetails', 'Ver Detalhes')} <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indicator-info bg-indicator-info/5">
              <CardContent className="p-4 flex gap-4">
                <div className="h-10 w-10 rounded-full bg-indicator-info/10 flex items-center justify-center shrink-0">
                  <Calculator className="h-5 w-5 text-indicator-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">Audit & Simulação</h3>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowAudit(!showAudit); haptic('light'); }} className="h-7 text-[9px] font-black uppercase border-indicator-info/20 hover:bg-indicator-info/10 flex-1">
                      {showAudit ? 'Fechar Audit' : 'Audit OEE'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowSimulator(!showSimulator); haptic('light'); }} className="h-7 text-[9px] font-black uppercase border-indicator-info/20 hover:bg-indicator-info/10 flex-1">
                      {showSimulator ? 'Fechar Sim' : 'Simular'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <OEEBenchmarkTooltip data={data} />
          </div>
        </div>

        {showAudit && (
          <OEEAuditPanel data={data} machineId={machineId} industryBenchmark={industryBenchmark} onBenchmarkChange={setIndustryBenchmark} currentBenchmark={currentBenchmark} />
        )}

        {showSimulator && (
          <OEESimulatorPanel simValues={simValues} onSimValuesChange={setSimValues} overallOEE={data.overallOEE} />
        )}

        <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
          <HyperInsights />
        </Suspense></SectionErrorBoundary>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-background/50 border border-primary/20 p-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-2 text-xs font-bold uppercase tracking-tight">
              <LayoutDashboard className="h-4 w-4" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="studios" className="gap-2 text-xs font-bold uppercase tracking-tight">
              <Shield className="h-4 w-4" /> Studios & Saúde
            </TabsTrigger>
            <TabsTrigger value="losses" className="gap-2 text-xs font-bold uppercase tracking-tight">
              <AlertTriangle className="h-4 w-4" /> Análise de Perdas
            </TabsTrigger>
            <TabsTrigger value="machines" className="gap-2 text-xs font-bold uppercase tracking-tight">
              <Settings2 className="h-4 w-4" /> Ranking & Eficiência
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="gap-2 text-xs font-bold uppercase tracking-tight">
              <BarChart3 className="h-4 w-4" /> Produtividade
            </TabsTrigger>
            <TabsTrigger value="shifts" className="gap-2 text-xs font-bold uppercase tracking-tight">
              <Clock className="h-4 w-4" /> Comparativo de Turnos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 focus-visible:outline-none outline-none">
            <OEEOverviewTab data={data} machineId={machineId} currentBenchmark={currentBenchmark} />
          </TabsContent>

          <TabsContent value="studios" className="space-y-6 focus-visible:outline-none outline-none">
            <OEEStudiosTab data={data} machineId={machineId} machinesAtWorldClass={machinesAtWorldClass} machinesBelowTarget={machinesBelowTarget} activeMachinesCount={activeMachinesCount} />
          </TabsContent>


          <TabsContent value="losses" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}><OEELossDrilldown filters={lossFilters} /></Suspense></SectionErrorBoundary>
                <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}><OEELossesChart availabilityLosses={data.availabilityLosses} performanceLosses={data.performanceLosses} qualityLosses={data.qualityLosses} overallOEE={data.overallOEE} /></Suspense></SectionErrorBoundary>
              </div>
              <div className="space-y-6">
                <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}><ParetoLossesChart losses={losses || []} /></Suspense></SectionErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="machines" className="space-y-6">
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
              <OEERankingGap machines={data.byMachine} techniques={data.byTechnique} targetOEE={currentBenchmark.target} />
            </Suspense></SectionErrorBoundary>
            <SectionErrorBoundary compact><Suspense fallback={<TableSkeleton />}><OEEMachineTable machines={data.byMachine} /></Suspense></SectionErrorBoundary>
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}><OEETechniqueComparison techniques={data.byTechnique} worldClassBenchmark={data.worldClassBenchmark} /></Suspense></SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}><OEETrendChart data={data.trendData} worldClassBenchmark={data.worldClassBenchmark} comparison={data.comparison} /></Suspense></SectionErrorBoundary>
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}><OEEHeatmap data={data.heatmapData} /></Suspense></SectionErrorBoundary>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-success/5 border-success/20"><CardContent className="pt-6"><h3 className="font-bold">Resíduos Evitados</h3><p className="text-3xl font-black text-success">{(data.overallQuality * 100).toFixed(0)} kg</p></CardContent></Card>
              <Card className="bg-indicator-info/5 border-indicator-info/20"><CardContent className="pt-6"><h3 className="font-bold">Otimização</h3><p className="text-3xl font-black text-indicator-info">{(data.overallPerformance * 1.2).toFixed(1)}%</p></CardContent></Card>
              <Card className="bg-warning/5 border-warning/20"><CardContent className="pt-6"><h3 className="font-bold">Eficiência Energética</h3><p className="text-3xl font-black text-warning">{(data.overallAvailability * 0.9).toFixed(1)}%</p></CardContent></Card>
            </div>
          </TabsContent>
          
          <TabsContent value="shifts" className="space-y-6">
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
              <OEEShiftComparison shifts={data.byShift || []} />
            </Suspense></SectionErrorBoundary>
          </TabsContent>
        </Tabs>

        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Benchmarks de OEE na Indústria</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                  <div><span className="text-indicator-success font-medium">≥85%</span> World Class</div>
                  <div><span className="text-success font-medium">75-84%</span> Excelente</div>
                  <div><span className="text-indicator-warning font-medium">65-74%</span> Bom</div>
                  <div><span className="text-priority-high font-medium">50-64%</span> Aceitável</div>
                  <div><span className="text-primary font-medium">&lt;50%</span> Crítico</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
});

export default OEEDashboard;
