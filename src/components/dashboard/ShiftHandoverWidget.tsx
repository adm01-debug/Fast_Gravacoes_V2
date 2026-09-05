import { useShiftHandovers, useShiftPendingTasks, SHIFT_TYPE_LABELS, ShiftHandover, ShiftPendingTask } from '@/hooks/useShiftHandover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightLeft, Clock, MessageSquare, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function ShiftHandoverWidget() {
  const navigate = useNavigate();
  const { data: handovers, isLoading: loadingHandovers } = useShiftHandovers({ limit: 1 });
  const { data: tasks, isLoading: loadingTasks } = useShiftPendingTasks();

  const lastHandover = handovers?.[0];
  const pendingTasks = tasks?.filter((t: ShiftPendingTask) => t.status === 'pending').slice(0, 3) || [];

  if (loadingHandovers || loadingTasks) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.35s]">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm text-title flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/20">
              <ArrowRightLeft className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <span className="gradient-text">Passagem de Turno</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] uppercase font-bold"
            onClick={() => navigate('/shift-handover')}
          >
            Ver Tudo
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-4">
        {/* Last Handover Status */}
        {lastHandover ? (
          <div className="p-2 rounded-lg bg-secondary/30 border border-border/20 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Último Turno</p>
              <Badge variant="outline" className="text-[9px] h-4 border-orange-500/30 text-orange-400">
                {SHIFT_TYPE_LABELS[lastHandover.shift_type as keyof typeof SHIFT_TYPE_LABELS].split(' ')[0]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[10px] font-bold">
                  {lastHandover.outgoing_profile?.full_name?.[0] || 'O'}
                </div>
                <div className="w-6 h-6 rounded-full bg-success/20 border border-background flex items-center justify-center text-[10px] font-bold">
                  {lastHandover.incoming_profile?.full_name?.[0] || 'I'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">
                  {lastHandover.outgoing_profile?.full_name?.split(' ')[0]} → {lastHandover.incoming_profile?.full_name?.split(' ')[0] || 'Pendente'}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {format(parseDateOnly(lastHandover.shift_date) ?? new Date(), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
            {lastHandover.general_notes && (
              <div className="flex gap-1.5 items-start mt-1 pt-1 border-t border-border/10">
                <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground italic line-clamp-2">
                  "{lastHandover.general_notes}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center py-2 italic">Nenhuma passagem registrada recentemente.</p>
        )}

        {/* Pending Tasks */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pendências do Turno
          </p>
          {pendingTasks.length > 0 ? (
            <div className="space-y-1.5">
              {pendingTasks.map((task: ShiftPendingTask) => (
                <div key={task.id} className="flex items-center gap-2 p-1.5 rounded bg-background/40 border border-border/10">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    task.priority === 'critical' ? "bg-red-500" : task.priority === 'high' ? "bg-orange-500" : "bg-blue-500"
                  )} />
                  <p className="text-[10px] font-medium flex-1 truncate">{task.title}</p>
                  <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-mono uppercase">
                    {task.machine?.code || 'GERAL'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <CheckCircle2 className="h-6 w-6 text-success/20 mb-1" />
              <p className="text-[10px] text-muted-foreground">Sem tarefas pendentes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

