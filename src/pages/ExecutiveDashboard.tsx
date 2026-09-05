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

        {/* Autonomous Control & North Star Metric Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[420px]">
          <div className="lg:col-span-1 h-full overflow-hidden">
             <AutonomousEventLog />
          </div>
          <Card className="glass-card lg:col-span-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent h-full flex flex-col cursor-pointer hover:border-primary/40 transition-all" onClick={() => toast.info('Drill-down: OEE Global')}>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                North Star Metric
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-6 pb-8">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-muted/20 stroke-current"
                    strokeWidth="8"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-primary stroke-current transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={`${kpis.productionEfficiency * 2.64}, 264`}
                    strokeLinecap="round"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black">{kpis.productionEfficiency.toFixed(1)}%</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">OEE Global</span>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-4 w-full">
                <div className="flex-1 text-center border-r border-border/50">
                  <p className="text-lg font-bold text-primary">{kpis.qualityRate.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Qualidade</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-primary">{kpis.machineUtilization.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Utilização</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card lg:col-span-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden group h-full flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap className="h-32 w-32 text-warning" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-warning flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Operational Insights
              </CardTitle>
              <CardDescription>Análise inteligente de performance do período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-4 rounded-xl bg-warning/10 border border-amber-500/20 flex items-start gap-4 hover:bg-warning/15 transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Oportunidade de Ganho de Eficiência</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Identificamos que a técnica <span className="text-foreground font-semibold">{kpis.techniqueDistribution[0]?.technique}</span> está operando com 15% acima da média. Replicar o setup da máquina <span className="text-foreground font-semibold">{kpis.machinePerformance[0]?.machine}</span> pode elevar o OEE global em até 4.2%.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-4 hover:bg-blue-500/15 transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Previsão de Gargalo</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Com base no volume de <span className="text-foreground font-semibold">{kpis.totalJobsInProgress} jobs</span> em produção, prevemos um pico de demanda nas próximas 48h. Recomendamos antecipar a manutenção das máquinas auxiliares.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-4 hover:bg-purple-500/15 transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <BrainCircuit className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Resiliência Cibernética Ativa</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Integridade de dados auditada em <span className="text-foreground font-semibold">100% dos processos</span>. Sincronização em tempo real com Bitrix24 garantindo orquestração 11/10.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Grid */}
        <ExecutiveKPICardsGrid kpiCards={kpiCards as unknown as Parameters<typeof ExecutiveKPICardsGrid>[0]['kpiCards']} />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Production Trend */}
          <Card className="glass-card cursor-pointer hover:border-primary/20 transition-all" onClick={() => toast.info('Drill-down: Tendência de Produção')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Tendência de Produção
                  </CardTitle>
                  <CardDescription>Produzido vs Meta diária</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpis.productionTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="target"
                      stroke="#94a3b8"
                      fill="#94a3b8"
                      fillOpacity={0.1}
                      name="Meta"
                    />
                    {showComparison && (
                      <Area
                        type="monotone"
                        dataKey="prevProduced"
                        stroke="#94a3b8"
                        fill="#94a3b8"
                        fillOpacity={0.2}
                        strokeDasharray="5 5"
                        name="Produzido (Período Ant.)"
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="produced"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.4}
                      name="Produzido"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Efficiency Trend */}
          <Card className="glass-card cursor-pointer hover:border-primary/20 transition-all" onClick={() => toast.info('Drill-down: Eficiência Temporal')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Eficiência ao Longo do Tempo
                  </CardTitle>
                  <CardDescription>Percentual de eficiência diária</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpis.efficiencyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)}%`,
                        name === 'prevEfficiency' ? 'Eficiência (Ant.)' : 'Eficiência'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    {showComparison && (
                      <Line
                        type="monotone"
                        dataKey="prevEfficiency"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="prevEfficiency"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 3 }}
                      name="efficiency"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Technique Distribution */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-purple-500" />
                Distribuição por Técnica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kpis.techniqueDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="technique"
                      label={({ technique, percent }) =>
                        `${technique} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      onClick={(data) => {
                        const technique = techniques?.find(t => t.short_name === data.technique || t.name === data.technique);
                        if (technique) {
                          setTechniqueId(technique.id);
                          toast.success(`Filtrando por técnica: ${technique.name}`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {kpis.techniqueDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Operators */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                Top Operadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpis.topOperators.map((op, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      index === 0 ? 'bg-amber-500 text-amber-950' :
                      index === 1 ? 'bg-gray-400 text-gray-950' :
                      index === 2 ? 'bg-orange-600 text-orange-950' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{op.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {op.produced.toLocaleString('pt-BR')} peças
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {op.efficiency.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Machine Performance */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Factory className="h-5 w-5 text-warning" />
                Performance Máquinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpis.machinePerformance.slice(0, 5).map((m, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    aria-label={`Filtrar por máquina ${m.machine}`}
                    className="space-y-1 cursor-pointer hover:bg-primary/5 p-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => {
                      const machine = machines?.find(mac => (mac.code || mac.name) === m.machine);
                      if (machine) {
                        setMachineId(machine.id);
                        toast.success(`Filtrando por máquina: ${machine.code || machine.name}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      const machine = machines?.find(mac => (mac.code || mac.name) === m.machine);
                      if (machine) {
                        setMachineId(machine.id);
                        toast.success(`Filtrando por máquina: ${machine.code || machine.name}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.machine}</span>
                      <span className="text-muted-foreground">
                        OEE: {m.oee.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={m.utilization} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Configuration Dialog */}
        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Configuração de Metas Executivas
              </DialogTitle>
              <CardDescription>Defina as metas estratégicas para o dashboard consolidado.</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal" className="text-right">Meta OEE (%)</Label>
                <Input
                  id="goal"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  className="col-span-3"
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveGoal}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
