import { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp as TrendingUpIcon } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend, Line, Area, AreaChart,
} from '@/lib/recharts';
import { format } from 'date-fns';

function calculateLinearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumXX = data.reduce((sum, d) => sum + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

interface EvolutionChartProps {
  evolutionData: { operatorId: string; operatorName: string; dailyData: { dateLabel: string; efficiencyScore: number; jobsCompleted: number; piecesProduced: number }[] }[];
  overallDailyData: { dateLabel: string; efficiencyScore: number; jobsCompleted: number; piecesProduced: number }[];
  selectedOperatorId: string | 'all';
  onOperatorChange: (id: string | 'all') => void;
  isLoading: boolean;
}

export const EvolutionChart = memo(({ evolutionData, overallDailyData, selectedOperatorId, onOperatorChange, isLoading }: EvolutionChartProps) => {
  const FORECAST_DAYS = 7;

  const { chartData, trendDirection, forecastValue } = useMemo(() => {
    const baseData = selectedOperatorId === 'all'
      ? overallDailyData
      : evolutionData.find(o => o.operatorId === selectedOperatorId)?.dailyData || [];

    const dataWithActivity = baseData.map((d, i) => ({ x: i, y: d.efficiencyScore, ...d })).filter(d => d.efficiencyScore > 0);
    const { slope, intercept } = calculateLinearRegression(dataWithActivity);

    const dataWithTrend = baseData.map((d, i) => ({
      ...d,
      efficiency: Math.round(d.efficiencyScore * 10) / 10,
      trend: Math.round(Math.max(0, Math.min(100, intercept + slope * i)) * 10) / 10,
      isForecast: false,
    }));

    const lastIndex = baseData.length - 1;
    const forecastData = Array.from({ length: FORECAST_DAYS }, (_, i) => {
      const idx = lastIndex + i + 1;
      const val = Math.max(0, Math.min(100, intercept + slope * idx));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i + 1);
      return {
        dateLabel: format(futureDate, 'dd/MM'),
        efficiencyScore: 0, jobsCompleted: 0, piecesProduced: 0,
        efficiency: null as number | null,
        trend: Math.round(val * 10) / 10,
        isForecast: true,
        forecast: Math.round(val * 10) / 10,
      };
    });

    return {
      chartData: [...dataWithTrend, ...forecastData],
      trendDirection: (slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      forecastValue: forecastData[forecastData.length - 1]?.forecast || 0,
    };
  }, [selectedOperatorId, evolutionData, overallDailyData]);

  const operatorOptions = useMemo(() => [
    { id: 'all', name: 'Média Geral' },
    ...evolutionData.map(o => ({ id: o.operatorId, name: o.operatorName })),
  ], [evolutionData]);

  if (isLoading) {
    return (
      <Card className="card-elevated col-span-full">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="h-[300px]"><Skeleton className="h-full w-full" /></CardContent>
      </Card>
    );
  }

  const hasData = chartData.some(d => d.efficiencyScore > 0);

  return (
    <Card className="card-elevated col-span-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Evolução da Eficiência
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              Acompanhamento diário com tendência e previsão de {FORECAST_DAYS} dias
              {hasData && (
                <Badge variant="outline" className={
                  trendDirection === 'up' ? 'text-success border-success' :
                  trendDirection === 'down' ? 'text-destructive border-destructive' :
                  'text-muted-foreground'
                }>
                  {trendDirection === 'up' ? '↑ Tendência de alta' : trendDirection === 'down' ? '↓ Tendência de queda' : '→ Estável'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasData && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Previsão em {FORECAST_DAYS} dias</p>
                <p className={`text-lg font-bold ${forecastValue >= 70 ? 'text-success' : forecastValue >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {forecastValue}%
                </p>
              </div>
            )}
            <Select value={selectedOperatorId} onValueChange={onOperatorChange}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecionar operador" /></SelectTrigger>
              <SelectContent>
                {operatorOptions.map(op => <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px]">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">Nenhum dado de produção disponível para o período</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="dateLabel" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                formatter={(value: string | number | (string | number)[], name: string) => {
                  if (value === null || value === undefined) return ['-', ''];
                  if (name === 'efficiency') return [`${value}%`, 'Eficiência'];
                  if (name === 'trend') return [`${value}%`, 'Tendência'];
                  if (name === 'forecast') return [`${value}%`, 'Previsão'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  const point = payload?.[0]?.payload;
                  return point?.isForecast ? `Previsão: ${label}` : `Data: ${label}`;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => {
                if (value === 'efficiency') return 'Eficiência Real';
                if (value === 'trend') return 'Linha de Tendência';
                if (value === 'forecast') return 'Previsão';
                return value;
              }} />
              <Area type="monotone" dataKey="efficiency" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#efficiencyGradient)" dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: 'hsl(var(--primary))' }} connectNulls={false} />
              <Line type="monotone" dataKey="trend" stroke="hsl(var(--warning))" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: 'hsl(var(--warning))' }} />
              <Area type="monotone" dataKey="forecast" stroke="hsl(var(--success))" strokeWidth={2} strokeDasharray="3 3" fill="url(#forecastGradient)" dot={{ fill: 'hsl(var(--success))', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: 'hsl(var(--success))' }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});

EvolutionChart.displayName = 'EvolutionChart';
