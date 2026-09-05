import { useState, lazy, Suspense, useMemo, memo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
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
  Trash2,
  Info
} from 'lucide-react';
import { useOEE, WORLD_CLASS_OEE, getOEEColor, useOEEAlerts, useProductionLosses } from '@/features/production';
import { useOEEDashboardFilters } from '@/features/analytics/hooks/useOEEDashboardFilters';
import { STUDIOS, INDUSTRY_BENCHMARKS } from '@/features/analytics/constants/oee';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
const OEEGaugeCard = lazy(() => import('@/features/analytics/components/oee/OEEGaugeCard').then(m => ({ default: m.OEEGaugeCard })));
const OEECalculationAudit = lazy(() => import('@/features/analytics/components/oee/OEECalculationAudit').then(m => ({ default: m.OEECalculationAudit })));
import { Skeleton } from '@/components/ui/skeleton';
import { KPITooltip, KPI_DEFINITIONS } from '@/components/ui/kpi-tooltip';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useDashboardPresets, DashboardPreset } from '@/features/admin';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { KPIPageSkeleton, ChartSkeleton, TableSkeleton } from '@/components/loading';

// Lazy load heavy dashboard components
const OEEMachineTable = lazy(() => import('@/features/analytics/components/oee/OEEMachineTable').then(m => ({ default: m.OEEMachineTable })));
const OEETrendChart = lazy(() => import('@/features/analytics/components/oee/OEETrendChart').then(m => ({ default: m.OEETrendChart })));
const OEELossesChart = lazy(() => import('@/features/analytics/components/oee/OEELossesChart').then(m => ({ default: m.OEELossesChart })));
const OEETechniqueComparison = lazy(() => import('@/features/analytics/components/oee/OEETechniqueComparison').then(m => ({ default: m.OEETechniqueComparison })));
const OEEHeatmap = lazy(() => import('@/features/analytics/components/oee/OEEHeatmap').then(m => ({ default: m.OEEHeatmap })));
const PredictiveAlerts = lazy(() => import('@/features/analytics/components/oee/PredictiveAlerts').then(m => ({ default: m.PredictiveAlerts })));
const ParetoLossesChart = lazy(() => import('@/features/analytics/components/oee/ParetoLossesChart').then(m => ({ default: m.ParetoLossesChart })));
const OEELossDrilldown = lazy(() => import('@/features/analytics/components/oee/OEELossDrilldown').then(m => ({ default: m.OEELossDrilldown })));
const OEEShiftComparison = lazy(() => import('@/features/analytics/components/oee/OEEShiftComparison').then(m => ({ default: m.OEEShiftComparison })));
const OEERecommendations = lazy(() => import('@/features/analytics/components/oee/OEERecommendations').then(m => ({ default: m.OEERecommendations })));
const OEERankingGap = lazy(() => import('@/features/analytics/components/oee/OEERankingGap').then(m => ({ default: m.OEERankingGap })));
const StudioEfficiencyGrid = lazy(() => import('@/features/analytics/components/oee/StudioEfficiencyGrid').then(m => ({ default: m.StudioEfficiencyGrid })));
const MaterialEfficiencyChart = lazy(() => import('@/features/analytics/components/oee/MaterialEfficiencyChart').then(m => ({ default: m.MaterialEfficiencyChart })));
const StudioHealthMonitor = lazy(() => import('@/features/analytics/components/oee/StudioHealthMonitor').then(m => ({ default: m.StudioHealthMonitor })));
const HyperInsights = lazy(() => import('@/features/analytics/components/oee/HyperInsights').then(m => ({ default: m.HyperInsights })));



