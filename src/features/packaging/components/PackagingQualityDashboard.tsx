import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePackagingQuality } from '../hooks/usePackagingQuality';
import { PackagingSlaHeatmap } from './PackagingSlaHeatmap';
import { PackagingDelayParetoCard } from './PackagingDelayParetoCard';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
} from '@/lib/recharts';

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export function PackagingQualityDashboard() {
  const [days, setDays] = useState('30');
  const { data, isLoading } = usePackagingQuality(Number(days));

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const rejectionPct = (data.rejectionRate * 100).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Qualidade e Defeitos</h2>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Recebidas" value={data.totalReceived} />
        <KpiCard title="Aprovadas" value={data.totalApproved} accent="text-emerald-400" />
        <KpiCard title="Rejeitadas" value={data.totalRejected} accent="text-destructive" />
        <KpiCard title="Taxa de rejeição" value={`${rejectionPct}%`} accent={data.rejectionRate > 0.05 ? 'text-destructive' : 'text-emerald-400'} />
        <KpiCard title="Retrabalho" value={data.reworkCount} accent="text-amber-400" />
        <KpiCard title="Descarte" value={data.discardCount} accent="text-destructive" />
        <KpiCard title="Defeitos críticos" value={data.criticalCount} accent="text-destructive" />
        <KpiCard title="Tarefas concluídas" value={data.tasksCompleted} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pareto de defeitos</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {data.paretoDefects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum defeito registrado no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.paretoDefects.map(d => ({ ...d, cumulativePct: Math.round(d.cumulativePct * 100) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" name="Ocorrências" />
                <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="hsl(var(--destructive))" strokeWidth={2} name="Acumulado (%)" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <PackagingSlaHeatmap />

      <PackagingDelayParetoCard days={Number(days)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução diária</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {data.daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="received" stroke="hsl(var(--primary))" name="Recebidas" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rejected" stroke="hsl(var(--destructive))" name="Rejeitadas" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, accent }: { title: string; value: number | string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
