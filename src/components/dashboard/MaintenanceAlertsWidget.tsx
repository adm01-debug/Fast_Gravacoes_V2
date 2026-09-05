import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export function MaintenanceAlertsWidget() {
  const { machines, isLoading, getSchedulesByStatus } = useTPM();

  const schedulesByStatus = getSchedulesByStatus();

  const getMachineName = (machineId: string) => {
    return machines.find((m) => m.id === machineId)?.code || 'MÁQ';
  };

  // Combine overdue and dueToday for the widget
  const overdue = schedulesByStatus.overdue.map((s) => ({ ...s, statusType: 'overdue' as const }));
  const dueToday = schedulesByStatus.dueToday.map((s) => ({ ...s, statusType: 'due' as const }));

  const pendingMaintenance = [...overdue, ...dueToday].sort((a, b) => {
    if (a.statusType === 'overdue' && b.statusType !== 'overdue') return -1;
    if (a.statusType !== 'overdue' && b.statusType === 'overdue') return 1;
    return new Date(a.next_due_at).getTime() - new Date(b.next_due_at).getTime();
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.2s]">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm text-title flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
            <Wrench className="w-3 h-3 text-primary" />
          </div>
          <span className="gradient-text">Manutenções Pendentes</span>
          {pendingMaintenance.length > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px] h-5 bg-destructive/10 text-destructive border-destructive/20">
              {pendingMaintenance.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {pendingMaintenance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <div className="p-2 rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">Tudo em dia!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {pendingMaintenance.map((schedule) => (
              <div
                key={schedule.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer",
                  schedule.statusType === 'overdue'
                    ? "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                    : "bg-secondary/40 border-border/20 hover:bg-secondary/60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  schedule.statusType === 'overdue' ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                )}>
                  {schedule.statusType === 'overdue' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold truncate">{getMachineName(schedule.machine_id)}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-4 px-1 leading-none",
                        schedule.statusType === 'overdue' ? "text-destructive border-destructive/30" : "text-primary border-primary/30"
                      )}
                    >
                      {schedule.statusType === 'overdue' ? 'Atrasada' : 'Vence hoje'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{schedule.name}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Vencimento: {formatDistanceToNow(new Date(schedule.next_due_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
