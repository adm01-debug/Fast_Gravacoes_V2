import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from '@/lib/recharts';
import { usePackagingDelayPareto } from '../hooks/usePackagingDelayPareto';

interface Props {
  days: number;
}

export function PackagingDelayParetoCard({ days }: Props) {
  const { data, isLoading } = usePackagingDelayPareto(days);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Motivos de atraso (Pareto)</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum motivo de atraso registrado no período.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.map((d) => ({ ...d, cumulativePct: Math.round(d.cumulativePct * 100) }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={70}
              />
              <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="count"
                fill="hsl(var(--amber-400, var(--primary)))"
                name="Ocorrências"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativePct"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name="Acumulado (%)"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
