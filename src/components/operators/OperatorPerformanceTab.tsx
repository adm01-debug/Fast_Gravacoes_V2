import { useOperatorEvolution } from '@/features/production';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from '@/lib/recharts';
import { TrendingUp, Target, AlertCircle, Package } from 'lucide-react';

interface OperatorPerformanceTabProps {
  operatorId: string;
}

export function OperatorPerformanceTab({ operatorId }: OperatorPerformanceTabProps) {
  const { evolutionData, isLoading } = useOperatorEvolution(30);

  const operatorData = evolutionData.find(d => d.operatorId === operatorId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!operatorData || operatorData.dailyData.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl">
        <p className="text-muted-foreground">Sem dados de produção suficientes nos últimos 30 dias.</p>
      </div>
    );
  }

  // Calculate averages for the summary cards
  const totalPieces = operatorData.dailyData.reduce((sum, d) => sum + d.piecesProduced, 0);
  const totalLost = operatorData.dailyData.reduce((sum, d) => sum + d.piecesLost, 0);
  const avgEfficiency = operatorData.dailyData.reduce((sum, d) => sum + d.efficiencyScore, 0) / operatorData.dailyData.filter(d => d.jobsCompleted > 0).length || 0;
  const avgLossRate = totalPieces > 0 ? (totalLost / (totalPieces + totalLost)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgEfficiency)}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Eficiência Média</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPieces}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Peças Produzidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/5 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgLossRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Taxa de Perda</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Eficiência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={operatorData.dailyData}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="dateLabel"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(operatorData.dailyData.length / 7)}
                />
                <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="efficiencyScore"
                  name="Eficiência (%)"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorEff)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Produção vs Perda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operatorData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dateLabel" fontSize={10} axisLine={false} tickLine={false} interval={7} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="piecesProduced" name="Produzidas" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="piecesLost" name="Perdas" fill="#ef4444" stackId="a" radius={[2, 2, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Taxa de Perda (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={operatorData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dateLabel" fontSize={10} axisLine={false} tickLine={false} interval={7} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lossRate"
                    name="Taxa de Perda (%)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
