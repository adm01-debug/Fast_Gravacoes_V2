import { useEnergy } from '@/features/analytics/hooks/useEnergy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from '@/lib/recharts';

export function EnergyWidget() {
  const { stats, isLoading } = useEnergy();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = stats.costTrend < 0; // Negative cost trend is good

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.25s]">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm text-title flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Zap className="w-3 h-3 text-yellow-500" />
            </div>
            <span className="gradient-text">Consumo de Energia</span>
          </div>
          <Badge variant="outline" className={`text-[10px] h-5 ${isPositiveTrend ? 'text-success bg-success/10 border-success/20' : 'text-destructive bg-destructive/10 border-destructive/20'}`}>
            {isPositiveTrend ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
            {Math.abs(Math.round(stats.costTrend))}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Mês</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">{Math.round(stats.totalConsumption)}</span>
              <span className="text-xs text-muted-foreground">kWh</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Custo Estimado</p>
            <div className="flex items-baseline gap-1 text-primary">
              <span className="text-xs font-bold">R$</span>
              <span className="text-xl font-bold">{Math.round(stats.totalCost)}</span>
            </div>
          </div>
        </div>

        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.dailyConsumption}>
              <defs>
                <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                hide
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                formatter={(value: number) => [`${value} kWh`, 'Consumo']}
              />
              <Area
                type="monotone"
                dataKey="consumption"
                stroke="#eab308"
                fillOpacity={1}
                fill="url(#colorEnergy)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
