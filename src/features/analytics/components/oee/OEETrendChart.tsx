import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from '@/lib/recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TrendDataPoint {
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

interface OEETrendChartProps {
  data: TrendDataPoint[];
  worldClassBenchmark: number;
  comparison?: {
    currentOEE: number;
    previousOEE: number;
    currentAvailability: number;
    previousAvailability: number;
    currentPerformance: number;
    previousPerformance: number;
    currentQuality: number;
    previousQuality: number;
  };
}

import { memo } from 'react';

export const OEETrendChart = memo(function OEETrendChart({ data, worldClassBenchmark, comparison }: OEETrendChartProps) {

  const chartData = useMemo(() => {
    // Show data points based on the comparison requirement
    // If we have comparison data, we show the full trend to visualize the periods
    return data.map(d => ({
      ...d,
      dateLabel: format(parseISO(d.date), 'dd/MM', { locale: ptBR })
    }));
  }, [data]);

  const oeeDiff = comparison ? comparison.currentOEE - comparison.previousOEE : 0;
  const availabilityDiff = comparison ? comparison.currentAvailability - comparison.previousAvailability : 0;
  const performanceDiff = comparison ? comparison.currentPerformance - comparison.previousPerformance : 0;
  const qualityDiff = comparison ? comparison.currentQuality - comparison.previousQuality : 0;

  const isPositive = oeeDiff > 0;
  const isNegative = oeeDiff < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between font-black text-sm uppercase tracking-wider">
          <span>Evolução do OEE (Timeline Comparativa)</span>
          {comparison && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn(
                "flex items-center gap-1 px-2 py-1",
                oeeDiff > 0 ? "text-success border-success/30 bg-success/10" :
                oeeDiff < 0 ? "text-red-500 border-red-500/30 bg-red-500/10" :
                "text-muted-foreground border-border bg-muted/20"
              )}>
                {oeeDiff > 0 ? <TrendingUp className="h-3 w-3" /> :
                 oeeDiff < 0 ? <TrendingDown className="h-3 w-3" /> :
                 <Minus className="h-3 w-3" />}
                <span className="text-xs font-bold">
                  OEE: {oeeDiff > 0 ? '+' : ''}{oeeDiff.toFixed(1)}%
                </span>
              </Badge>

              <Badge variant="outline" className={cn(
                "flex items-center gap-1 px-2 py-1 text-[10px]",
                availabilityDiff >= 0 ? "text-success/80" : "text-red-500/80"
              )}>
                Disponibilidade: {availabilityDiff > 0 ? '+' : ''}{availabilityDiff.toFixed(1)}%
              </Badge>

              <Badge variant="outline" className={cn(
                "flex items-center gap-1 px-2 py-1 text-[10px]",
                performanceDiff >= 0 ? "text-success/80" : "text-red-500/80"
              )}>
                Desempenho: {performanceDiff > 0 ? '+' : ''}{performanceDiff.toFixed(1)}%
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={v => `${v}%`}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    oee: 'OEE',
                    availability: 'Disponibilidade',
                    performance: 'Performance',
                    quality: 'Qualidade'
                  };
                  return [`${value.toFixed(1)}%`, labels[name] || name];
                }}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    oee: 'OEE',
                    availability: 'Disponibilidade',
                    performance: 'Performance',
                    quality: 'Qualidade'
                  };
                  return labels[value] || value;
                }}
              />

              {/* World-class benchmark line */}
              <ReferenceLine
                y={worldClassBenchmark}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                label={{
                  value: 'World Class',
                  position: 'right',
                  fontSize: 10,
                  fill: 'hsl(var(--primary))'
                }}
              />

              <Line
                type="monotone"
                dataKey="oee"
                stroke="hsl(var(--primary))"
                strokeWidth={4}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                animationDuration={2000}
              />
              <Line
                type="monotone"
                dataKey="availability"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(142 76% 36%)', strokeWidth: 1, r: 3 }}
                animationDuration={2500}
              />
              <Line
                type="monotone"
                dataKey="performance"
                stroke="hsl(221 83% 53%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(221 83% 53%)', strokeWidth: 1, r: 3 }}
                animationDuration={3000}
              />
              <Line
                type="monotone"
                dataKey="quality"
                stroke="hsl(262 83% 58%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(262 83% 58%)', strokeWidth: 1, r: 3 }}
                animationDuration={3500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
