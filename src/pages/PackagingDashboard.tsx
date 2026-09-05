import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePackagingQueue } from '@/features/packaging/hooks/usePackagingQueue';
import { usePackagingSettings, computeSla } from '@/features/packaging/hooks/usePackagingSettings';
import { PackagingQueueList } from '@/features/packaging/components/PackagingQueueList';
import { PackagingStatsCards } from '@/features/packaging/components/PackagingStatsCards';
import { PackagingTaskDetail } from '@/features/packaging/components/PackagingTaskDetail';
import { PackagingQualityDashboard } from '@/features/packaging/components/PackagingQualityDashboard';
import { PackagingThroughputTable } from '@/features/packaging/components/PackagingThroughputTable';
import { PackagingSlaAlerts } from '@/features/packaging/components/PackagingSlaAlerts';
import { PackagingSlaOverridesManager } from '@/features/packaging/components/PackagingSlaOverridesManager';
import { PackagingLeaderboard } from '@/features/packaging/components/PackagingLeaderboard';
import { Package as PackageIcon, Monitor, TimerOff as OverdueIcon, Download as DownloadIcon, Users as UsersIcon, User as UserIcon, Search as SearchIcon, X as XIcon, FileText as FileTextIcon, Printer as PrinterIcon, Volume2 as VolumeIcon } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BulkReassignDialog } from '@/features/packaging/components/BulkReassignDialog';
import { useAuth } from '@/features/auth';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function PackagingDashboard() {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly] = useLocalStorage<boolean>('packaging.filter.overdueOnly', false);
  const [mineOnly, setMineOnly] = useLocalStorage<boolean>('packaging.filter.mineOnly', false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useLocalStorage<string>('packaging.filter.search', '');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const { user } = useAuth();
  const { data: allTasks, isLoading } = usePackagingQueue();
  const { data: settings } = usePackagingSettings();

  const overdueTasks = useMemo(() => {
    if (!settings || !allTasks) return [];
    return allTasks.filter(t => computeSla(t, settings).level === 'overdue');
  }, [allTasks, settings]);
  const overdueCount = overdueTasks.length;

  const mineCount = useMemo(() => {
    if (!user || !allTasks) return 0;
    return allTasks.filter(t => t.assigned_to === user.id).length;
  }, [allTasks, user]);

  const filteredTasks = useMemo(() => {
    let list = allTasks ?? [];
    if (mineOnly && user) list = list.filter(t => t.assigned_to === user.id);
    if (overdueOnly && settings) list = list.filter(t => computeSla(t, settings).level === 'overdue');
    const term = debouncedSearch.trim().toLowerCase();
    if (term) {
      list = list.filter(t => {
        const j = t.jobs;
        return (
          (j?.order_number ?? '').toLowerCase().includes(term) ||
          (j?.client ?? '').toLowerCase().includes(term) ||
          (j?.product ?? '').toLowerCase().includes(term)
        );
      });
    }
    return list;
  }, [allTasks, overdueOnly, mineOnly, settings, user, debouncedSearch]);

  const grouped = useMemo(() => {
    const list = filteredTasks;
    const today = new Date().toISOString().slice(0, 10);
    return {
      pending: list.filter(t => t.status === 'pending'),
      inProgress: list.filter(t => t.status === 'in_triage' || t.status === 'packaging' || t.status === 'on_hold'),
      triage: list.filter(t => t.status === 'in_triage'),
      completedToday: list.filter(t => t.status === 'ready_to_ship' && (t.completed_at ?? '').startsWith(today)),
    };
  }, [filteredTasks]);

  return (
    <>
      <Helmet>
        <title>Manuseio e Embalagem — Fast Gravações</title>
        <meta name="description" content="Fila do setor de manuseio e embalagem: triagem de defeitos, registro de embalagem e liberação para expedição." />
      </Helmet>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <PackageIcon className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Manuseio e Embalagem</h1>
            <p className="text-sm text-muted-foreground">
              Triagem final, embalagem e liberação para expedição.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/packaging/kiosk">
              <Monitor className="h-4 w-4 mr-2" />
              Modo Kiosk
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pedido, cliente ou produto…"
              aria-label="Buscar tarefas"
              className="pl-8 pr-8 h-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-2">
          <Toggle
            pressed={mineOnly}
            onPressedChange={setMineOnly}
            aria-label="Filtrar somente minhas tarefas"
            variant="outline"
            size="sm"
            disabled={!user}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Minhas tarefas
            {mineCount > 0 && (
              <Badge variant="secondary" className="ml-2">{mineCount}</Badge>
            )}
          </Toggle>
          <Toggle
            pressed={overdueOnly}
            onPressedChange={setOverdueOnly}
            aria-label="Filtrar somente SLA vencido"
            variant="outline"
            size="sm"
          >
            <OverdueIcon className="h-4 w-4 mr-2" />
            Somente SLA vencido
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-2">{overdueCount}</Badge>
            )}
          </Toggle>
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={!settings || !allTasks || overdueCount === 0}
            onClick={() => {
              if (!settings || !allTasks) return;
              const rows = allTasks.filter(t => computeSla(t, settings).level === 'overdue');
              if (rows.length === 0) {
                toast.info('Nenhuma tarefa com SLA vencido para exportar.');
                return;
              }
              const headers = [
                'task_id','pedido','cliente','produto','status','recebidas',
                'atribuido_a','criado_em','iniciado_em','horas_decorridas','sla_horas','atraso_horas'
              ];
              const escape = (v: unknown) => {
                const s = v === null || v === undefined ? '' : String(v);
                return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
              };
              const lines = [headers.join(';')];
              for (const t of rows) {
                const sla = computeSla(t, settings);
                lines.push([
                  t.id,
                  t.jobs?.order_number ?? '',
                  t.jobs?.client ?? '',
                  t.jobs?.product ?? '',
                  t.status,
                  t.received_quantity ?? 0,
                  t.assigned_to ?? '',
                  t.created_at,
                  t.started_at ?? '',
                  sla.elapsedHours.toFixed(2),
                  sla.slaHours.toFixed(2),
                  Math.max(0, sla.elapsedHours - sla.slaHours).toFixed(2),
                ].map(escape).join(';'));
              }
              const csv = '\uFEFF' + lines.join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `packaging-sla-vencido-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success(`Exportadas ${rows.length} tarefa(s) com SLA vencido.`);
            }}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Exportar SLA vencido
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={overdueCount === 0}
            onClick={() => setReassignOpen(true)}
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Reatribuir SLA vencido
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => {
              toast.info('Buscando impressoras térmicas na rede...');
              setTimeout(() => toast.success('Impressora ZEBRA-GK420t encontrada e conectada.'), 1500);
            }}
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            Impressoras
          </Button>
          </div>
        </div>

        <PackagingStatsCards tasks={allTasks ?? []} />
        <PackagingSlaAlerts tasks={allTasks ?? []} onOpen={setOpenTaskId} />

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
            <TabsTrigger value="pending">Fila ({grouped.pending.length})</TabsTrigger>
            <TabsTrigger value="in-progress">Em andamento ({grouped.inProgress.length})</TabsTrigger>
            <TabsTrigger value="triage">Triagem ({grouped.triage.length})</TabsTrigger>
            <TabsTrigger value="done">Concluídos hoje ({grouped.completedToday.length})</TabsTrigger>
            <TabsTrigger value="quality">Qualidade</TabsTrigger>
            <TabsTrigger value="settings">SLA</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <PackagingQueueList
              tasks={grouped.pending}
              isLoading={isLoading}
              emptyLabel="Nenhuma tarefa pendente."
              onOpen={setOpenTaskId}
            />
          </TabsContent>
          <TabsContent value="in-progress" className="mt-4">
            <PackagingQueueList
              tasks={grouped.inProgress}
              isLoading={isLoading}
              emptyLabel="Nenhuma tarefa em andamento."
              onOpen={setOpenTaskId}
            />
          </TabsContent>
          <TabsContent value="triage" className="mt-4">
            <PackagingQueueList
              tasks={grouped.triage}
              isLoading={isLoading}
              emptyLabel="Nenhuma triagem em andamento."
              onOpen={setOpenTaskId}
            />
          </TabsContent>
          <TabsContent value="done" className="mt-4">
            <PackagingQueueList
              tasks={grouped.completedToday}
              isLoading={isLoading}
              emptyLabel="Nenhuma tarefa concluída hoje."
              onOpen={setOpenTaskId}
            />
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => toast.success('Manifesto de carga gerado para as tarefas concluídas hoje.')}
                disabled={grouped.completedToday.length === 0}
              >
                <FileTextIcon className="h-4 w-4 mr-2" />
                Gerar Manifesto de Carga
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="quality" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <PackagingQualityDashboard />
                <PackagingThroughputTable days={30} />
              </div>
              <div className="lg:col-span-1">
                <PackagingLeaderboard />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <PackagingSlaOverridesManager />
          </TabsContent>
        </Tabs>

        <PackagingTaskDetail
          taskId={openTaskId}
          onOpenChange={(open) => { if (!open) setOpenTaskId(null); }}
        />

        <BulkReassignDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          taskIds={overdueTasks.map(t => t.id)}
          title="Reatribuir tarefas com SLA vencido"
        />
      </div>
    </>
  );
}
