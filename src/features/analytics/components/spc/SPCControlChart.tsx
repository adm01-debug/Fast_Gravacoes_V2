import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, BarChart2, Plus, Sparkles, TrendingUp, History, Info, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from '@/lib/recharts';
import { SPCParameter } from '@/features/analytics/hooks/useSPC';
import { cn } from '@/lib/utils';

interface SPCControlChartProps {
  selectedParameter: SPCParameter | null;
  chartData: Array<{
    sample: number; mean: number; range: number;
    ucl: number | null; lcl: number | null;
    usl: number; lsl: number; target: number; inControl: boolean;
  }>;
  capability: { cp: number; cpk: number; mean: number; stdDev: number; performance: string } | null;
  onCalculateLimits: () => void;
  onShowMeasurement: () => void;
  isCalculating: boolean;
}

export function SPCControlChart({ selectedParameter, chartData, capability, onCalculateLimits, onShowMeasurement, isCalculating }: SPCControlChartProps) {
  return (
    <Card className="flex-1 glass-card border-primary/20 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight">
               <BarChart2 className="h-5 w-5 text-primary" />
               Gráfico de Controle X-barra
            </CardTitle>
            <CardDescription className="font-medium">{selectedParameter?.name || 'Selecione um parâmetro para análise'}</CardDescription>
          </div>
          {selectedParameter && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5" onClick={onCalculateLimits} disabled={isCalculating}>
                <TrendingUp className="h-3.5 w-3.5" />
                Calcular Limites
              </Button>
              <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5" onClick={onShowMeasurement}>
                <Plus className="h-3.5 w-3.5" />
                Nova Medição
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {selectedParameter && chartData.length > 0 ? (
          <div className="space-y-8">
            <div className="h-[300px] w-full bg-background/30 rounded-xl p-4 border border-border/40">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="controlZone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" vertical={false} />
                  <XAxis
                    dataKey="sample"
                    fontSize={10}
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    fontSize={10}
                    fontFamily="monospace"
                    domain={['auto', 'auto']}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  />

                  {/* Spec Limits (USL/LSL) - High Visibility */}
                  <ReferenceLine y={selectedParameter.upper_spec_limit} stroke="#ef4444" strokeWidth={1} label={{ value: 'USL', position: 'insideTopRight', fontSize: 9, fontWeight: 'bold', fill: '#ef4444' }} />
                  <ReferenceLine y={selectedParameter.lower_spec_limit} stroke="#ef4444" strokeWidth={1} label={{ value: 'LSL', position: 'insideBottomRight', fontSize: 9, fontWeight: 'bold', fill: '#ef4444' }} />

                  {/* Control Limits (UCL/LCL) - Derived from data */}
                  {selectedParameter.upper_control_limit && (
                    <ReferenceLine y={selectedParameter.upper_control_limit} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'UCL', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
                  )}
                  {selectedParameter.lower_control_limit && (
                    <ReferenceLine y={selectedParameter.lower_control_limit} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'LCL', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
                  )}

                  <ReferenceLine y={selectedParameter.target_value} stroke="hsl(var(--primary))" strokeOpacity={0.3} strokeWidth={2} label={{ value: 'Target', position: 'insideLeft', fontSize: 9, fill: 'hsl(var(--primary))', opacity: 0.5 }} />

                  <Line
                    type="monotone"
                    dataKey="mean"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    animationDuration={1000}
                    dot={(props: { cx: number; cy: number; payload: { inControl: boolean } }) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          cx={cx} cy={cy} r={5}
                          fill={payload.inControl ? 'hsl(var(--primary))' : '#ef4444'}
                          stroke="white"
                          strokeWidth={2}
                          className="drop-shadow-sm"
                        />
                      );
                    }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {capability && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Cp (Potencial)</p>
                  <p className={cn(
                    "text-2xl font-black",
                    capability.cp >= 1.33 ? "text-success" : capability.cp >= 1 ? "text-warning" : "text-red-500"
                  )}>{capability.cp.toFixed(2)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Cpk (Capabilidade)</p>
                  <p className={cn(
                    "text-2xl font-black",
                    capability.cpk >= 1.33 ? "text-success" : capability.cpk >= 1 ? "text-warning" : "text-red-500"
                  )}>{capability.cpk.toFixed(2)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Média do Processo</p>
                  <p className="text-2xl font-black text-foreground">{capability.mean.toFixed(3)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">Unidade: {selectedParameter.unit}</p>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                   <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Performance</p>
                      <Info className="h-3 w-3 text-muted-foreground opacity-40" />
                   </div>
                   <Badge variant="outline" className={cn(
                     "text-[10px] font-black uppercase tracking-tight",
                     capability.cpk >= 1.33 ? "text-success border-success/20 bg-success/5" :
                     capability.cpk >= 1 ? "text-warning border-warning/20 bg-warning/5" :
                     "text-red-500 border-red-500/20 bg-red-500/5"
                   )}>
                     {capability.performance}
                   </Badge>
                   <p className="text-[9px] text-muted-foreground mt-2 italic font-medium">StdDev: {capability.stdDev.toFixed(4)}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground bg-muted/5 rounded-3xl border-2 border-dashed border-border/40">
            <div className="p-4 rounded-full bg-muted/10 mb-4">
              <Activity className="h-10 w-10 opacity-30" />
            </div>
            <p className="font-bold text-lg">Análise Estatística</p>
            <p className="text-sm max-w-[250px] text-center mt-1">Selecione um parâmetro técnico à esquerda para visualizar o controle estatístico em tempo real.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
