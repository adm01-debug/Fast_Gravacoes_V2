import { BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExecutiveKPIs } from '@/features/analytics/hooks/useExecutiveDashboard';

export function ExecutiveChartsRow1({ kpis, showComparison }: { kpis: ExecutiveKPIs; showComparison: boolean }) {
  return (
    <>
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
    </>
  );
}
