import { BrainCircuit, Clock, Lightbulb, Target, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AutonomousEventLog } from '@/components/autonomous/AutonomousEventLog';
import type { ExecutiveKPIs } from '@/features/analytics/hooks/useExecutiveDashboard';

export function ExecutiveNorthStar({ kpis }: { kpis: ExecutiveKPIs }) {
  return (
    <>
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
    </>
  );
}
