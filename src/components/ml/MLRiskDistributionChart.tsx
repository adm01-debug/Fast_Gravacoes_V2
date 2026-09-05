import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from '@/lib/recharts';
import { MachinePrediction } from '@/features/analytics/hooks/useMLPredictions';

interface MLRiskDistributionChartProps {
  predictions: MachinePrediction[];
}

export function MLRiskDistributionChart({ predictions }: MLRiskDistributionChartProps) {
  // Create risk distribution data
  const riskRanges = [
    { range: '0-20', label: 'Mínimo', color: '#22c55e', count: 0 },
    { range: '20-40', label: 'Baixo', color: '#84cc16', count: 0 },
    { range: '40-60', label: 'Médio', color: '#eab308', count: 0 },
    { range: '60-80', label: 'Alto', color: '#f97316', count: 0 },
    { range: '80-100', label: 'Crítico', color: 'hsl(24, 95%, 50%)', count: 0 },
  ];

  predictions.forEach(p => {
    const score = Number(p.risk_score);
    if (score < 20) riskRanges[0].count++;
    else if (score < 40) riskRanges[1].count++;
    else if (score < 60) riskRanges[2].count++;
    else if (score < 80) riskRanges[3].count++;
    else riskRanges[4].count++;
  });

  // Calculate trend (simulated - would use historical data in production)
  const highRiskCount = predictions.filter(p => Number(p.risk_score) >= 60).length;
  const totalCount = predictions.length;
  const highRiskPercentage = totalCount > 0 ? (highRiskCount / totalCount) * 100 : 0;

  const getTrendIcon = () => {
    if (highRiskPercentage > 30) return <TrendingUp className="h-4 w-4 text-primary" />;
    if (highRiskPercentage > 15) return <Minus className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-success" />;
  };

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg text-title">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Distribuição de Risco
          </span>
          <div className="flex items-center gap-2 text-sm font-normal">
            {getTrendIcon()}
            <span className="text-muted-foreground">
              {highRiskPercentage.toFixed(0)}% alto risco
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={riskRanges} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value} máquinas`, 'Quantidade']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {riskRanges.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {riskRanges.map((range) => (
            <div key={range.range} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: range.color }}
              />
              <span className="text-xs text-muted-foreground">
                {range.label}: {range.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
