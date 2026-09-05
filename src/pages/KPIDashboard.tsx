import { useState, useMemo } from 'react';
import { BIJob as BIJobLegacy } from '@/features/analytics/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useKPIs, formatDuration, KPIPeriod, KPITargets } from '@/features/analytics/hooks/useKPIs';
import { useOperatorProductivity } from '@/features/production';
import { useGoalAlerts } from '@/features/notifications';
import { useBIExport } from '@/features/admin';
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History as HistoryIcon,
  Percent,
  Factory,
  Target,
  Users,
  Cpu,
  Settings2,
  Calendar,
  Search,
  ArrowUpRight,
  Download,
  Filter,
  BrainCircuit,
  Sparkles,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPITooltip, KPI_DEFINITIONS } from '@/components/ui/kpi-tooltip';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DrillDownDialog } from '@/features/analytics/components/bi/drilldown/DrillDownDialog';
import { BIJob } from '@/features/analytics/components/bi/types';
import { useSchedulingData } from '@/features/jobs';
import { KPIOverviewTab } from '@/features/analytics/components/bi/executive/KPIOverviewTab';
import { KPIMachinesTab } from '@/features/analytics/components/bi/executive/KPIMachinesTab';
import { KPIOperatorsTab } from '@/features/analytics/components/bi/executive/KPIOperatorsTab';
import { KPIAlertsTab } from '@/features/analytics/components/bi/executive/KPIAlertsTab';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from '@/lib/recharts';

