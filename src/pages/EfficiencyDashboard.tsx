import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { KPITooltip, KPI_DEFINITIONS } from '@/components/ui/kpi-tooltip';
import { Layers, Scale, AlertTriangle, TrendingUp, Timer, BarChart3, History, Command, Users } from 'lucide-react';
import { useSmartSequencing } from '@/features/jobs';
import { useLoadBalancing } from '@/features/analytics/hooks/useLoadBalancing';
import { useBottleneckPrediction } from '@/features/analytics/hooks/useBottleneckPrediction';
import { useEfficiencyAlertHistory } from '@/features/analytics/hooks/useEfficiencyAlertHistory';
import { SequencingTab } from '@/features/analytics/components/efficiency/SequencingTab';
import { BalancingTab } from '@/features/analytics/components/efficiency/BalancingTab';
import { BottlenecksTab } from '@/features/analytics/components/efficiency/BottlenecksTab';
import { HistoryTab } from '@/features/analytics/components/efficiency/HistoryTab';
import { EfficiencyAlertHistoryWidget } from '@/components/dashboard/EfficiencyAlertHistoryWidget';
import { OEELoadTrendWidget } from '@/components/dashboard/OEELoadTrendWidget';
import { LeaderboardWidget } from '@/components/dashboard/LeaderboardWidget';
import { EfficiencyAlertTrendChart } from '@/components/dashboard/EfficiencyAlertTrendChart';
import { useOEE } from '@/features/production';
import { OperatorGoalsWidget } from '@/components/dashboard/OperatorGoalsWidget';
import { VoiceButton } from '@/components/voice/VoiceCommands';

export default function EfficiencyDashboard() {
  const navigate = useNavigate();
  const { suggestions: sequencingSuggestions, totalSavings } = useSmartSequencing();
  const { byTechnique, suggestions: balancingSuggestions, isLoading: loadBalancingLoading } = useLoadBalancing();
  const { alerts, capacityByDate, isLoading: bottleneckLoading, criticalCount } = useBottleneckPrediction();
  const { alerts: allAlertHistory, resolvedAlerts, isLoading: historyLoading } = useEfficiencyAlertHistory();
  const { data: oeeData } = useOEE(30);

  const overallOEE = oeeData?.overallOEE || 0;

  const totalSetupSaved = totalSavings;
  const allMachineLoads = byTechnique.flatMap(t => t.machines);
  const balancedMachines = allMachineLoads.filter(m => m.occupancyRate >= 30 && m.occupancyRate <= 80).length;
  const totalMachines = allMachineLoads.length;
  const criticalBottlenecks = criticalCount || 0;
  const avgOccupancy = totalMachines > 0 ? Math.round(allMachineLoads.reduce((acc, m) => acc + m.occupancyRate, 0) / totalMachines) : 0;

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl text-title font-bold text-foreground">Eficiência Operacional</h1>
              <FavoriteButton path="/efficiency" name="Eficiência Operacional" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Análises e otimizações para maximizar produtividade</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FavoritesDropdown onNavigate={(url) => navigate(url)} />
            <Badge
              variant="outline"
              className="gap-1 text-xs hidden sm:flex cursor-pointer hover:bg-accent"
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            >
              <Command className="h-3 w-3" />K para buscar
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm"><History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Histórico</Button>
            <VoiceButton className="no-export" />
            <Button size="sm" className="gap-1.5 sm:gap-2 gradient-primary text-xs sm:text-sm"><TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Otimizar</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPITooltip title="Setup Economizado" description="Tempo total economizado através de sequenciamento inteligente de jobs por cor." formula="Soma de (tempo setup normal - tempo setup otimizado)" target="Maximizar" trend={totalSetupSaved > 0 ? 'up' : 'stable'} trendValue={`${totalSetupSaved}min`}>
            <Card className="glass-card border-border/50"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 rounded-xl bg-primary/10"><Timer className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-bold text-foreground truncate">{totalSetupSaved}min</p><p className="text-[10px] sm:text-xs text-muted-foreground">Setup Economizado</p></div></div></CardContent></Card>
          </KPITooltip>
          <KPITooltip title="Máquinas Balanceadas" description="Máquinas com ocupação entre 30% e 80%." formula="Máquinas (30% ≤ ocupação ≤ 80%) / Total" target="100%" benchmark="Ideal: 80%+">
            <Card className="glass-card border-border/50"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 rounded-xl bg-success/10"><Scale className="h-4 w-4 sm:h-5 sm:w-5 text-success" /></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-bold text-foreground">{balancedMachines}/{totalMachines}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Balanceadas</p></div></div></CardContent></Card>
          </KPITooltip>
          <KPITooltip title="Gargalos Críticos" description="Técnicas ou máquinas operando acima de 90%." formula="Count(ocupação > 90%)" target="0" trend={criticalBottlenecks > 0 ? 'down' : 'stable'} trendValue={criticalBottlenecks > 0 ? 'Atenção necessária' : 'OK'}>
            <Card className="glass-card border-border/50"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 rounded-xl bg-warning/10"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" /></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-bold text-foreground">{criticalBottlenecks}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Gargalos</p></div></div></CardContent></Card>
          </KPITooltip>
          <KPITooltip title="OEE Global" description="Eficácia Geral do Equipamento considerando Disponibilidade, Performance e Qualidade." formula="Disponibilidade x Performance x Qualidade" target="85%" trend={overallOEE >= 85 ? 'up' : overallOEE >= 65 ? 'stable' : 'down'} trendValue={`${overallOEE}%`}>
            <Card className="glass-card border-border/50"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 rounded-xl bg-accent/10"><BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-bold text-foreground">{overallOEE}%</p><p className="text-[10px] sm:text-xs text-muted-foreground">OEE Global</p></div></div></CardContent></Card>
          </KPITooltip>
        </div>

        {/* Historical Trends & Top Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <OEELoadTrendWidget />
          <LeaderboardWidget />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="sequencing" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="glass-card p-1 inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="sequencing" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden xs:inline">Sequenc.</span></TabsTrigger>
              <TabsTrigger value="balancing" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden xs:inline">Balanc.</span></TabsTrigger>
              <TabsTrigger value="bottlenecks" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden xs:inline">Gargalos</span></TabsTrigger>
              <TabsTrigger value="performance" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden xs:inline">Operadores</span></TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"><History className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden xs:inline">Histórico</span></TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="sequencing" className="space-y-4"><SequencingTab suggestions={sequencingSuggestions} /></TabsContent>
          <TabsContent value="balancing" className="space-y-4"><BalancingTab machineLoads={allMachineLoads} suggestions={balancingSuggestions} /></TabsContent>
          <TabsContent value="bottlenecks" className="space-y-4"><BottlenecksTab alerts={alerts} capacityByDate={capacityByDate} /></TabsContent>
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LeaderboardWidget />
              <OperatorGoalsWidget />
            </div>
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-sm text-title flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Tendência de Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EfficiencyAlertTrendChart alerts={allAlertHistory} />
                  </CardContent>
                </Card>
              </div>
              <EfficiencyAlertHistoryWidget />
            </div>
            <HistoryTab resolvedAlerts={resolvedAlerts} isLoading={historyLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
