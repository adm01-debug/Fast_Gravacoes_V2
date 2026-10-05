import { Factory, PieChartIcon, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from '@/lib/recharts';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { ExecutiveKPIs } from '@/features/analytics/hooks/useExecutiveDashboard';

interface ExecutiveChartsRow2Props {
  kpis: ExecutiveKPIs;
  techniques: Database['public']['Tables']['techniques']['Row'][] | undefined;
  machines: Pick<Database['public']['Tables']['machines']['Row'], 'id' | 'name' | 'code'>[] | undefined;
  onTechniqueSelect: (id: string) => void;
  onMachineSelect: (id: string) => void;
}

export function ExecutiveChartsRow2({ kpis, techniques, machines, onTechniqueSelect, onMachineSelect }: ExecutiveChartsRow2Props) {
  return (
    <>
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Technique Distribution */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-purple-500" />
                Distribuição por Técnica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kpis.techniqueDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="technique"
                      label={({ technique, percent }) =>
                        `${technique} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      onClick={(data) => {
                        const technique = techniques?.find(t => t.short_name === data.technique || t.name === data.technique);
                        if (technique) {
                          onTechniqueSelect(technique.id);
                          toast.success(`Filtrando por técnica: ${technique.name}`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {kpis.techniqueDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Operators */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                Top Operadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpis.topOperators.map((op, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      index === 0 ? 'bg-amber-500 text-amber-950' :
                      index === 1 ? 'bg-gray-400 text-gray-950' :
                      index === 2 ? 'bg-orange-600 text-orange-950' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{op.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {op.produced.toLocaleString('pt-BR')} peças
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {op.efficiency.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Machine Performance */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Factory className="h-5 w-5 text-warning" />
                Performance Máquinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpis.machinePerformance.slice(0, 5).map((m, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    aria-label={`Filtrar por máquina ${m.machine}`}
                    className="space-y-1 cursor-pointer hover:bg-primary/5 p-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => {
                      const machine = machines?.find(mac => (mac.code || mac.name) === m.machine);
                      if (machine) {
                        onMachineSelect(machine.id);
                        toast.success(`Filtrando por máquina: ${machine.code || machine.name}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      const machine = machines?.find(mac => (mac.code || mac.name) === m.machine);
                      if (machine) {
                        onMachineSelect(machine.id);
                        toast.success(`Filtrando por máquina: ${machine.code || machine.name}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.machine}</span>
                      <span className="text-muted-foreground">
                        OEE: {m.oee.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={m.utilization} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
    </>
  );
}
