import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy as TrophyIcon, Users as UsersIcon, Download as DownloadIcon } from 'lucide-react';
import { usePackagingThroughput, type OperatorThroughput } from '../hooks/usePackagingThroughput';

interface Props {
  days?: number;
}

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
] as const;

function toCsv(rows: OperatorThroughput[]): string {
  const header = ['Ranking', 'Operador', 'Tarefas', 'Aprovadas', 'Rejeitadas', 'Ciclo Médio (min)', '% Rejeição'];
  const lines = rows.map((op, idx) => [
    idx + 1,
    `"${op.operatorName.replace(/"/g, '""')}"`,
    op.tasksCompleted,
    op.piecesApproved,
    op.piecesRejected,
    op.avgCycleMinutes !== null ? op.avgCycleMinutes.toFixed(1) : '',
    (op.rejectionRate * 100).toFixed(2),
  ].join(','));
  return [header.join(','), ...lines].join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PackagingThroughputTable({ days: initialDays = 30 }: Props) {
  const [days, setDays] = useState(String(initialDays));
  const daysNum = Number(days);
  const { data, isLoading } = usePackagingThroughput(daysNum);

  const handleExport = () => {
    if (!data || data.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(toCsv(data), `packaging-throughput-${daysNum}d-${stamp}.csv`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersIcon className="h-4 w-4 text-primary" />
          Throughput por Operador
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={!data || data.length === 0}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma tarefa concluída no período.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead className="text-right">Tarefas</TableHead>
                <TableHead className="text-right">Aprovadas</TableHead>
                <TableHead className="text-right">Rejeitadas</TableHead>
                <TableHead className="text-right">Ciclo Médio</TableHead>
                <TableHead className="text-right">% Rejeição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((op, idx) => (
                <TableRow key={op.operatorId}>
                  <TableCell>
                    {idx === 0 ? (
                      <TrophyIcon className="h-4 w-4 text-amber-500" aria-label="Top performer" />
                    ) : (
                      <span className="text-muted-foreground">{idx + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{op.operatorName}</TableCell>
                  <TableCell className="text-right">{op.tasksCompleted}</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                    {op.piecesApproved.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {op.piecesRejected.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {op.avgCycleMinutes !== null ? `${op.avgCycleMinutes.toFixed(0)} min` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={op.rejectionRate > 0.05 ? 'destructive' : 'secondary'}
                      className="tabular-nums"
                    >
                      {(op.rejectionRate * 100).toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