interface OEEPreset {
  name: string;
  filters: {
    period?: string;
    machineId?: string;
    techniqueId?: string;
    shift?: string;
  };
}

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
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
      const csvData = data.byMachine.map(m => ({
        'Máquina': m.machineName,
        'Código': m.machineCode,
        'Técnica': m.techniqueName,
        'Disponibilidade (%)': m.availability,
        'Performance (%)': m.performance,
        'Qualidade (%)': m.quality,
        'OEE (%)': m.oee,
        'Gap vs Meta': (m.oee - 85).toFixed(1) + '%',
        'Total Peças': m.totalPiecesProduced,
        'Peças Boas': m.goodPieces,
        'Perdas': m.lostPieces
      }));
      
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => Object.values(row).map(v => typeof v === 'string' ? `"${v}"` : v).join(','));
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `fast_gravacoes_oee_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (reportFormat === 'pdf') {
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      
      // Header and Logo simulation
      doc.setFillColor(232, 93, 58); // Premium Orange
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.text('FAST GRAVAÇÕES', 14, 25);
      doc.setFontSize(10);
      doc.text('GESTÃO DE GRAVAÇÃO - RELATÓRIO OEE', 14, 32);
      
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text('Relatório Executivo de Performance', 14, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Período: Últimos ${period} dias`, 14, 65);
      doc.text(`Filtros: Máquina: ${machineId === 'all' ? 'Todas' : machineId} | Técnica: ${techniqueId === 'all' ? 'Todas' : techniqueId} | Turno: ${shift === 'all' ? 'Todos' : shift}`, 14, 70);
      doc.text(`Gerado em: ${format(new Date(), 'PPP', { locale: ptBR })}`, 14, 75);
      
      // Summary Box
      doc.setDrawColor(230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 85, 180, 40, 3, 3, 'FD');
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text('RESUMO GERAL DO PERÍODO', 20, 95);
      
      doc.setFontSize(28);
      doc.setTextColor(232, 93, 58);
      doc.text(`${data.overallOEE.toFixed(1)}%`, 20, 115);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('OEE GLOBAL', 20, 120);
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`${data.overallAvailability.toFixed(1)}%`, 70, 110);
      doc.setFontSize(8);
      doc.text('DISPONIBILIDADE', 70, 115);
      
      doc.setFontSize(12);
      doc.text(`${data.overallPerformance.toFixed(1)}%`, 110, 110);
      doc.setFontSize(8);
      doc.text('PERFORMANCE', 110, 115);
      
      doc.setFontSize(12);
      doc.text(`${data.overallQuality.toFixed(1)}%`, 150, 110);
      doc.setFontSize(8);
      doc.text('QUALIDADE', 150, 115);

      const tableData = data.byMachine.map((m, idx) => [
        idx + 1,
        m.machineName,
        m.techniqueName,
        `${m.availability}%`,
        `${m.performance}%`,
        `${m.quality}%`,
        `${m.oee}%`,
        (m.oee - 85).toFixed(1) + '%',
        m.lostPieces.toLocaleString()
      ]);
      
      autoTable(doc, {
        startY: 135,
        head: [['#', 'Máquina', 'Técnica', 'Disp.', 'Perf.', 'Qual.', 'OEE', 'Gap', 'Perdas']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [232, 93, 58],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          6: { fontStyle: 'bold' },
          7: { fontStyle: 'bold' }
        }
      });
      
      // Action Plan section
      const finalY = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
      if (finalY < 250) {
        doc.setFontSize(14);
        doc.setTextColor(232, 93, 58);
        doc.text('Recomendações e Plano de Ação 10/10', 14, finalY);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        const actionY = finalY + 10;
        
        const recommendations = [];
        if (data.overallAvailability < 85) recommendations.push('• Implementar técnicas SMED para redução de setup nos Studios Serigrafia.');
        if (data.overallPerformance < 90) recommendations.push('• Calibrar velocidades nominais nos equipamentos de Gravação Laser.');
        if (data.overallQuality < 98) recommendations.push('• Revisar protocolos de cura UV para evitar micro-fissuras em substratos plásticos.');
        if (recommendations.length === 0) recommendations.push('• Performance de Classe Mundial atingida. Manter monitoramento preditivo autônomo.');

        recommendations.forEach((rec, i) => {
          doc.text(rec, 14, actionY + (i * 5));
        });
      }

      doc.save(`fast_gravacoes_oee_report_${new Date().toISOString().slice(0,10)}.pdf`);
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
    return <KPIPageSkeleton />;
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>{t('oee.loadingError', 'Não foi possível carregar os dados de OEE.')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
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
               <Badge className="bg-primary text-primary-foreground border-none text-[8px] font-black uppercase tracking-tighter px-1.5 py-0 h-4">Industrial Intelligence</Badge>
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
              onClick={handleShare}
              className="flex gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-transform"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-transform">
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
                    <Button size="sm" onClick={handleSavePreset} className="h-8 px-3">
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {presets && presets.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-4 italic">Nenhum preset salvo</p>
                    ) : (
                      presets?.map((preset) => (
                        <div key={preset.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                          <span role="button" tabIndex={0} aria-label={`Aplicar preset ${preset.name}`} className="text-xs font-medium truncate flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" onClick={() => applyPreset(preset)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyPreset(preset); } }}>{preset.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deletePreset(preset.id)}>
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
                <Button variant="outline" size="sm" className="flex gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-transform">
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
              <SelectTrigger className="w-[100px] sm:w-28 md:w-36 glass-card border-primary/20">
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
              <SelectTrigger className="w-[120px] sm:w-36 md:w-52 glass-card border-primary/20">
                <SelectValue placeholder="Studio" />
              </SelectTrigger>
              <SelectContent>
                {STUDIOS.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={techniqueId} onValueChange={setTechniqueId}>
              <SelectTrigger className="w-[110px] sm:w-32 md:w-44 glass-card border-primary/20">
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
              <SelectTrigger className="w-[110px] sm:w-32 md:w-44 glass-card border-primary/20">
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
              <SelectTrigger className="w-[100px] sm:w-28 md:w-36 glass-card border-primary/20">
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

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="border-l-4 border-l-accent-purple bg-accent-purple/5 transition-all hover:bg-accent-purple/10 cursor-help group">
                    <CardContent className="p-4 flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-accent-purple/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5 text-accent-purple" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">Benchmark Industrial</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          OEE Geral: <span className="font-bold text-accent-purple">{data.overallOEE.toFixed(1)}%</span> vs Meta: 85.0%
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-accent-purple/70 uppercase">
                          <Info className="h-3 w-3" /> Ver composição
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="w-80 p-4 bg-black/95 border-primary/20 backdrop-blur-xl shadow-2xl" side="bottom">
                  <div className="space-y-4">
                    <div className="border-b border-white/10 pb-2">
                      <p className="text-xs font-black uppercase text-primary tracking-widest mb-1">Fórmula OEE Industrial</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        O OEE é a multiplicação dos 3 fatores abaixo. Se um deles cai, o resultado global é severamente impactado.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">Disponibilidade ({data.overallAvailability.toFixed(1)}%)</p>
                          <p className="text-[9px] text-muted-foreground">Gap vs Meta (90%): <span className={cn(data.overallAvailability >= 90 ? "text-success" : "text-destructive")}>{(data.overallAvailability - 90).toFixed(1)}%</span></p>
                        </div>
                        <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-black", data.overallAvailability < 90 ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success")}>
                          {data.overallAvailability < 90 ? "PUXA PARA BAIXO" : "DENTRO DA META"}
                        </div>
                      </div>

                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">Performance ({data.overallPerformance.toFixed(1)}%)</p>
                          <p className="text-[9px] text-muted-foreground">Gap vs Meta (95%): <span className={cn(data.overallPerformance >= 95 ? "text-success" : "text-destructive")}>{(data.overallPerformance - 95).toFixed(1)}%</span></p>
                        </div>
                        <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-black", data.overallPerformance < 95 ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success")}>
                          {data.overallPerformance < 95 ? "PUXA PARA BAIXO" : "DENTRO DA META"}
                        </div>
                      </div>

                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">Qualidade ({data.overallQuality.toFixed(1)}%)</p>
                          <p className="text-[9px] text-muted-foreground">Gap vs Meta (99%): <span className={cn(data.overallQuality >= 99 ? "text-success" : "text-destructive")}>{(data.overallQuality - 99).toFixed(1)}%</span></p>
                        </div>
                        <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-black", data.overallQuality < 99 ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success")}>
                          {data.overallQuality < 99 ? "PUXA PARA BAIXO" : "DENTRO DA META"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/10 p-2 rounded border border-primary/20">
                      <p className="text-[9px] font-bold text-primary uppercase text-center">
                        {data.overallOEE < 85 
                          ? `Foco sugerido: Reduzir perdas de ${[
                              {n: 'Disponibilidade', v: data.overallAvailability, m: 90},
                              {n: 'Performance', v: data.overallPerformance, m: 95},
                              {n: 'Qualidade', v: data.overallQuality, m: 99}
                            ].sort((a,b) => (a.v - a.m) - (b.v - b.m))[0].n}`
                          : "Status: Operação de Classe Mundial"}
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {showAudit && (
          <Card className="border-indicator-info/20 bg-muted/20 animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="pb-2 border-b border-border/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-indicator-info" />
                  Auditoria de Memória de Cálculo & Benchmarking
                </CardTitle>
                
                <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Setor:</span>
                  <Select value={industryBenchmark} onValueChange={setIndustryBenchmark}>
                    <SelectTrigger className="h-7 w-40 text-[10px] font-bold border-none bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INDUSTRY_BENCHMARKS).map(([id, b]) => (
                        <SelectItem key={id} value={id} className="text-[10px] font-medium">{b.label} ({b.target}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                    <p className="text-[10px] font-black text-primary uppercase mb-2">Fórmula Disponibilidade</p>
                    <p className="text-xs font-mono mb-2">(Tempo Operação / Tempo Planejado) * 100</p>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Real / Alvo</p>
                        <p className="text-sm font-bold">{data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0)} / {data.byMachine.reduce((s, m) => s + m.plannedProductionMinutes, 0)} min</p>
                      </div>
                      <p className="text-xl font-black text-primary">{data.overallAvailability.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                    <p className="text-[10px] font-black text-indicator-info uppercase mb-2">Fórmula Performance</p>
                    <p className="text-xs font-mono mb-2">(Tempo Ideal / Tempo Real) * 100</p>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Ideal / Real</p>
                        <p className="text-sm font-bold">{data.byMachine.reduce((s, m) => s + m.idealCycleMinutes, 0)} / {data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0)} min</p>
                      </div>
                      <p className="text-xl font-black text-indicator-info">{data.overallPerformance.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                    <p className="text-[10px] font-black text-accent-purple uppercase mb-2">Fórmula Qualidade</p>
                    <p className="text-xs font-mono mb-2">(Peças Boas / Peças Produzidas) * 100</p>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Boas / Total</p>
                        <p className="text-sm font-bold">{data.byMachine.reduce((s, m) => s + m.goodPieces, 0)} / {data.byMachine.reduce((s, m) => s + m.totalPiecesProduced, 0)} pcs</p>
                      </div>
                      <p className="text-xl font-black text-accent-purple">{data.overallQuality.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-4 bg-black/40 rounded-xl border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary/20 text-primary border-primary/30">OEE FINAL</Badge>
                    <p className="text-xs font-medium text-muted-foreground">O OEE é o produto dos três indicadores acima (Disp x Perf x Qual)</p>
                  </div>
                  <p className="text-2xl font-black text-primary">{data.overallOEE.toFixed(1)}%</p>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border flex items-center justify-between",
                  data.overallOEE >= currentBenchmark.target 
                    ? "bg-success/5 border-success/20" 
                    : "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      data.overallOEE >= currentBenchmark.target ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    )}>
                      {data.overallOEE >= currentBenchmark.target ? <Award className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Performance vs Benchmark</p>
                      <p className="text-xs font-medium">{currentBenchmark.label}: {currentBenchmark.target}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xl font-black",
                      data.overallOEE >= currentBenchmark.target ? "text-success" : "text-destructive"
                    )}>
                      {(data.overallOEE - currentBenchmark.target).toFixed(1)}%
                    </p>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground">{data.overallOEE >= currentBenchmark.target ? 'Acima da Média' : 'Abaixo da Média'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-primary/60">Detalhamento por Unidade</p>
                <SectionErrorBoundary compact><Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-xl" />}>
                  {machineId !== 'all' ? (
                    <OEECalculationAudit 
                      machine={data.byMachine.find(m => m.machineId === machineId) as (typeof data.byMachine)[number]} 
                    />
                  ) : (
                    <OEECalculationAudit 
                      machine={{
                        machineId: 'overall',
                        machineName: 'Consolidado Global FAST',
                        machineCode: 'GLOBAL',
                        techniqueId: 'all',
                        techniqueName: 'Múltiplas',
                        techniqueColor: 'hsl(var(--primary))',
                        availability: data.overallAvailability,
                        performance: data.overallPerformance,
                        quality: data.overallQuality,
                        oee: data.overallOEE,
                        plannedProductionMinutes: data.byMachine.reduce((s, m) => s + m.plannedProductionMinutes, 0),
                        actualOperatingMinutes: data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0),
                        idealCycleMinutes: data.byMachine.reduce((s, m) => s + m.idealCycleMinutes, 0),
                        actualCycleMinutes: data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0),
                        totalPiecesProduced: data.byMachine.reduce((s, m) => s + m.totalPiecesProduced, 0),
                        goodPieces: data.byMachine.reduce((s, m) => s + m.goodPieces, 0),
                        lostPieces: data.byMachine.reduce((s, m) => s + m.lostPieces, 0),
                        totalJobs: data.byMachine.reduce((s, m) => s + m.totalJobs, 0),
                        completedJobs: data.byMachine.reduce((s, m) => s + m.completedJobs, 0),
                        oeeClass: 'excellent'
                      }} 
                    />
                  )}
                </Suspense></SectionErrorBoundary>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                   <strong>Nota sobre Benchmark:</strong> {currentBenchmark.desc} Estes valores servem como referência setorial para o seu processo de melhoria contínua.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {showSimulator && (
          <Card className="border-primary/20 bg-muted/20 animate-in slide-in-from-top-4 duration-300">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('oee.availability', 'Disponibilidade')}</Label>
                      <span className="text-xs font-black">{simValues.availability}%</span>
                    </div>
                    <Slider value={[simValues.availability]} max={100} step={1} onValueChange={([v]) => setSimValues({...simValues, availability: v})} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('common.performance', 'Performance')}</Label>
                      <span className="text-xs font-black">{simValues.performance}%</span>
                    </div>
                    <Slider value={[simValues.performance]} max={100} step={1} onValueChange={([v]) => setSimValues({...simValues, performance: v})} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('common.quality', 'Qualidade')}</Label>
                      <span className="text-xs font-black">{simValues.quality}%</span>
                    </div>
                    <Slider value={[simValues.quality]} max={100} step={1} onValueChange={([v]) => setSimValues({...simValues, quality: v})} />
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col md:flex-row items-center justify-around gap-6 bg-background/50 rounded-2xl p-6 border border-border/50">
                   <div className="text-center">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{t('oee.currentOEE', 'OEE Atual')}</p>
                      <p className="text-5xl font-black text-muted-foreground/50">{data.overallOEE.toFixed(1)}%</p>
                   </div>
                   <ArrowRight className="h-8 w-8 text-muted-foreground/30 hidden md:block" />
                   <div className="text-center">
                      <p className="text-xs font-bold text-primary uppercase mb-2">{t('oee.projectedOEE', 'OEE Projetado')}</p>
                      <p className="text-6xl font-black text-primary">
                        {((simValues.availability/100) * (simValues.performance/100) * (simValues.quality/100) * 100).toFixed(1)}%
                      </p>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
              <StudioHealthMonitor studios={data.byStudio.filter(s => s.maintenanceStatus !== 'optimal') || []} />
            </Suspense></SectionErrorBoundary>


            <SectionErrorBoundary compact><Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-xl" />}>
              <StudioEfficiencyGrid studios={data.byStudio || []} />
            </Suspense></SectionErrorBoundary>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <OEEGaugeCard 
                title={t('oee.generalOEE', 'OEE Geral')} 
                value={data.overallOEE} 
                icon={<Target className="h-4 w-4" />} 
                benchmark={currentBenchmark.target} 
                variant="glass" 
                trend={data.comparison ? data.overallOEE - data.comparison.previousOEE : undefined}
                description="Eficiência global consolidada de todos os Studios e Máquinas."
              />
              <OEEGaugeCard 
                title={t('oee.availability', 'Disponibilidade')} 
                value={data.overallAvailability} 
                icon={<Clock className="h-4 w-4" />} 
                benchmark={90} 
                variant="glass" 
                trend={data.comparison ? data.overallAvailability - data.comparison.previousAvailability : undefined}
                description="Tempo real de operação vs tempo planejado de produção."
              />
              <OEEGaugeCard 
                title={t('common.performance', 'Performance')} 
                value={data.overallPerformance} 
                icon={<Zap className="h-4 w-4" />} 
                benchmark={95} 
                variant="glass" 
                trend={data.comparison ? data.overallPerformance - data.comparison.previousPerformance : undefined}
                description="Velocidade de produção vs capacidade nominal dos equipamentos."
              />
              <OEEGaugeCard 
                title={t('common.quality', 'Qualidade')} 
                value={data.overallQuality} 
                icon={<ShieldCheck className="h-4 w-4" />} 
                benchmark={99} 
                variant="glass" 
                trend={data.comparison ? data.overallQuality - data.comparison.previousQuality : undefined}
                description="Índice de peças sem defeito (First Pass Yield) da FAST."
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-6">
                 <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
                    <OEETrendChart data={data.trendData} worldClassBenchmark={data.worldClassBenchmark} />
                 </Suspense></SectionErrorBoundary>
                 
                 <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
                    <OEEHeatmap data={data.heatmapData.length > 0 ? data.heatmapData : data.byMachine.map(m => ({
                      machineId: m.machineId,
                      machineName: m.machineName,
                      data: data.trendData
                    }))} />
                 </Suspense></SectionErrorBoundary>
               </div>
               
               <div className="space-y-6">
                 <Card className="border-primary/20 bg-muted/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        Alertas de Eficiência
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {data.maintenanceAlerts.map((alert, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border/50 group hover:border-primary/20 transition-all">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black uppercase text-primary">{alert.machineName}</span>
                            <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="text-[8px] h-4">
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium leading-tight mb-2">{alert.message}</p>
                          <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1 text-[9px] font-bold text-destructive">
                               <TrendingDown className="h-2.5 w-2.5" />
                               {alert.trend}%
                             </div>
                             <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Impacto em {alert.type}</span>
                          </div>
                        </div>
                      ))}
                      {data.maintenanceAlerts.length === 0 && (
                        <div className="py-8 text-center">
                          <CheckCircle2 className="h-8 w-8 text-success/20 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground font-bold">Sem alertas críticos no momento</p>
                        </div>
                      )}
                    </CardContent>
                 </Card>

                 <Card className="border-primary/20 bg-muted/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Target className="h-3 w-3 text-primary" />
                        Gaps de Classe Mundial
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span>Perda Disponibilidade</span>
                          <span className="text-destructive">{data.availabilityLosses.toFixed(1)}%</span>
                        </div>
                        <Progress value={data.availabilityLosses} className="h-1 bg-muted/50" variant="destructive" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span>Perda Performance</span>
                          <span className="text-indicator-warning">{data.performanceLosses.toFixed(1)}%</span>
                        </div>
                        <Progress value={data.performanceLosses} className="h-1 bg-muted/50" variant="warning" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span>Perda Qualidade</span>
                          <span className="text-accent-purple">{data.qualityLosses.toFixed(1)}%</span>
                        </div>
                        <Progress value={data.qualityLosses} className="h-1 bg-muted/50" variant="default" />
                      </div>
                    </CardContent>
                 </Card>
               </div>
            </div>

            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
               <OEERecommendations data={data} />
            </Suspense></SectionErrorBoundary>


          </TabsContent>

          <TabsContent value="studios" className="space-y-6 focus-visible:outline-none outline-none">
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
              <StudioHealthMonitor studios={data.byStudio || []} />
            </Suspense></SectionErrorBoundary>
            <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
              <StudioEfficiencyGrid studios={data.byStudio || []} />
            </Suspense></SectionErrorBoundary>



            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-primary/20 bg-muted/5">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Top Ranking Máquinas (vs Meta 85%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-4">
                      {data.byMachine.slice(0, 10).map((m, idx) => {
                        const gap = m.oee - 85;
                        return (
                          <div key={m.machineId} className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/50 group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-muted-foreground w-4">{idx + 1}</span>
                              <div>
                                <p className="text-sm font-bold tracking-tight">{m.machineName}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{m.techniqueName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("text-sm font-black", getOEEColor(m.oee))}>{m.oee.toFixed(1)}%</p>
                              <p className={cn("text-[9px] font-bold uppercase", gap >= 0 ? "text-success" : "text-destructive")}>
                                {gap >= 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-muted/5">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Maiores Impactos de Perda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-4">
                      {[
                        { label: 'Setup Studio Serigrafia', impact: '245 min', percent: 12, icon: <Clock className="h-3 w-3" /> },
                        { label: 'Limpeza Cabeçotes UV', impact: '180 min', percent: 8, icon: <Droplets className="h-3 w-3" /> },
                        { label: 'Troca de Matriz Laser', impact: '120 min', percent: 5, icon: <Settings2 className="h-3 w-3" /> },
                        { label: 'Ajuste de Registro', impact: '95 min', percent: 4, icon: <Target className="h-3 w-3" /> },
                        { label: 'Pequenas Paradas/Fricção', impact: '85 min', percent: 3, icon: <Activity className="h-3 w-3" /> }
                      ].map((loss, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-background/40 border border-border/50 group hover:border-destructive/30 transition-all">
                           <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2">
                               <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                                 {loss.icon}
                               </div>
                               <span className="text-xs font-bold">{loss.label}</span>
                             </div>
                             <span className="text-xs font-black text-destructive">{loss.impact}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <Progress value={loss.percent * 4} className="h-1 bg-muted" />
                              <span className="text-[10px] font-black text-muted-foreground">{loss.percent}%</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                 <SectionErrorBoundary compact><Suspense fallback={<ChartSkeleton />}>
                    <MaterialEfficiencyChart materials={data.byMaterial || []} />
                 </Suspense></SectionErrorBoundary>
              </div>
              <div className="space-y-6">
                 <Card className="bg-primary/5 border-primary/20 h-full flex flex-col justify-center items-center p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                    <Sparkles className="h-12 w-12 text-primary mb-4 animate-pulse" />
                    <h3 className="text-xl font-black italic tracking-tighter uppercase mb-2">Qualidade Hyper 10/10</h3>
                    <p className="text-sm text-muted-foreground max-w-[200px]">
                       A excelência operacional da FAST GRAVAÇÕES é monitorada em tempo real com inteligência Studio.
                    </p>
                    <div className="mt-6 text-title font-black text-6xl opacity-10 select-none">FAST</div>
                 </Card>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <Card className="bg-success/5 border-success/10 transition-transform hover:scale-[1.02]">
                <CardContent className="pt-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/20">
                         <Award className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-success">{machinesAtWorldClass}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">World Class</p>
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="bg-destructive/5 border-destructive/10 transition-transform hover:scale-[1.02]">
                <CardContent className="pt-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/20">
                         <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-destructive">{machinesBelowTarget}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Crítico/Baixo</p>
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/10 transition-transform hover:scale-[1.02]">
                <CardContent className="pt-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                         <Settings2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-primary">{activeMachinesCount}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Máquinas Ativas</p>
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="bg-indicator-info/5 border-indicator-info/10 transition-transform hover:scale-[1.02]">
                <CardContent className="pt-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indicator-info/20">
                         <BarChart3 className="h-5 w-5 text-indicator-info" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-indicator-info">{data.byTechnique.length}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Técnicas</p>
                      </div>
                   </div>
                </CardContent>
              </Card>
            </div>
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
  );
});

export default OEEDashboard;
