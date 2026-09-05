import { useABCCosts } from '@/hooks/useABCCosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, PieChart, TrendingDown, Layers } from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from '@/lib/recharts';

interface JobCostsTabProps {
  jobId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function JobCostsTab({ jobId }: JobCostsTabProps) {
  const { getJobCostSummary, isLoading } = useABCCosts();

  const summary = getJobCostSummary(jobId);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!summary || summary.total_cost === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl space-y-3">
        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
        <div className="space-y-1">
          <p className="font-medium">Custos não calculados</p>
          <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
            Este job ainda não possui custos calculados pelo sistema ABC.
          </p>
        </div>
      </div>
    );
  }

  const chartData = summary.cost_breakdown.map((item, index) => ({
    name: item.pool_name,
    value: item.amount,
    percentage: item.percentage
  }));

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-1">
              <div className="p-2 rounded-full bg-primary/10 text-primary mb-1">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.total_cost)}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Custo Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-1">
              <div className="p-2 rounded-full bg-success/10 text-success mb-1">
                <TrendingDown className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.unit_cost)}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Custo Unitário</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          Composição de Custos
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{item.percentage.toFixed(1)}%</span>
                  <span className="text-muted-foreground">
                    ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.value)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-4 w-4 text-primary" />
          <h5 className="text-xs font-bold uppercase tracking-wider">Metodologia ABC</h5>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          O custeio baseado em atividades (ABC) aloca custos indiretos e fixos para cada job com base no consumo real de recursos (tempo de máquina, mão de obra, energia e suporte).
        </p>
      </div>
    </div>
  );
}
