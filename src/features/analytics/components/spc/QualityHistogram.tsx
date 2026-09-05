import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from '@/lib/recharts';
import { SPCParameter } from '@/features/analytics/hooks/useSPC';

interface QualityHistogramProps {
  parameter: SPCParameter;
  measurements: Array<{ mean_value?: number; values?: number[] }>;
}

export function QualityHistogram({ parameter, measurements }: QualityHistogramProps) {
  const data = useMemo(() => {
    if (!measurements || measurements.length === 0) return [];

    // Flatten all individual measurements from samples if available, or use mean values
    const values = measurements.flatMap(m => m.values ?? (m.mean_value !== undefined ? [m.mean_value] : [])).filter((v): v is number => typeof v === 'number');
    const min = Math.min(...values, parameter.lower_spec_limit);
    const max = Math.max(...values, parameter.upper_spec_limit);
    const range = max - min;
    const binCount = 10;
    const binSize = range > 0 ? range / binCount : 1;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      binStart: min + i * binSize,
      binEnd: min + (i + 1) * binSize,
      count: 0,
      label: (min + i * binSize + binSize / 2).toFixed(2)
    }));

    values.forEach(v => {
      const binIdx = Math.min(Math.floor((v - min) / binSize), binCount - 1);
      if (binIdx >= 0) bins[binIdx].count++;
    });

    return bins;
  }, [measurements, parameter]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-title uppercase tracking-wider text-muted-foreground">Distribuição de Frequência (Histograma)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="label" fontSize={10} />
              <YAxis fontSize={10} hide />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '10px' }}
                cursor={{ fill: 'hsl(var(--primary)/0.1)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => {
                  const isOutOfSpec = entry.binStart < parameter.lower_spec_limit || entry.binEnd > parameter.upper_spec_limit;
                  return <Cell key={`cell-${index}`} fill={isOutOfSpec ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} fillOpacity={0.6} />;
                })}
              </Bar>
              <ReferenceLine x={parameter.target_value.toFixed(2)} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ position: 'top', value: 'Alvo', fontSize: 10, fill: 'hsl(var(--primary))' }} />
              <ReferenceLine x={parameter.lower_spec_limit.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ position: 'top', value: 'LSL', fontSize: 10, fill: 'hsl(var(--destructive))' }} />
              <ReferenceLine x={parameter.upper_spec_limit.toFixed(2)} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ position: 'top', value: 'USL', fontSize: 10, fill: 'hsl(var(--destructive))' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center gap-4 text-[10px] font-medium uppercase text-muted-foreground">
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-primary/60" /> Em Especificação</div>
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-destructive/60" /> Fora de Especificação</div>
        </div>
      </CardContent>
    </Card>
  );
}
