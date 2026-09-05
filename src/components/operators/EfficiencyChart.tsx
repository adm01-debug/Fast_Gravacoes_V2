import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from '@/lib/recharts';
import { OperatorProductivityMetrics } from '@/features/production';

export const EfficiencyChart = memo(({ operators }: { operators: OperatorProductivityMetrics[] }) => {
  const chartData = operators
    .filter(o => o.isActive && o.totalJobsCompleted > 0)
    .slice(0, 10)
    .map(o => ({
      name: o.operatorName.split(' ')[0],
      efficiency: Math.round(o.efficiencyScore),
      jobs: o.totalJobsCompleted,
      pieces: o.totalPiecesProduced,
    }));

  if (chartData.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparativo de Eficiência
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nenhum dado de produção disponível
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Comparativo de Eficiência
        </CardTitle>
        <CardDescription>Top 10 operadores por score de eficiência</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" domain={[0, 100]} className="text-xs" />
            <YAxis dataKey="name" type="category" width={80} className="text-xs" />
            <RechartsTooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              formatter={(value: number, name: string) => [
                `${value}${name === 'efficiency' ? '%' : ''}`,
                name === 'efficiency' ? 'Eficiência' : name === 'jobs' ? 'Jobs' : 'Peças'
              ]}
            />
            <Bar dataKey="efficiency" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.efficiency >= 80 ? 'hsl(var(--success))' : entry.efficiency >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

EfficiencyChart.displayName = 'EfficiencyChart';
