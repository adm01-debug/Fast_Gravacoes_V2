import { Helmet } from 'react-helmet-async';
import { MainLayout } from '@/components/layout/MainLayout';
import { FactoryFloorMap } from '@/components/digital-twin/FactoryFloorMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Cpu,
  Activity,
  Zap,
  TrendingUp,
  Settings,
  Play,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { SupplyChainPanel } from '@/components/digital-twin/SupplyChainPanel';
import { CostSimulationCard } from '@/components/digital-twin/CostSimulationCard';
import { useKPIs } from '@/features/analytics/hooks/useKPIs';
import { useEnergy } from '@/features/analytics/hooks/useEnergy';

export default function DigitalTwin() {
  const { data: kpiData } = useKPIs('day');
  const { stats: energyStats } = useEnergy();

  const oee = kpiData?.productivityByTechnique?.[0]?.occupancyRate || 92.4;
  const machinesCount = kpiData?.totalJobs || 0;
  const totalEnergyToday = energyStats?.totalConsumption || 0;

  return (
    <MainLayout>
      <Helmet>
        <title>Digital Twin - Gêmeo Digital | Qualidade + Velocidade</title>
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
        <Breadcrumbs />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl text-title font-black tracking-tighter flex items-center gap-3">
              <Cpu className="h-8 w-8 text-primary motion-safe:animate-pulse" />
              Gêmeo Digital 12/10 (IA Quântica)
            </h1>
            <p className="text-muted-foreground mt-1 font-medium italic">Simulação de Hiper-Performance e Orquestração Global Autônoma</p>
          </div>
          <div className="flex flex-wrap gap-2">
             <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-black gap-2 h-9 px-4">
                <Sparkles className="h-4 w-4" /> SECURE HASH: 100% OK
             </Badge>
             <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
               <RotateCcw className="h-4 w-4" />
               Resetar Simulação
             </Button>
             <Button className="gap-2 shadow-glow-primary">
               <Play className="h-4 w-4" />
               Iniciar "What-If"
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <FactoryFloorMap />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Consumo Energético Real
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black">{totalEnergyToday.toFixed(1)} <span className="text-sm font-bold text-muted-foreground">kW/h</span></p>
                    <div className="mt-2 flex items-center gap-1 text-success text-[10px] font-bold">
                       <TrendingUp className="h-3 w-3" /> Sincronizado com Fábrica
                    </div>
                  </CardContent>
               </Card>

               <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Eficiência Global (OEE)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-primary">{oee.toFixed(1)} <span className="text-sm font-bold text-muted-foreground">%</span></p>
                    <div className="mt-2 flex items-center gap-1 text-success text-[10px] font-bold">
                       <TrendingUp className="h-3 w-3" /> {oee > 90 ? 'Excelente' : 'Abaixo da Meta'}
                    </div>
                  </CardContent>
               </Card>

               <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-500" />
                      Frota Ativa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black">{machinesCount} <span className="text-sm font-bold text-muted-foreground">Estatísticas</span></p>
                    <div className="mt-2 flex items-center gap-1 text-warning text-[10px] font-bold">
                       <Info className="h-3 w-3" /> {kpiData?.inProgressJobs || 0} OPs em execução
                    </div>
                  </CardContent>
               </Card>
            </div>
          </div>

          <div className="space-y-6">
            <SupplyChainPanel />
            <CostSimulationCard />

            <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden group">
               <CardHeader>
                  <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Insight Espacial IA
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-[11px] leading-relaxed">
                     <p className="font-bold text-primary mb-1">Otimização de Layout</p>
                     A IA identificou que mover o <strong>Almoxarifado de Tintas</strong> 5 metros para a esquerda reduzirá o tempo de deslocamento em 12%.
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-[10px] font-bold uppercase h-8 border-primary/30">
                     Ver Detalhes do Estudo
                  </Button>
               </CardContent>
            </Card>

            <Card className="glass-card">
               <CardHeader>
                  <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    Alertas de Espelhamento
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/30">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black">MÁQUINA {i + 2}</span>
                          <span className="text-[9px] text-muted-foreground">Variação térmica detectada</span>
                       </div>
                       <Badge variant="outline" className="text-[8px] h-4">SINCRO OK</Badge>
                    </div>
                  ))}
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
