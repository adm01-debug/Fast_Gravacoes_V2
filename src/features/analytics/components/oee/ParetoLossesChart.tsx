import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from '@/lib/recharts';
import { Badge } from '@/components/ui/badge';

interface ParetoLossesChartProps {
  losses: Array<{ notes?: string | null; quantity?: number | null }>;
}

export const ParetoLossesChart = memo(function ParetoLossesChart({ losses }: ParetoLossesChartProps) {
  const paretoData = useMemo(() => {
    if (!losses || losses.length === 0) return [];

    // Group by reason (extracted from notes)
    const reasons: Record<string, number> = {};
    losses.forEach(loss => {
      const reason = loss.notes || 'Causa não informada';
      reasons[reason] = (reasons[reason] || 0) + (loss.quantity || 1);
    });

    // Sort by frequency descending
    const sortedReasons = Object.entries(reasons)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const total = sortedReasons.reduce((sum, item) => sum + item.value, 0);
    
    let cumulative = 0;
    return sortedReasons.map(item => {
      cumulative += item.value;
      return {
        ...item,
        cumulativePercentage: Math.round((cumulative / total) * 100)
      };
    });
  }, [losses]);

  if (paretoData.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
          Análise de Pareto (Regra 80/20)
        </CardTitle>
        <Badge variant="outline" className="text-[10px] font-black border-primary/30 text-primary">CRITICAL CAUSES</Badge>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={paretoData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} 
                angle={-45} 
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: '% Acumulada', angle: 90, position: 'insideRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }} 
              />
              <Bar 
                yAxisId="left" 
                dataKey="value" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              >
                {paretoData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.cumulativePercentage <= 80 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.5)'} 
                  />
                ))}
              </Bar>
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cumulativePercentage" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--destructive))' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Insight:</strong> Os itens destacados em <span className="text-primary font-bold">Azul</span> representam as causas que somam até 80% das suas perdas. Focar na resolução destes problemas trará o maior retorno em eficiência.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});