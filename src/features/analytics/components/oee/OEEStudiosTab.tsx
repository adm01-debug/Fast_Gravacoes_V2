import { lazy, Suspense } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Clock,
  Droplets,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/loading';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import { getOEEColor } from '@/features/production';
import type { OEEData } from '@/features/production/hooks/useOEE';

const StudioEfficiencyGrid = lazy(() => import('@/features/analytics/components/oee/StudioEfficiencyGrid').then(m => ({ default: m.StudioEfficiencyGrid })));
const StudioHealthMonitor = lazy(() => import('@/features/analytics/components/oee/StudioHealthMonitor').then(m => ({ default: m.StudioHealthMonitor })));
const MaterialEfficiencyChart = lazy(() => import('@/features/analytics/components/oee/MaterialEfficiencyChart').then(m => ({ default: m.MaterialEfficiencyChart })));

interface OEEStudiosTabProps {
  data: OEEData;
  machineId: string;
  machinesAtWorldClass: number;
  machinesBelowTarget: number;
  activeMachinesCount: number;
}

export function OEEStudiosTab({ data, machineId, machinesAtWorldClass, machinesBelowTarget, activeMachinesCount }: OEEStudiosTabProps) {
  return (
    <>

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
          
    </>
  );
}
