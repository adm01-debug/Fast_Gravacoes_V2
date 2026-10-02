import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Target,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/loading';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import type { BenchmarkConfig } from '@/features/analytics/constants/oee';
import type { OEEData } from '@/features/production/hooks/useOEE';

const OEEGaugeCard = lazy(() => import('@/features/analytics/components/oee/OEEGaugeCard').then(m => ({ default: m.OEEGaugeCard })));
const OEETrendChart = lazy(() => import('@/features/analytics/components/oee/OEETrendChart').then(m => ({ default: m.OEETrendChart })));
const OEERecommendations = lazy(() => import('@/features/analytics/components/oee/OEERecommendations').then(m => ({ default: m.OEERecommendations })));
const OEEHeatmap = lazy(() => import('@/features/analytics/components/oee/OEEHeatmap').then(m => ({ default: m.OEEHeatmap })));
const StudioEfficiencyGrid = lazy(() => import('@/features/analytics/components/oee/StudioEfficiencyGrid').then(m => ({ default: m.StudioEfficiencyGrid })));
const StudioHealthMonitor = lazy(() => import('@/features/analytics/components/oee/StudioHealthMonitor').then(m => ({ default: m.StudioHealthMonitor })));

interface OEEOverviewTabProps {
  data: OEEData;
  machineId: string;
  currentBenchmark: BenchmarkConfig;
}

export function OEEOverviewTab({ data, machineId, currentBenchmark }: OEEOverviewTabProps) {
  const { t } = useTranslation();
  return (
    <>

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


          
    </>
  );
}
