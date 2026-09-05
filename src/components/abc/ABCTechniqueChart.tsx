import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from '@/lib/recharts';
import { TechniqueCostSummary } from '@/hooks/useABCCosts';

interface ABCTechniqueChartProps {
  data: TechniqueCostSummary[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ABCTechniqueChart({ data }: ABCTechniqueChartProps) {
  const chartData = data
    .sort((a, b) => b.avg_unit_cost - a.avg_unit_cost)
    .slice(0, 10)
    .map((item, index) => ({
      name: item.technique_name.length > 15
        ? item.technique_name.substring(0, 15) + '...'
        : item.technique_name,
      fullName: item.technique_name,
      custo_unitario: item.avg_unit_cost,
      custo_total: item.total_cost,
      jobs: item.total_jobs,
      quantidade: item.total_quantity,
      color: COLORS[index % COLORS.length],
    }));

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-title">
          <BarChart3 className="h-5 w-5 text-primary" />
          Custo Unitário por Técnica
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                type="number"
                tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'custo_unitario') {
                    return [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Custo Unitário'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const item = payload[0].payload;
                    return `${item.fullName} (${item.jobs} jobs, ${item.quantidade.toLocaleString()} unid.)`;
                  }
                  return label;
                }}
              />
              <Bar dataKey="custo_unitario" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de custo disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
