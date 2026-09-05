import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { useSchedulingData } from '@/features/jobs';
import { useOEE } from '@/features/production';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from '@/lib/recharts';
import { Cpu, ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MachineComparisonPage() {
  const { machines, jobs, techniques } = useSchedulingData();
  const { data: oeeData } = useOEE();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeMachines = useMemo(() => machines.filter(m => m.is_active), [machines]);

  const toggleMachine = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  interface MachineComparison {
    id: string;
    name: string;
    code: string;
    technique: string;
    techniqueColor: string;
    totalJobs: number;
    completedJobs: number;
    totalPieces: number;
    totalLost: number;
    lossRate: string;
    avgDuration: number;
    oeeScore: number;
    availability: number;
    performance: number;
    quality: number;
  }

  const comparisonData = useMemo((): MachineComparison[] => {
    return selectedIds.map(id => {
      const machine = machines.find(m => m.id === id);
      if (!machine) return null;

      const technique = techniques.find(t => t.id === machine.technique_id);
      const machineJobs = jobs.filter(j => j.machine_id === id);
      const finished = machineJobs.filter(j => j.status === 'finished');
      const totalPieces = finished.reduce((s, j) => s + (j.produced_quantity || j.quantity), 0);
      const totalLost = finished.reduce((s, j) => s + (j.lost_pieces || 0), 0);
      const avgDuration = finished.length > 0
        ? finished.reduce((s, j) => s + j.estimated_duration, 0) / finished.length
        : 0;

      const oee = oeeData?.byMachine?.find(o => o.machineId === id);

      return {
        id,
        name: machine.name,
        code: machine.code,
        technique: technique?.name || '-',
        techniqueColor: technique?.color || '#888',
        totalJobs: machineJobs.length,
        completedJobs: finished.length,
        totalPieces,
        totalLost,
        lossRate: totalPieces > 0 ? ((totalLost / totalPieces) * 100).toFixed(1) : '0',
        avgDuration: Math.round(avgDuration),
        oeeScore: oee?.oee ?? 0,
        availability: oee?.availability ?? 0,
        performance: oee?.performance ?? 0,
        quality: oee?.quality ?? 0,
      };
    }).filter((x): x is MachineComparison => x !== null);
  }, [selectedIds, machines, jobs, techniques, oeeData]);

  const radarData = useMemo(() => {
    if (comparisonData.length === 0) return [];
    const metrics = ['OEE', 'Disponibilidade', 'Performance', 'Qualidade'] as const;
    return metrics.map(metric => {
      const point: Record<string, string | number> = { metric };
      comparisonData.forEach((m) => {
        switch (metric) {
          case 'OEE': point[m.code] = m.oeeScore; break;
          case 'Disponibilidade': point[m.code] = m.availability; break;
          case 'Performance': point[m.code] = m.performance; break;
          case 'Qualidade': point[m.code] = m.quality; break;
        }
      });
      return point;
    });
  }, [comparisonData]);

  const barData = useMemo(() => {
    return comparisonData.map((m) => ({
      name: m.code,
      'Jobs Concluídos': m.completedJobs,
      'Peças Produzidas': m.totalPieces,
      'Perdas': m.totalLost,
    }));
  }, [comparisonData]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent-foreground))', '#22c55e', '#f59e0b'];

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumbs />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-title font-black tracking-tighter">
                <span className="gradient-text animate-pulse-glow">Benchmarking Industrial 10/10</span>
              </h1>
            </div>
            <p className="text-muted-foreground">Comparativo analítico de performance e eficiência entre ativos</p>
          </div>
        </div>

        {/* Machine Selection */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Selecionar Máquinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeMachines.map(m => {
                const tech = techniques.find(t => t.id === m.technique_id);
                const isSelected = selectedIds.includes(m.id);
                return (
                  <Button
                    key={m.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMachine(m.id)}
                    className={cn(
                      'transition-all',
                      isSelected && 'ring-2 ring-primary/50'
                    )}
                  >
                    <Cpu className="h-3 w-3 mr-1" />
                    {m.code}
                    {tech && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1" style={{ borderColor: tech.color, color: tech.color }}>
                        {tech.short_name}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
            {selectedIds.length === 0 && (
              <p className="text-sm text-muted-foreground mt-3">Clique nas máquinas acima para selecionar</p>
            )}
          </CardContent>
        </Card>

        {comparisonData.length >= 2 && (
          <>
            {/* KPI Cards Side by Side */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {comparisonData.map((m, i) => (
                <Card key={m.id} className="glass-card border-t-2" style={{ borderTopColor: COLORS[i] }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{m.code} - {m.name}</CardTitle>
                    <Badge variant="outline" className="w-fit text-[10px]" style={{ borderColor: m.techniqueColor, color: m.techniqueColor }}>
                      {m.technique}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>OEE</span>
                        <span className="font-semibold text-foreground">{m.oeeScore.toFixed(1)}%</span>
                      </div>
                      <Progress value={m.oeeScore} className="h-2 mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Jobs</span>
                        <p className="font-semibold text-foreground">{m.completedJobs}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Peças</span>
                        <p className="font-semibold text-foreground">{m.totalPieces.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Perdas</span>
                        <p className="font-semibold text-foreground">{m.lossRate}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tempo Médio</span>
                        <p className="font-semibold text-foreground">{m.avgDuration}min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Radar Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Radar de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    {comparisonData.map((m, i) => (
                      <Radar
                        key={m.id}
                        name={m.code}
                        dataKey={m.code}
                        stroke={COLORS[i]}
                        fill={COLORS[i]}
                        fillOpacity={0.15}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Produção Comparativa</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="Jobs Concluídos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Peças Produzidas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Perdas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}

        {comparisonData.length === 1 && (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              Selecione pelo menos mais 1 máquina para visualizar o comparativo
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
