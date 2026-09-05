import { Fragment, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePackagingSettings } from '../hooks/usePackagingSettings';
import { usePackagingSlaHeatmap, HEATMAP_WEEKDAYS } from '../hooks/usePackagingSlaHeatmap';

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export function PackagingSlaHeatmap() {
  const [days, setDays] = useState('30');
  const { data: settings } = usePackagingSettings();
  const { data, isLoading } = usePackagingSlaHeatmap(settings, Number(days));

  const grid = useMemo(() => {
    if (!data) return null;
    const map = new Map<string, number>();
    for (const c of data.cells) map.set(`${c.weekday}-${c.hour}`, c.overdue);
    return map;
  }, [data]);

  if (isLoading || !data || !grid) {
    return <Skeleton className="h-64 w-full" />;
  }

  const max = Math.max(1, data.maxOverdue);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Heatmap · SLA vencido por hora</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Distribuição de tarefas com SLA vencido pelo horário de entrada no setor.
            {data.peakLabel && (
              <> Pico: <span className="font-medium text-foreground">{data.peakLabel}</span></>
            )}
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.totalOverdue === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa venceu o SLA no período. 🎯</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="grid" style={{ gridTemplateColumns: '40px repeat(24, minmax(22px, 1fr))' }}>
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-[10px] text-muted-foreground text-center py-1">
                    {h % 2 === 0 ? String(h).padStart(2, '0') : ''}
                  </div>
                ))}
                {HEATMAP_WEEKDAYS.map((label, d) => (
                  <Fragment key={`row-${d}`}>
                    <div className="text-xs text-muted-foreground pr-2 py-1 flex items-center">
                      {label}
                    </div>
                    {Array.from({ length: 24 }, (_, h) => {
                      const v = grid.get(`${d}-${h}`) ?? 0;
                      const intensity = v / max;
                      const bg = v === 0
                        ? 'hsl(var(--muted) / 0.3)'
                        : `hsl(var(--destructive) / ${0.15 + intensity * 0.85})`;
                      return (
                        <div
                          key={`c-${d}-${h}`}
                          className="aspect-square rounded-sm m-[1px] border border-border/40"
                          style={{ background: bg }}
                          title={`${label} ${String(h).padStart(2, '0')}h · ${v} atrasada(s)`}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
                <span>Menos</span>
                {[0.15, 0.35, 0.55, 0.75, 1].map((op) => (
                  <div
                    key={op}
                    className="h-3 w-6 rounded-sm border border-border/40"
                    style={{ background: `hsl(var(--destructive) / ${op})` }}
                  />
                ))}
                <span>Mais</span>
                <span className="ml-auto">
                  Total no período: <span className="text-foreground font-medium">{data.totalOverdue}</span> atrasadas /
                  {' '}{data.totalTasks} tarefas
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
