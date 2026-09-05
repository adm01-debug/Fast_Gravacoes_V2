import { useState, useMemo } from 'react';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useOperatorProductivity, OperatorProductivityMetrics, ProductivityPeriod } from '@/features/production';
import { useOperatorEvolution } from '@/features/production';
import { useOperatorGoals } from '@/features/production';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Download, Plus, Users, Gauge, CheckCircle2, AlertTriangle, Trophy, Search, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateGoalModal } from '@/components/operators/CreateGoalModal';
import { OperatorGoalsCard, GoalsSummary } from '@/components/operators/OperatorGoalsCard';
import { GoalsHistoryCard } from '@/components/operators/GoalsHistoryCard';
import { GoalAlertsWidget } from '@/components/operators/GoalAlertsWidget';
import { generateProductivityReport } from '@/lib/productivityReport';
import { OperatorProductivityStatCard } from '@/components/operators/OperatorProductivityStatCard';
import { OperatorProductivityCard } from '@/components/operators/OperatorProductivityCard';
import { EvolutionChart } from '@/components/operators/EvolutionChart';
import { EfficiencyChart } from '@/components/operators/EfficiencyChart';
import { ProductionRadarChart } from '@/components/operators/ProductionRadarChart';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { AIWorkforceAdvisor } from '@/components/operators/AIWorkforceAdvisor';


