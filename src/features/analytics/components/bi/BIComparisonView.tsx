import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, PieChart, Printer,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from '@/lib/recharts';
import { cn } from '@/lib/utils';
import { BIMetrics } from '@/features/analytics/types';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted-foreground))',
};

interface ComparisonViewProps {
  biMetrics: BIMetrics;
  biMetrics2: BIMetrics;
  getPeriodLabel: (filter?: string, range?: { from: Date; to: Date }) => string;
  periodFilter2: string;
  customRange2: { from: Date; to: Date };
  getComparisonDelta: (a: number, b: number) => { delta: number; trend: 'up' | 'down' | 'neutral' };
  ComparisonKPICard: React.ComponentType<{ title: string; value1: number; value2: number; icon: React.ElementType; format?: (v: number) => string; higherIsBetter?: boolean }>;
}

export function BIComparisonView({
  biMetrics, biMetrics2, getPeriodLabel, periodFilter2, customRange2,
  getComparisonDelta, ComparisonKPICard
}: ComparisonViewProps) {
  return (
    <>
      {/* Comparison Header */}
      <div className="flex items-center justify-center gap-4 py-6 animate-bounce-in">
        <Badge variant="default" className="text-lg py-3 px-6 shadow-glow-primary animate-pulse-glow">
          {getPeriodLabel()}
        </Badge>
        <span className="text-sm font-medium text-muted-foreground">vs</span>
        <Badge variant="secondary" className="text-lg py-3 px-6">
          {getPeriodLabel(periodFilter2, customRange2)}
        </Badge>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated hover:shadow-glow-primary transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Distribuição por Status
            </CardTitle>
            <CardDescription>Comparativo entre períodos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[{ data: biMetrics, label: 'Período 1', prefix: '1' }, { data: biMetrics2, label: 'Período 2', prefix: '2' }].map(({ data, label, prefix }) => (
                <div key={prefix}>
                  <p className="text-sm text-center text-muted-foreground mb-2">{label}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie data={data.statusDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {data.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${prefix}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {biMetrics.statusDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated hover:shadow-glow-primary transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance por Técnica
            </CardTitle>
            <CardDescription>Produção comparativa</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={biMetrics.techniquePerformance.slice(0, 6).map((t1) => {
                  const t2 = biMetrics2?.techniquePerformance.find((t) => t.id === t1.id);
                  return { name: t1.name, 'Período 1': t1.produced, 'Período 2': t2?.produced ?? 0 };
                })}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Período 1" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Período 2" fill={CHART_COLORS.muted} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Machine Utilization Comparison Table */}
      <Card className="card-elevated overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Comparativo de Utilização por Máquina
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Máquina</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Técnica</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-primary">P1 Jobs</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-primary">P1 Util.</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">P2 Jobs</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">P2 Util.</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Variação</th>
                </tr>
              </thead>
              <tbody>
                {biMetrics.machineUtilization.map((m1) => {
                  const m2 = biMetrics2?.machineUtilization.find((m) => m.id === m1.id);
                  const { delta, trend } = getComparisonDelta(m1.utilization, m2?.utilization ?? 0);
                  return (
                    <tr key={m1.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{m1.name}</td>
                      <td className="py-3 px-4"><Badge variant="outline" className="text-xs">{m1.technique}</Badge></td>
                      <td className="py-3 px-4 text-center text-primary">{m1.totalJobs}</td>
                      <td className="py-3 px-4 text-center text-primary font-medium">{m1.utilization.toFixed(0)}%</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{m2?.totalJobs ?? 0}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{(m2?.utilization ?? 0).toFixed(0)}%</td>
                      <td className="py-3 px-4 text-right">
                        <span className={cn("flex items-center justify-end gap-1 text-sm",
                          trend === 'up' ? "text-green-500" : trend === 'down' ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {trend === 'up' ? <ArrowUp className="h-3 w-3" /> : trend === 'down' ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {delta.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
