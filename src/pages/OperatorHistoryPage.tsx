/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { useSchedulingData } from '@/features/jobs';
import { useAuth } from '@/features/auth';
import {
  History,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Package,
  User,
  Filter,
} from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActionEntry {
  id: string;
  timestamp: string;
  operatorName: string;
  action: string;
  jobOrderNumber: string;
  jobProduct: string;
  machineName: string;
  details?: string;
  icon: React.ElementType;
  color: string;
}

export default function OperatorHistoryPage() {
  const { jobs, machines, getOperatorById } = useSchedulingData();
  const [periodDays, setPeriodDays] = useState('7');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');

  // Build action timeline from job data
  const actions = useMemo((): ActionEntry[] => {
    const cutoff = subDays(new Date(), parseInt(periodDays, 10));
    const entries: ActionEntry[] = [];

    for (const job of jobs) {
      const machine = machines.find(m => m.id === job.machine_id);
      const machineName = machine ? `${machine.code} - ${machine.name}` : 'Não atribuída';

      // Job started
      if (job.actual_start_time && isAfter(new Date(job.actual_start_time), cutoff)) {
        const operator = getOperatorById(job.operator_id);
        entries.push({
          id: `start-${job.id}`,
          timestamp: job.actual_start_time,
          operatorName: operator?.full_name || 'Operador',
          action: 'Iniciou produção',
          jobOrderNumber: job.order_number,
          jobProduct: job.product,
          machineName,
          icon: Play,
          color: 'text-green-500',
        });
      }

      // Job finished
      if (job.actual_end_time && isAfter(new Date(job.actual_end_time), cutoff)) {
        const operator = getOperatorById(job.operator_id);
        entries.push({
          id: `finish-${job.id}`,
          timestamp: job.actual_end_time,
          operatorName: operator?.full_name || 'Operador',
          action: 'Finalizou produção',
          jobOrderNumber: job.order_number,
          jobProduct: job.product,
          machineName,
          details: job.produced_quantity
            ? `${job.produced_quantity} peças produzidas${job.lost_pieces ? `, ${job.lost_pieces} perdas` : ''}`
            : undefined,
          icon: CheckCircle,
          color: 'text-primary',
        });
      }

      // Job delayed
      if (job.status === 'delayed' && isAfter(new Date(job.updated_at), cutoff)) {
        entries.push({
          id: `delay-${job.id}`,
          timestamp: job.updated_at,
          operatorName: 'Sistema',
          action: 'Job marcado como atrasado',
          jobOrderNumber: job.order_number,
          jobProduct: job.product,
          machineName,
          icon: AlertTriangle,
          color: 'text-destructive',
        });
      }

      // Job paused
      if (job.status === 'paused' && isAfter(new Date(job.updated_at), cutoff)) {
        const operator = getOperatorById(job.operator_id);
        entries.push({
          id: `pause-${job.id}`,
          timestamp: job.updated_at,
          operatorName: operator?.full_name || 'Operador',
          action: 'Pausou produção',
          jobOrderNumber: job.order_number,
          jobProduct: job.product,
          machineName,
          icon: Pause,
          color: 'text-yellow-500',
        });
      }

      // Rework
      if (job.status === 'rework' && isAfter(new Date(job.updated_at), cutoff)) {
        entries.push({
          id: `rework-${job.id}`,
          timestamp: job.updated_at,
          operatorName: 'Operador',
          action: 'Marcou como retrabalho',
          jobOrderNumber: job.order_number,
          jobProduct: job.product,
          machineName,
          icon: RotateCcw,
          color: 'text-purple-500',
        });
      }
    }

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [jobs, machines, periodDays]);

  // Stats
  const stats = useMemo(() => {
    const started = actions.filter(a => a.action.includes('Iniciou')).length;
    const finished = actions.filter(a => a.action.includes('Finalizou')).length;
    const delayed = actions.filter(a => a.action.includes('atrasado')).length;
    const reworked = actions.filter(a => a.action.includes('retrabalho')).length;
    return { started, finished, delayed, reworked, total: actions.length };
  }, [actions]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumbs />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl text-title font-bold gradient-text">Histórico de Ações</h1>
              <p className="text-muted-foreground">Timeline detalhada de todas as ações dos operadores</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimas 24h</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Ações', value: stats.total, icon: Clock, color: 'text-foreground' },
            { label: 'Produções Iniciadas', value: stats.started, icon: Play, color: 'text-green-500' },
            { label: 'Finalizadas', value: stats.finished, icon: CheckCircle, color: 'text-primary' },
            { label: 'Atrasos', value: stats.delayed, icon: AlertTriangle, color: 'text-destructive' },
            { label: 'Retrabalhos', value: stats.reworked, icon: RotateCcw, color: 'text-purple-500' },
          ].map(stat => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Timeline */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Timeline de Ações ({actions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                {actions.map((entry, i) => (
                  <div key={entry.id} className="relative flex gap-4 pb-6">
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card border border-border shadow-sm`}>
                      <entry.icon className={`h-4 w-4 ${entry.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {entry.action}
                        </p>
                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                        </time>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {entry.jobOrderNumber}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {entry.jobProduct} • <span className="font-bold text-primary/80">{entry.operatorName}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        {entry.machineName}
                      </div>

                      {entry.details && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted/30 rounded px-2 py-1">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {actions.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    Nenhuma ação registrada no período selecionado
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