export default function KPIDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState<KPIPeriod>('all');
  const [customTargets, setCustomTargets] = useState<Partial<KPITargets>>({});

  const { data: kpis, isLoading: isLoadingKPIs } = useKPIs(period, customTargets);
  const { operators, isLoading: isLoadingOperators } = useOperatorProductivity('all');
  const { jobs, isLoading: isLoadingJobs } = useSchedulingData();

  const { goalAlerts } = useGoalAlerts({ enableNotifications: false });
  const { handleExport } = useBIExport({ periodJobsList: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownJobs, setDrillDownJobs] = useState<BIJob[]>([]);

  const [visibleKPIs, setVisibleKPIs] = useState({
    completion: true,
    occupancy: true,
    loss: true,
    delayed: true
  });

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<{ machineId: string; machineName: string; jobCount: number; totalPieces: number; lossRate: number } | null>(null);


  const isLoading = isLoadingKPIs || isLoadingOperators || isLoadingJobs;

  const handleDrillDown = (title: string, segment: 'lost' | 'finished' | 'delayed' | 'production' | 'queue') => {
    setDrillDownTitle(title);
    if (jobs) {
      const filtered = jobs.filter((j) => {
        if (segment === 'lost') return (j.lost_pieces || 0) > 0;
        if (segment === 'finished') return j.status === 'finished';
        if (segment === 'delayed') return j.status === 'delayed';
        if (segment === 'production') return j.status === 'production';
        if (segment === 'queue') return j.status === 'scheduled' || j.status === 'queue';
        return true;
      }).map((j) => {
        const total = (j.produced_quantity || j.quantity || 1) + (j.lost_pieces || 0);
        return {
          ...j,
          order_number: j.order_number || `OS-${j.id.slice(0, 5)}`,
          product: j.product || 'Produto',
          produced_quantity: j.produced_quantity || 0,
          lost_pieces: j.lost_pieces || 0,
          efficiency: total > 0 ? (((total - (j.lost_pieces || 0)) / total) * 100).toFixed(1) + '%' : '--'
        };
      });
      setDrillDownJobs(filtered);
      setDrillDownOpen(true);
    }
  };


  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  }

  if (!kpis || !operators) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </MainLayout>
    );
  }

  const completionRate = kpis.totalJobs > 0
    ? (kpis.completedJobs / kpis.totalJobs) * 100
    : 0;

  const statusData = [
    { name: 'Finalizados', value: kpis.completedJobs, color: '#10B981' },
    { name: 'Em Produção', value: kpis.inProgressJobs, color: '#06B6D4' },
    { name: 'Atrasados', value: kpis.delayedJobs, color: 'hsl(25, 95%, 53%)' }, // Orange instead of red
    { name: 'Outros', value: kpis.totalJobs - kpis.completedJobs - kpis.inProgressJobs - kpis.delayedJobs, color: '#6B7280' },
  ].filter(d => d.value > 0);

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-fade-in-up">
        {/* Breadcrumbs removed - handled by MainLayout */}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-display">
              <span className="gradient-text">Dashboard de KPIs</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Monitoramento estratégico de produtividade e eficiência global
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 glass-button">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Formato do Relatório</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv', 'Indicadores_KPI', kpis)}>
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf', 'Relatorio_Geral_KPI', kpis)}>
                  PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 glass-button">
                  <Calendar className="h-4 w-4" />
                  {period === 'all' ? 'Todo o período' :
                   period === 'day' ? 'Hoje' :
                   period === 'week' ? 'Últimos 7 dias' :
                   period === 'month' ? 'Últimos 30 dias' : 'Último ano'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPeriod('day')}>Hoje</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod('week')}>Últimos 7 dias</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod('month')}>Últimos 30 dias</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod('year')}>Último ano</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod('all')}>Todo o período</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="glass-button h-9 w-9">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Personalizar Dashboard</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Visibilidade</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Taxa de Conclusão</span>
                      <Switch
                        checked={visibleKPIs.completion}
                        onCheckedChange={(val) => setVisibleKPIs(prev => ({ ...prev, completion: val }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Ocupação Média</span>
                      <Switch
                        checked={visibleKPIs.occupancy}
                        onCheckedChange={(val) => setVisibleKPIs(prev => ({ ...prev, occupancy: val }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Índice de Perdas</span>
                      <Switch
                        checked={visibleKPIs.loss}
                        onCheckedChange={(val) => setVisibleKPIs(prev => ({ ...prev, loss: val }))}
                      />
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Metas (Targets)</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => setIsEditingTargets(!isEditingTargets)}
                      >
                        {isEditingTargets ? 'Fechar' : 'Editar'}
                      </Button>
                    </div>

                    {isEditingTargets ? (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label htmlFor="kpi-target-completion" className="text-[10px]">Meta de Conclusão (%)</label>
                          <Input
                            id="kpi-target-completion"
                            type="number"
                            className="h-7 text-xs"
                            defaultValue={kpis.targets.completionRate}
                            onBlur={(e) => setCustomTargets(prev => ({ ...prev, completionRate: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="kpi-target-occupancy" className="text-[10px]">Meta de Ocupação (%)</label>
                          <Input
                            id="kpi-target-occupancy"
                            type="number"
                            className="h-7 text-xs"
                            defaultValue={kpis.targets.occupancyRate}
                            onBlur={(e) => setCustomTargets(prev => ({ ...prev, occupancyRate: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="kpi-target-loss" className="text-[10px]">Meta de Perda Máx (%)</label>
                          <Input
                            id="kpi-target-loss"
                            type="number"
                            className="h-7 text-xs"
                            defaultValue={kpis.targets.lossRate}
                            onBlur={(e) => setCustomTargets(prev => ({ ...prev, lossRate: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-muted/30 p-2 rounded text-center">
                          <p className="text-[10px] text-muted-foreground">Conclusão</p>
                          <p className="text-xs font-bold">{kpis.targets.completionRate}%</p>
                        </div>
                        <div className="bg-muted/30 p-2 rounded text-center">
                          <p className="text-[10px] text-muted-foreground">Ocupação</p>
                          <p className="text-xs font-bold">{kpis.targets.occupancyRate}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <VoiceButton />
          </div>
        </div>

        <div id="kpi-dashboard-content" className="space-y-6">

        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="machines">Máquinas</TabsTrigger>
            <TabsTrigger value="operators">Operadores</TabsTrigger>
            <TabsTrigger value="alerts">Alertas & Desvios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <KPIOverviewTab
              kpis={kpis}
              visibleKPIs={visibleKPIs}
              completionRate={completionRate}
              statusData={statusData}
              handleDrillDown={handleDrillDown}
            />
          </TabsContent>

          <TabsContent value="machines" className="space-y-6">
            <KPIMachinesTab
              kpis={kpis}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setSelectedMachine={setSelectedMachine}
            />
          </TabsContent>

          <TabsContent value="operators" className="space-y-6">
            <KPIOperatorsTab
              operators={operators}
              kpis={kpis}
              formatDuration={formatDuration}
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <KPIAlertsTab
              goalAlerts={goalAlerts}
              kpis={kpis}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>

    {/* Drill-down Dialog */}
    <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
      <DialogContent className="max-w-2xl glass-card border-border/50">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{selectedMachine?.machineName}</DialogTitle>
              <DialogDescription>ID: {selectedMachine?.machineId}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total de Peças</p>
            <p className="text-2xl font-bold">{selectedMachine?.totalPieces.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
            <p className="text-xs text-muted-foreground uppercase mb-1">Índice de Perdas</p>
            <p className={cn(
              "text-2xl font-bold",
              (selectedMachine?.lossRate ?? 0) > 5 ? "text-primary" : "text-green-400"
            )}>
              {(selectedMachine?.lossRate ?? 0).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Performance Recente
          </h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpis.performanceHistory.slice(-5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="efficiency" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setSelectedMachine(null)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <DrillDownDialog
      open={drillDownOpen}
      onOpenChange={setDrillDownOpen}
      title={drillDownTitle}
      jobs={drillDownJobs as unknown as Parameters<typeof DrillDownDialog>[0]['jobs']}
      onExport={(format) => handleExport(format, drillDownTitle.replace(/\s+/g, '_'), kpis)}
    />
    </MainLayout>
  );
}

