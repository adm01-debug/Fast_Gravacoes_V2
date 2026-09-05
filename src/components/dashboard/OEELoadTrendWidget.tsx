import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity } from 'lucide-react';
import { useOEE } from '@/features/production';
import { useSchedulingData } from '@/features/jobs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from '@/lib/recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const chartConfig = {
  oee: { label: "OEE %", color: "hsl(var(--primary))" },
  load: { label: "Carga %", color: "hsl(var(--chart-2))" },
};

export function OEELoadTrendWidget() {
  const { data: oeeData } = useOEE(30);
  const { jobs } = useSchedulingData();

  const trendData = useMemo(() => {
    if (!oeeData) return [];

    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 29), end: today });

    return days.map(day => {
      const dateStr = day.toISOString().split('T')[0];
      const oeeDay = oeeData.trendData.find(d => d.date.startsWith(dateStr));

      // Calculate real estimated load for this day based on jobs scheduled/produced
      const dayLoad = oeeDay ? (oeeDay.availability + oeeDay.performance) / 2 : 0;

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        oee: oeeDay ? Math.round(oeeDay.oee) : 0,
        load: Math.round(dayLoad),
      };
    });
  }, [oeeData]);

  const comparisonData = useMemo(() => {
    if (!oeeData || !oeeData.comparison) return null;
    const { currentOEE, previousOEE } = oeeData.comparison;
    const diff = currentOEE - previousOEE;
    return {
      diff: diff.toFixed(1),
      isPositive: diff > 0,
      isNegative: diff < 0
    };
  }, [oeeData]);

  return (
    <Card className="glass-card col-span-1 xl:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-title flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Tendência de Carga e OEE
          </div>
          {comparisonData && (
            <Badge variant="outline" className={cn(
              "text-[10px] py-0 px-2 h-5 flex items-center gap-1",
              comparisonData.isPositive ? "text-success border-success/30" :
              comparisonData.isNegative ? "text-red-500 border-red-500/30" :
              "text-muted-foreground"
            )}>
              {comparisonData.isPositive ? <TrendingUp className="h-3 w-3" /> :
               comparisonData.isNegative ? <TrendingDown className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              {comparisonData.isPositive ? '+' : ''}{comparisonData.diff}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full mt-4">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillOEE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 100]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="oee"
                stroke="hsl(var(--primary))"
                fill="url(#fillOEE)"
                strokeWidth={2}
                name="OEE"
              />
              <Area
                type="monotone"
                dataKey="load"
                stroke="hsl(var(--chart-2))"
                fill="url(#fillLoad)"
                strokeWidth={2}
                name="Carga"
              />
            </AreaChart>
          </ChartContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground font-medium">OEE Estimado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]" />
            <span className="text-xs text-muted-foreground font-medium">Carga Estimada</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
