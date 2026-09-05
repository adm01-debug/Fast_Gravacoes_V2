import { BIMetrics, BIJob } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Activity, AlertTriangle, Gauge, Package, Target,
  CheckCircle, Clock, BarChart3, PieChart, LineChart, Printer, Download, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  LineChart as RechartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from '@/lib/recharts';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { BITooltip } from './BITooltip';
import { BIEmptyState } from './BIEmptyState';
import { cn } from '@/lib/utils';


const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--primary))',
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, variant = 'default', onClick }: StatCardProps) {
  const variantStyles = {
    default: 'border-border/50 hover:border-primary/30',
    success: 'border-success/30 bg-success/5 hover:shadow-glow-success',
    warning: 'border-warning/30 bg-warning/5 hover:shadow-glow-primary',
    danger: 'border-primary/30 bg-primary/5 hover:shadow-glow-primary',
  };

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-primary' : 'text-muted-foreground';

  return (
    <Card
      onClick={onClick}
      className={cn(
        variantStyles[variant],
        "card-interactive group transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        onClick && "cursor-pointer"
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold text-display bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && trendValue && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-glow-primary transition-all duration-300">
            <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


interface BINormalViewProps {
  biMetrics: BIMetrics;
  kpis: { inProgressJobs: number; delayedJobs: number };
  oeeData: {
    overallOEE: number;
    overallAvailability: number;
    overallPerformance: number;
    overallQuality: number;
    availabilityLosses: number;
    performanceLosses: number;
    qualityLosses: number;
    trendData: Array<{ date: string; oee: number; quality: number }>;
  };
  getPeriodLabel: (filter?: string, range?: { from: Date; to: Date }) => string;
  onDrillDown: (title: string, jobs: BIJob[]) => void;
}

export function BINormalView({ biMetrics, kpis, oeeData, getPeriodLabel, onDrillDown }: BINormalViewProps) {
  if (!biMetrics.periodJobsList || biMetrics.periodJobsList.length === 0) {
    return (
      <div className="py-12">
        <BIEmptyState />
      </div>
    );
  }

  return (

    <>
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard onClick={() => onDrillDown('VISÃO OEE', biMetrics.periodJobsList)} title="OEE Geral" value={`${oeeData.overallOEE.toFixed(1)}%`} subtitle="Eficiência Global dos Equipamentos" icon={Gauge} variant={oeeData.overallOEE >= 85 ? 'success' : oeeData.overallOEE >= 65 ? 'warning' : 'danger'} />
        <StatCard onClick={() => onDrillDown('TAXA DE PERDA', biMetrics.periodJobsList.filter(j => (j.lost_pieces || 0) > 0))} title="Taxa de Perda" value={`${biMetrics.periodLossRate.toFixed(2)}%`} subtitle={`${biMetrics.periodLostPieces.toLocaleString()} peças perdidas`} icon={Target} variant={biMetrics.periodLossRate <= 5 ? 'success' : biMetrics.periodLossRate <= 10 ? 'warning' : 'danger'} />
        <StatCard onClick={() => onDrillDown('RECEITA ESTIMADA', biMetrics.periodJobsList.filter(j => j.status === 'finished'))} title="Receita Estimada" value={`R$ ${(biMetrics.periodCompletedPieces * 2.5).toLocaleString()}`} subtitle="Projeção baseada na produção" icon={TrendingUp} variant="success" />
        <StatCard onClick={() => onDrillDown('PEDIDOS PRODUZIDOS', biMetrics.periodJobsList.filter(j => j.status === 'finished'))} title="Peças Produzidas" value={biMetrics.periodCompletedPieces.toLocaleString()} subtitle="Volume total finalizado" icon={Package} variant="success" />

      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-interactive bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 group hover:shadow-glow-primary">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all">
                <Printer className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-2xl font-bold text-title">{biMetrics.activeMachines}</p>
                <p className="text-xs text-muted-foreground">Máquinas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-interactive bg-gradient-to-br from-xp/10 via-xp/5 to-transparent border-xp/20 group hover:shadow-[0_0_20px_hsl(var(--xp)/0.3)]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-xp/10 group-hover:bg-xp/20 transition-all">
                <Activity className="h-5 w-5 text-xp group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-2xl font-bold text-title">{biMetrics.activeTechniques}</p>
                <p className="text-xs text-muted-foreground">Técnicas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          onClick={() => onDrillDown('PEDIDOS EM PRODUÇÃO', biMetrics.periodJobsList.filter(j => j.status === 'production'))}
          className="card-interactive bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 group hover:shadow-glow-success cursor-pointer"
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-all">
                <TrendingUp className="h-5 w-5 text-success group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-2xl font-bold text-title">{kpis.inProgressJobs}</p>
                <p className="text-xs text-muted-foreground">Em Produção</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          onClick={() => onDrillDown('PEDIDOS ATRASADOS', biMetrics.periodJobsList.filter(j => j.status === 'delayed'))}
          className="card-interactive bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20 group hover:shadow-[0_0_20px_hsl(var(--warning)/0.3)] cursor-pointer"
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-all">
                <AlertTriangle className="h-5 w-5 text-warning group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-2xl font-bold text-title">{kpis.delayedJobs}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Production Trend + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated hover:shadow-glow-primary transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all">
                <LineChart className="h-5 w-5 text-primary" />
              </div>
              Tendência de Produção
            </CardTitle>
            <CardDescription>{getPeriodLabel()}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={biMetrics.dailyTrend}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    onDrillDown(`PEDIDOS EM ${data.activeLabel}`, biMetrics.periodJobsList);
                  }
                }}
              >
                <defs>
                  <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="produced" stroke={CHART_COLORS.success} strokeWidth={2} fillOpacity={1} fill="url(#colorProduced)" name="Produzidas" />
                <Line type="monotone" dataKey="jobs" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 2 }} name="Jobs" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated hover:shadow-glow-primary transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPieChart>
                <Pie
                  data={biMetrics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  onClick={(data: { name?: string }) => {
                    if (data && data.name) {
                      onDrillDown(`PEDIDOS: ${data.name}`, biMetrics.periodJobsList.filter(j => j.status === (data.name === 'Finalizados' ? 'finished' : data.name === 'Em Produção' ? 'production' : data.name === 'Atrasados' ? 'delayed' : 'scheduled')));
                    }
                  }}
                >
                  {biMetrics.statusDistribution.map((entry, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Technique Performance + OEE Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated hover:shadow-glow-primary transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              Performance por Técnica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={biMetrics.techniquePerformance.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Bar
                  dataKey="produced"
                  fill={CHART_COLORS.success}
                  name="Produzidas"
                  radius={[0, 6, 6, 0]}
                  onClick={(data: { name?: string; id?: string }) => {
                    if (data && data.name) onDrillDown(`TÉCNICA: ${data.name}`, biMetrics.periodJobsList.filter(j => j.technique_id === data.id));
                  }}
                />
                <Bar
                  dataKey="lost"
                  fill={CHART_COLORS.danger}
                  name="Perdidas"
                  radius={[0, 6, 6, 0]}
                  onClick={(data: { name?: string; id?: string }) => {
                    if (data && data.name) onDrillDown(`PERDAS EM ${data.name}`, biMetrics.periodJobsList.filter(j => j.technique_id === data.id && (j.lost_pieces || 0) > 0));
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated hover:shadow-glow-primary transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Evolução OEE
            </CardTitle>
            <CardDescription>Últimos 14 dias • Meta: 85%</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsLineChart data={oeeData.trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={(value: string) => format(parseISO(value), 'dd/MM')} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} labelFormatter={(label: string) => format(parseISO(label), 'dd/MM/yyyy')} formatter={(value: number) => [`${value.toFixed(1)}%`]} />
                <Line type="monotone" dataKey="oee" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS.primary }} name="OEE" />
                <Line type="monotone" dataKey="quality" stroke={CHART_COLORS.success} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Qualidade" />
                <Line type="monotone" dataKey={() => 85} stroke={CHART_COLORS.warning} strokeWidth={1} strokeDasharray="10 5" dot={false} name="Meta" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Machine Utilization Table */}
      <Card className="card-elevated overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Printer className="h-5 w-5 text-primary" />
            </div>
            Top 10 Máquinas por Utilização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary/20 bg-primary/5">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Máquina</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Técnica</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-foreground">Jobs</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-foreground">Concluídos</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Utilização</th>
                </tr>
              </thead>
              <tbody>
                {(biMetrics.machineUtilization || []).map((machine: { machine?: string; name?: string; technique?: string; totalJobs?: number; completedJobs?: number; utilization?: number }, index: number) => (
                  <tr key={machine.machine || index} className="border-b border-border/50 hover:bg-primary/5 transition-all duration-200 group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 font-medium">{index + 1}.</span>
                        <span className="font-medium group-hover:text-primary transition-colors">{machine.machine || machine.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><Badge variant="outline" className="text-xs border-primary/30">{machine.technique}</Badge></td>
                    <td className="py-3 px-4 text-center font-medium">{machine.totalJobs}</td>
                    <td className="py-3 px-4 text-center font-medium">{machine.completedJobs}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${machine.utilization ?? 0}%`,
                            background: (machine.utilization ?? 0) >= 80 ? 'linear-gradient(90deg, hsl(var(--success)), hsl(var(--success) / 0.8))' : (machine.utilization ?? 0) >= 50 ? 'linear-gradient(90deg, hsl(var(--warning)), hsl(var(--warning) / 0.8))' : 'linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.8))'
                          }} />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">{(machine.utilization ?? 0).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* OEE Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-interactive bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 group hover:shadow-glow-primary">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-3 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Disponibilidade</p>
              <p className="text-4xl font-bold text-display-lg gradient-text mt-1">{oeeData.overallAvailability.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-2">Perda: {oeeData.availabilityLosses.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-interactive bg-gradient-to-br from-xp/10 via-xp/5 to-transparent border-xp/20 group hover:shadow-[0_0_30px_hsl(var(--xp)/0.3)]">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 rounded-xl bg-xp/10 w-fit mx-auto mb-3 group-hover:bg-xp/20 group-hover:scale-110 transition-all duration-300">
                <TrendingUp className="h-8 w-8 text-xp" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Performance</p>
              <p className="text-4xl font-bold text-display-lg text-xp mt-1">{oeeData.overallPerformance.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-2">Perda: {oeeData.performanceLosses.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-interactive bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 group hover:shadow-glow-success">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 rounded-xl bg-success/10 w-fit mx-auto mb-3 group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                <Target className="h-8 w-8 text-success" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Qualidade</p>
              <p className="text-4xl font-bold text-display-lg text-success mt-1">{oeeData.overallQuality.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-2">Perda: {oeeData.qualityLosses.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={() => {
          const exportData = { exportedAt: new Date().toISOString(), period: getPeriodLabel(), metrics: biMetrics, oee: oeeData };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bi-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Relatório exportado com sucesso!');
        }} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>
    </>
  );
}
