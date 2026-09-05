import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from '@/lib/recharts';
import { Clock, Gauge, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useProductionLosses } from '@/features/production';
import { Skeleton } from '@/components/ui/skeleton';

interface OEELossesChartProps {
  availabilityLosses: number;
  performanceLosses: number;
  qualityLosses: number;
  overallOEE: number;
}

import { memo } from 'react';

export const OEELossesChart = memo(function OEELossesChart({
  availabilityLosses,
  performanceLosses,
  qualityLosses,
  overallOEE
}: OEELossesChartProps) {
  const [showDrilldown, setShowDrilldown] = useState(true);
  const { losses, isLoading } = useProductionLosses();

  const lossCategories = useMemo(() => {
    if (!losses) return [];
    
    interface GroupedLoss {
      [key: string]: number;
    }

    const grouped = losses.reduce((acc: GroupedLoss, loss) => {
      const category = loss.notes?.includes('Qualidade') ? 'Qualidade' : 
                       loss.notes?.includes('Performance') ? 'Performance' : 
                       'Disponibilidade';
      acc[category] = (acc[category] || 0) + (loss.quantity || 0);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
      fill: name === 'Qualidade' ? 'hsl(48 96% 53%)' : 
            name === 'Performance' ? 'hsl(25 95% 53%)' : 
            'hsl(var(--destructive))'
    }));
  }, [losses]);

  const data = [
    {
      name: 'OEE Atual',
      value: overallOEE,
      color: 'hsl(var(--primary))',
      icon: Target
    },
    {
      name: 'Perdas Disponibilidade',
      value: availabilityLosses,
      color: 'hsl(var(--destructive))',
      icon: Clock
    },
    {
      name: 'Perdas Performance',
      value: performanceLosses,
      color: 'hsl(25 95% 53%)',
      icon: Gauge
    },
    {
      name: 'Perdas Qualidade',
      value: qualityLosses,
      color: 'hsl(48 96% 53%)',
      icon: Target
    }
  ];

  const waterfallData = [
    { name: '100%', value: 100, fill: 'hsl(var(--muted))' },
    { name: 'Disp.', value: -availabilityLosses, fill: 'hsl(var(--destructive))' },
    { name: 'Perf.', value: -performanceLosses, fill: 'hsl(25 95% 53%)' },
    { name: 'Qual.', value: -qualityLosses, fill: 'hsl(48 96% 53%)' },
    { name: 'OEE', value: overallOEE, fill: 'hsl(var(--primary))' }
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Análise de Perdas</CardTitle>
        <Badge variant="outline" className="text-[10px] font-bold">DETAILED ANALYSIS</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {data.map((item, index) => (
            <div
              key={item.name}
              className="p-4 rounded-lg border bg-card"
              style={{ borderColor: item.color }}
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="h-4 w-4" style={{ color: item.color }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
              <span
                className="text-2xl font-bold"
                style={{ color: item.color }}
              >
                {item.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        <div className="h-64 mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 60, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} />
              <Tooltip
                formatter={(value: number) => [`${Math.abs(value).toFixed(1)}%`]}
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid hsl(var(--primary)/0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1500} animationEasing="ease-out">
                {waterfallData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill} 
                    className="hover:opacity-80 transition-opacity cursor-pointer shadow-lg"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Interpretação:</strong> O OEE de{' '}
            <span className="font-bold text-primary">{overallOEE.toFixed(1)}%</span> representa
            a multiplicação de Disponibilidade × Performance × Qualidade.
            Para atingir <span className="text-success">World Class (85%)</span>,
            foque primeiro nas maiores perdas.
          </p>
        </div>

        <div className="mt-6 border-t pt-6">
          <button 
            onClick={() => setShowDrilldown(!showDrilldown)}
            className="flex items-center justify-between w-full p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Drill-down: Causa Raiz por Categoria</span>
            </div>
            {showDrilldown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDrilldown && (
            <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : lossCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={lossCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                        {lossCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Top Causas Identificadas</h4>
                    <div className="space-y-2">
                      {lossCategories.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.fill }} />
                            <span className="text-xs font-medium">{cat.name}</span>
                          </div>
                          <span className="text-xs font-bold">{cat.value} unidades</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-xl border-border/50">
                  <p className="text-sm text-muted-foreground italic">Nenhum registro de perda detalhado para o período.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
