import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useExecutiveDashboard, getDateRangePresets, DateRange } from '@/features/analytics/hooks/useExecutiveDashboard';
import { exportExecutiveDashboardPDF } from '@/lib/pdfExport';
import { exportExecutiveDashboardExcel } from '@/lib/excelExport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTechniques } from '@/features/jobs';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from '@/lib/recharts';
import {
  FileDown,
  TrendingUp,
  TrendingDown,
  Factory,
  Package,
  Wrench,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Lightbulb,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { AutonomousEventLog } from '@/components/autonomous/AutonomousEventLog';
import { ExecutiveKPICardsGrid } from '@/features/analytics/components/bi/executive/ExecutiveKPICards';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExecutiveNorthStar } from '@/features/analytics/components/executive/ExecutiveNorthStar';
import { ExecutiveChartsRow1 } from '@/features/analytics/components/executive/ExecutiveChartsRow1';
import { ExecutiveChartsRow2 } from '@/features/analytics/components/executive/ExecutiveChartsRow2';
import { ExecutiveGoalDialog } from '@/features/analytics/components/executive/ExecutiveGoalDialog';

export default function ExecutiveDashboard() {
  const datePresets = getDateRangePresets();
  const [selectedRange, setSelectedRange] = useState<DateRange>(datePresets[2] || datePresets[1]); // Este Mês
  const [machineId, setMachineId] = useState<string>('all');
  const [techniqueId, setTechniqueId] = useState<string>('all');
  const [globalGoal, setGlobalGoal] = useState<number>(85);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [tempGoal, setTempGoal] = useState<string>('85');
  const [showComparison, setShowComparison] = useState(false);

  const { data: machines } = useQuery({
    queryKey: ['machines-list'],
    queryFn: async () => {
      const { data } = await supabase.from('machines').select('id, name, code');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: techniques } = useTechniques();

  const { data: kpis, isLoading, error } = useExecutiveDashboard(
    selectedRange,
    {
      machineId: machineId === 'all' ? undefined : machineId,
      techniqueId: techniqueId === 'all' ? undefined : techniqueId
    }
  );

  const handleExportPDF = async () => {
    if (!kpis) return;
    try {
      await exportExecutiveDashboardPDF({
        title: 'Dashboard Executivo',
        dateRange: selectedRange,
        kpis,
      });
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportExcel = async () => {
    if (!kpis) return;
    try {
      await exportExecutiveDashboardExcel({
        title: 'Dashboard Executivo',
        dateRange: selectedRange,
        kpis,
      });
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar Excel');
    }
  };

  const handleSaveGoal = () => {
    const val = parseFloat(tempGoal);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Por favor, insira um valor válido entre 0 e 100');
      return;
    }
    setGlobalGoal(val);
    setIsGoalDialogOpen(false);
    toast.success(`Meta global atualizada para ${val}%`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <DashboardSkeleton rows={5} columns={5} />
        </div>
      </MainLayout>
    );
  }

  if (error || !kpis) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Erro ao carregar dashboard</p>
            <p className="text-muted-foreground">Tente novamente mais tarde</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const kpiCards = [
    {
      title: 'Produção Total',
      value: kpis.totalPiecesProduced.toLocaleString('pt-BR'),
      subtitle: `${kpis.totalJobsCompleted} jobs concluídos`,
      icon: Package,
      trend: kpis.trends.production >= 0 ? 'up' : 'down',
      trendValue: kpis.trends.production,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Eficiência',
      value: `${kpis.productionEfficiency.toFixed(1)}%`,
      subtitle: `Meta: ${globalGoal}%`,
      icon: Target,
      trend: kpis.trends.efficiency >= 0 ? 'up' : 'down',
      trendValue: kpis.trends.efficiency,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Taxa de Qualidade',
      value: `${kpis.qualityRate.toFixed(1)}%`,
      subtitle: `${kpis.totalPiecesLost.toLocaleString('pt-BR')} perdas`,
      icon: CheckCircle2,
      trend: kpis.trends.quality >= 0 ? 'up' : 'down',
      trendValue: kpis.trends.quality,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Utilização Máquinas',
      value: `${kpis.machineUtilization.toFixed(1)}%`,
      subtitle: `${kpis.activeMachines} de ${kpis.totalMachines} ativas`,
      icon: Factory,
      trend: kpis.trends.utilization >= 0 ? 'up' : 'down',
      trendValue: kpis.trends.utilization,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Ciber-Resiliência',
      value: '98.5',
      subtitle: 'Status: 11/10 Ativo',
      icon: ShieldCheck,
      trend: 'up',
      trendValue: 0.2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
    },
  ];

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-10 animate-fade-in-up">
        <Helmet>
          <title>FAST GRAVAÇÕES | Dashboard Executivo</title>
          <meta name="description" content="FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO - QUALIDADE + VELOCIDADE" />
          <meta property="og:title" content="Dashboard Executivo - FAST GRAVAÇÕES" />
          <meta property="og:description" content="QUALIDADE + VELOCIDADE" />
        </Helmet>
        <Breadcrumbs className="mb-0" />

        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pb-2 border-b border-border/40">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-glow-primary animate-float">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl text-title font-black tracking-tighter">
                  <span className="gradient-text animate-pulse-glow">FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</span>
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    QUALIDADE + VELOCIDADE
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success dark:text-success border-emerald-500/20">
                    Governança Total Ativa
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm font-black uppercase tracking-widest opacity-70">
              FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex-1 xl:flex-none">
              <VoiceButton onCommand={(cmd) => {
                if (cmd.startsWith('search:')) {
                  toast.info(`Busca: ${cmd.replace('search:', '')}`);
                }
              }} />
            </div>

            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger className="w-[140px] h-11 rounded-xl glass-card font-bold text-[10px] uppercase tracking-wider">
                  <SelectValue placeholder="Máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Máquinas</SelectItem>
                  {machines?.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.code || m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={techniqueId} onValueChange={setTechniqueId}>
                <SelectTrigger className="w-[140px] h-11 rounded-xl glass-card font-bold text-[10px] uppercase tracking-wider">
                  <SelectValue placeholder="Técnica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Técnicas</SelectItem>
                  {techniques?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedRange.label}
                onValueChange={(value) => {
                  const preset = datePresets.find(p => p.label === value);
                  if (preset) setSelectedRange(preset);
                }}
              >
                <SelectTrigger className="w-[160px] h-11 rounded-xl glass-card font-bold text-[10px] uppercase tracking-wider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-primary/20">
                  {datePresets.map(preset => (
                    <SelectItem key={preset.label} value={preset.label} className="font-bold text-xs">
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 px-3 h-11 rounded-xl glass-card border border-primary/10">
                <Switch
                  id="comparison-mode"
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                />
                <Label htmlFor="comparison-mode" className="text-[10px] font-bold uppercase cursor-pointer whitespace-nowrap">Comparar</Label>
              </div>

              <div className="flex gap-1">
                <Button onClick={handleExportPDF} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-primary/20 hover:bg-primary/10" title="Exportar PDF">
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button onClick={handleExportExcel} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-primary/20 hover:bg-primary/10" title="Exportar Excel">
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button onClick={() => setIsGoalDialogOpen(true)} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-primary/20 hover:bg-primary/10" title="Configurar Metas">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <ExecutiveNorthStar kpis={kpis} />

        {/* KPI Grid */}
        <ExecutiveKPICardsGrid kpiCards={kpiCards as unknown as Parameters<typeof ExecutiveKPICardsGrid>[0]['kpiCards']} />

        {/* Charts Row 1 */}
        <ExecutiveChartsRow1 kpis={kpis} showComparison={showComparison} />

        {/* Charts Row 2 */}
        <ExecutiveChartsRow2 kpis={kpis} techniques={techniques} machines={machines} onTechniqueSelect={setTechniqueId} onMachineSelect={setMachineId} />

        {/* Goals Configuration Dialog */}
        <ExecutiveGoalDialog
          open={isGoalDialogOpen}
          onOpenChange={setIsGoalDialogOpen}
          tempGoal={tempGoal}
          onTempGoalChange={setTempGoal}
          onSave={handleSaveGoal}
        />
      </div>
    </MainLayout>
  );
}
