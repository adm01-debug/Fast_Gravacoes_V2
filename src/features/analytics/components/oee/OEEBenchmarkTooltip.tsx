import { TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { OEEData } from '@/features/production/hooks/useOEE';

export function OEEBenchmarkTooltip({ data }: { data: OEEData }) {
  return (
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
  );
}
