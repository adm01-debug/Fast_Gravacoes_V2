import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronLeft, PlayCircle, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usePackagingQueue } from '@/features/packaging/hooks/usePackagingQueue';
import { packagingService } from '@/features/packaging/services/packagingService';
import { SlaBadge } from '@/features/packaging/components/SlaBadge';
import { usePackagingSettings, computeSla } from '@/features/packaging/hooks/usePackagingSettings';
import { TASK_STATUS_LABELS, type PackagingTaskStatus } from '@/features/packaging/types/packaging.schema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTIVE_STATUSES: PackagingTaskStatus[] = ['pending', 'in_triage', 'packaging'];

export default function PackagingKioskPage() {
  const { data: tasks = [], isLoading, refetch } = usePackagingQueue(ACTIVE_STATUSES);
  const { data: settings } = usePackagingSettings();
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [tasks],
  );

  async function advance(id: string, next: PackagingTaskStatus, label: string) {
    setBusyId(id);
    try {
      await packagingService.updateStatus(id, next);
      toast.success(`Tarefa marcada como ${label}`);
      await refetch();
    } catch (e) {
      toast.error('Não foi possível atualizar. Tente novamente.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold leading-tight">Manuseio e Embalagem</h1>
              <p className="text-sm text-muted-foreground">Modo Kiosk · {format(new Date(), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-base py-2 px-3">
              {sorted.length} ativa(s)
            </Badge>
            <Button asChild variant="outline" size="lg" className="h-14 text-base">
              <Link to="/packaging">
                <ChevronLeft className="h-5 w-5 mr-2" />
                Sair do Kiosk
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando fila…
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-semibold">Fila zerada</h2>
            <p className="text-muted-foreground mt-2 text-lg">Nenhuma tarefa aguardando triagem ou embalagem.</p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((task) => {
              const job = task.jobs;
              const isBusy = busyId === task.id;
              const sla = settings
                ? computeSla(
                    { status: task.status, created_at: task.created_at, started_at: task.started_at, completed_at: task.completed_at ?? null },
                    settings,
                  )
                : null;
              const nextAction: { status: PackagingTaskStatus; label: string; Icon: typeof PlayCircle } =
                task.status === 'pending'
                  ? { status: 'in_triage', label: 'Iniciar triagem', Icon: PlayCircle }
                  : task.status === 'in_triage'
                    ? { status: 'packaging', label: 'Iniciar embalagem', Icon: Package }
                    : { status: 'ready_to_ship', label: 'Pronto para envio', Icon: CheckCircle2 };
              return (
                <li key={task.id} className="rounded-xl border-2 border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pedido</p>
                      <p className="text-2xl font-bold truncate">{job?.order_number ?? '—'}</p>
                      <p className="text-base text-muted-foreground truncate">{job?.client ?? '—'}</p>
                    </div>
                    {sla && <SlaBadge sla={sla} />}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Quantidade</p>
                      <p className="text-lg font-semibold">{task.received_quantity ?? 0}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Etapa</p>
                      <p className="text-lg font-semibold">{TASK_STATUS_LABELS[task.status] ?? task.status}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      size="lg"
                      className="h-16 text-lg"
                      disabled={isBusy}
                      onClick={() => advance(task.id, nextAction.status, nextAction.label)}
                    >
                      {isBusy ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <nextAction.Icon className="h-6 w-6 mr-2" />
                          {nextAction.label}
                        </>
                      )}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="h-14 text-base"
                    >
                      <Link to={`/packaging?task=${task.id}`}>
                        <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                        Registrar defeito
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
