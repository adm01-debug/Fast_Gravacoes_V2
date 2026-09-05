import { memo, useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from '@/lib/recharts';
import { ABCCostPool, ABCJobCost } from '@/hooks/useABCCosts';

interface ABCCostBreakdownChartProps {
  costPools: ABCCostPool[];
  jobCosts: ABCJobCost[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(217 91% 60%)',
];

export const ABCCostBreakdownChart = memo(function ABCCostBreakdownChart({ costPools, jobCosts }: ABCCostBreakdownChartProps) {
  const data = useMemo(() => {
    return costPools.map((pool, index) => {
      const poolCosts = jobCosts.filter(jc => jc.cost_pool_id === pool.id);
      const totalCost = poolCosts.reduce((sum, c) => sum + Number(c.total_cost), 0);

      return {
        name: pool.name,
        value: totalCost,
        color: COLORS[index % COLORS.length],
      };
    }).filter(d => d.value > 0);
  }, [costPools, jobCosts]);

  const totalCost = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
  }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-title">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Distribuição de Custos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Custo Total Alocado</p>
              <p className="text-display text-primary">
                {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    'Custo'
                  ]}
                />
                <Legend
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum custo alocado ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
});