export default function OperatorProductivityPage() {
  const [period, setPeriod] = useState<ProductivityPeriod>(30);
  const { operators, overallStats, isLoading } = useOperatorProductivity(period);
  const { goals, activeGoals, getGoalsByOperator } = useOperatorGoals();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'efficiency' | 'jobs' | 'pieces' | 'loss'>('efficiency');
  const [selectedOperator, setSelectedOperator] = useState<OperatorProductivityMetrics | null>(null);
  const [evolutionOperatorId, setEvolutionOperatorId] = useState<string | 'all'>('all');
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [goalOperatorId, setGoalOperatorId] = useState<string | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  const evolutionDays = period === 'all' ? 30 : period;
  const { evolutionData, overallDailyData, isLoading: isLoadingEvolution } = useOperatorEvolution(evolutionDays);

  const periodLabels: Record<ProductivityPeriod, string> = { 7: 'Últimos 7 dias', 30: 'Últimos 30 dias', 90: 'Últimos 90 dias', 'all': 'Todo o período' };

  const fuseSearchedOperators = useFuseSearch(operators, searchQuery, { keys: ['operatorName', 'machineNames'], threshold: 0.3 });

  const filteredOperators = useMemo(() => {
    let result = fuseSearchedOperators;
    if (statusFilter === 'active') result = result.filter(o => o.isActive);
    else if (statusFilter === 'inactive') result = result.filter(o => !o.isActive);
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'jobs': return b.totalJobsCompleted - a.totalJobsCompleted;
        case 'pieces': return b.totalPiecesProduced - a.totalPiecesProduced;
        case 'loss': return a.lossRate - b.lossRate;
        default: return b.efficiencyScore - a.efficiencyScore;
      }
    });
  }, [fuseSearchedOperators, statusFilter, sortBy]);

  const displayOperator = selectedOperator || filteredOperators.find(o => o.totalJobsCompleted > 0) || filteredOperators[0];

  const handleExportReport = () => {
    setIsExporting(true);
    try {
      generateProductivityReport({ operators, goals, period: period === 'all' ? 'Todo o período' : `Últimos ${period} dias`, overallStats: { averageEfficiency: overallStats.averageEfficiency, totalJobsCompleted: overallStats.totalJobsCompleted, totalPiecesProduced: overallStats.totalPiecesProduced, averageLossRate: overallStats.averageLossRate } });
    } finally { setIsExporting(false); }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between"><div><Skeleton className="h-8 w-64 mb-2" /><Skeleton className="h-4 w-96" /></div></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Skeleton className="h-[400px]" /><Skeleton className="h-[400px]" /></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <Breadcrumbs />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-title font-black tracking-tighter">
                <span className="gradient-text animate-pulse-glow">Workforce Performance 10/10</span>
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">Métricas avançadas de capital humano e inteligência operacional</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleExportReport} disabled={isExporting}><Download className="h-4 w-4 mr-2" />{isExporting ? 'Exportando...' : 'Exportar PDF'}</Button>
            <Button variant="outline" size="sm" onClick={() => { setGoalOperatorId(undefined); setShowCreateGoalModal(true); }}><Plus className="h-4 w-4 mr-2" />Nova Meta</Button>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Tabs value={String(period)} onValueChange={(v) => setPeriod(v === 'all' ? 'all' : Number(v) as ProductivityPeriod)}>
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="7" className="text-xs px-3">7 dias</TabsTrigger>
                  <TabsTrigger value="30" className="text-xs px-3">30 dias</TabsTrigger>
                  <TabsTrigger value="90" className="text-xs px-3">90 dias</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs px-3">Tudo</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {period !== 'all' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-normal">{periodLabels[period]}</Badge><span>•</span><span>Dados filtrados por período de conclusão</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OperatorProductivityStatCard title="Operadores Ativos" value={operators.filter(o => o.isActive).length} subtitle={`${operators.length} total cadastrados`} icon={Users} />
          <OperatorProductivityStatCard title="Eficiência Média" value={`${overallStats.averageEfficiency.toFixed(1)}%`} subtitle="Baseada em qualidade e tempo" icon={Gauge} trend={overallStats.averageEfficiency >= 70 ? 'up' : 'down'} />
          <OperatorProductivityStatCard title="Jobs Concluídos" value={overallStats.totalJobsCompleted.toLocaleString()} subtitle="Total de todos os operadores" icon={CheckCircle2} trend="up" />
          <OperatorProductivityStatCard title="Taxa de Perda Média" value={`${overallStats.averageLossRate.toFixed(1)}%`} subtitle="Índice de refugo geral" icon={AlertTriangle} trend={overallStats.averageLossRate <= 5 ? 'up' : 'down'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeGoals.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                <GoalsSummary allGoals={activeGoals} allMetrics={operators} />
                <GoalAlertsWidget maxVisible={3} />
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <AIWorkforceAdvisor />
          </div>
        </div>

        {overallStats.topPerformer && overallStats.topPerformer.totalJobsCompleted > 0 && (
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-full"><Trophy className="h-8 w-8 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Destaque do Período</p>
                  <p className="text-xl font-bold">{overallStats.topPerformer.operatorName}</p>
                  <p className="text-sm text-muted-foreground">{overallStats.topPerformer.efficiencyScore.toFixed(1)}% de eficiência • {overallStats.topPerformer.totalJobsCompleted} jobs • {overallStats.topPerformer.totalPiecesProduced.toLocaleString()} peças</p>
                </div>
                <Badge variant="default" className="bg-primary text-primary-foreground">Top Performance</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <EvolutionChart evolutionData={evolutionData} overallDailyData={overallDailyData} selectedOperatorId={evolutionOperatorId} onOperatorChange={setEvolutionOperatorId} isLoading={isLoadingEvolution} />

        {goals.length > 0 && <GoalsHistoryCard goals={goals} operators={operators} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EfficiencyChart operators={operators} />
          {displayOperator && <ProductionRadarChart operator={displayOperator} />}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar operador ou máquina..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="efficiency">Eficiência</SelectItem>
              <SelectItem value="jobs">Jobs Concluídos</SelectItem>
              <SelectItem value="pieces">Peças Produzidas</SelectItem>
              <SelectItem value="loss">Menor Perda</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredOperators.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum operador encontrado</h3>
              <p className="text-muted-foreground">{searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Cadastre operadores para visualizar métricas de produtividade'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOperators.map((operator, index) => (
              <div key={operator.operatorId} role="button" tabIndex={0} aria-label={`Ver detalhes de ${operator.operatorName || operator.operatorId}`} className="animate-fade-in cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl" style={{ animationDelay: `${index * 50}ms` }} onClick={() => setSelectedOperator(operator)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOperator(operator); } }}>
                <OperatorProductivityCard
                  operator={operator}
                  goals={getGoalsByOperator(operator.operatorId)}
                  onAddGoal={() => { setGoalOperatorId(operator.operatorId); setShowCreateGoalModal(true); }}
                  teamAverage={overallStats.averageEfficiency}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateGoalModal open={showCreateGoalModal} onOpenChange={setShowCreateGoalModal} defaultOperatorId={goalOperatorId} />
    </MainLayout>
  );
}
