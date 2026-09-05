import { useMTBFMTTR } from '@/features/production';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Wrench, Activity, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from '@/lib/recharts';

interface MachineReliabilityTabProps {
  machineId: string;
}

export function MachineReliabilityTab({ machineId }: MachineReliabilityTabProps) {
  const { metrics, isLoading } = useMTBFMTTR(90); // Last 90 days

  const machineMetrics = metrics.find(m => m.machineId === machineId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!machineMetrics) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
        <div className="space-y-1">
          <p className="font-medium">Sem dados de manutenção corretiva</p>
          <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
            Esta máquina não possui registros de falhas nos últimos 90 dias para calcular métricas de confiabilidade.
          </p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'excellent': return 'text-indicator-success bg-indicator-success/10';
      case 'good': return 'text-indicator-info bg-indicator-info/10';
      case 'moderate': return 'text-indicator-warning bg-indicator-warning/10';
      case 'poor': return 'text-priority-high bg-priority-high/10';
      case 'critical': return 'text-indicator-danger bg-indicator-danger/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getScoreLabel = (score: string) => {
    switch (score) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bom';
      case 'moderate': return 'Moderado';
      case 'poor': return 'Ruim';
      case 'critical': return 'Crítico';
      default: return score;
    }
  };

  const chartData = [
    { name: 'MTBF (h)', value: machineMetrics.mtbf ? Math.round(machineMetrics.mtbf) : 0, color: '#3b82f6' },
    { name: 'MTTR (min)', value: machineMetrics.mttr ? Math.round(machineMetrics.mttr) : 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Índice de Confiabilidade
            <Badge variant="outline" className={getScoreColor(machineMetrics.reliabilityScore)}>
              {getScoreLabel(machineMetrics.reliabilityScore)}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">Baseado nos últimos 90 dias de operação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-secondary/20 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-2 rounded-full bg-indicator-info/10 text-indicator-info">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold">{machineMetrics.mtbf ? `${Math.round(machineMetrics.mtbf)}h` : 'N/A'}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">MTBF</p>
                <p className="text-[10px] text-muted-foreground">Tempo Médio entre Falhas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/20 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-2 rounded-full bg-indicator-danger/10 text-indicator-danger">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold">{machineMetrics.mttr ? `${Math.round(machineMetrics.mttr)}m` : 'N/A'}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">MTTR</p>
                <p className="text-[10px] text-muted-foreground">Tempo Médio para Reparo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/20 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-2 rounded-full bg-success/10 text-success">
                <Activity className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold">{Math.round(machineMetrics.availability)}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Disponibilidade</p>
                <p className="text-[10px] text-muted-foreground">Tempo Disponível Real</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Disponibilidade Geral</span>
          <span className="font-medium">{Math.round(machineMetrics.availability)}%</span>
        </div>
        <Progress value={machineMetrics.availability} className="h-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Estatísticas de Falhas</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-indicator-warning" />
                <span className="text-sm">Total de Falhas</span>
              </div>
              <span className="font-bold">{machineMetrics.totalFailures}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-indicator-info" />
                <span className="text-sm">Tempo Total em Reparo</span>
              </div>
              <span className="font-bold">{machineMetrics.totalRepairTime} min</span>
            </div>
            {machineMetrics.lastFailure && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Última Falha</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(machineMetrics.lastFailure).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-[200px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
