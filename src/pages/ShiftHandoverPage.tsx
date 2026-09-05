/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import {
  ArrowRightLeft,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  ListTodo,
  History,
  Filter,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth';
import {
  useShiftHandovers,
  useShiftPendingTasks,
  useShiftOccurrences,
  useShiftHandoverMutations,
  SHIFT_TYPE_LABELS,
  getCurrentShiftType,
  ShiftHandover
} from '@/hooks/useShiftHandover';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CreateHandoverModal from '@/components/shift/CreateHandoverModal';
import HandoverDetailsModal from '@/components/shift/HandoverDetailsModal';
import PendingTasksPanel from '@/components/shift/PendingTasksPanel';
import OccurrencesPanel from '@/components/shift/OccurrencesPanel';
import ChecklistTemplatesManager from '@/components/shift/ChecklistTemplatesManager';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Em andamento', variant: 'default' },
  pending_acceptance: { label: 'Aguardando aceite', variant: 'secondary' },
  completed: { label: 'Concluída', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' }
};

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite'
};

export default function ShiftHandoverPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('current');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<ShiftHandover | null>(null);

  // Fetch machines for filter
  const { data: machines } = useQuery({
    queryKey: ['machines-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch current/recent handovers
  const { data: handovers, isLoading: loadingHandovers, refetch } = useShiftHandovers({
    date: activeTab === 'history' ? undefined : selectedDate,
    machineId: selectedMachine !== 'all' ? selectedMachine : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: activeTab === 'history' ? 50 : undefined
  });

  // Fetch all pending tasks
  const { data: pendingTasks, isLoading: loadingTasks } = useShiftPendingTasks(undefined, false);

  // Fetch recent occurrences
  const { data: occurrences, isLoading: loadingOccurrences } = useShiftOccurrences(undefined, {
    startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  });

  const { acceptHandover } = useShiftHandoverMutations();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('shift-handovers-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_handovers'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_pending_tasks'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['shift-pending-tasks'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Stats
  const stats = useMemo(() => ({
    openHandovers: handovers?.filter(h => h.status === 'open' || h.status === 'pending_acceptance').length || 0,
    pendingTasks: pendingTasks?.filter(t => t.status === 'pending').length || 0,
    criticalTasks: pendingTasks?.filter(t => t.priority === 'critical' && t.status !== 'completed').length || 0,
    recentOccurrences: occurrences?.filter(o => !o.resolved_at).length || 0
  }), [handovers, pendingTasks, occurrences]);

  const currentShift = getCurrentShiftType();

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in-up">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-7 w-7 text-primary" />
            Passagem de Turno
          </h1>
          <p className="text-muted-foreground">
            Turno atual: {SHIFT_TYPE_LABELS[currentShift]} • {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="shadow-glow-primary active:scale-95 transition-all">
            <Plus className="h-4 w-4 mr-2" />
            Nova Passagem
          </Button>
        </div>
      </div>

      {/* Real-time Status Banner */}
      <Card className="bg-primary/5 border-primary/20 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <RefreshCw className="h-16 w-16 text-primary animate-spin-slow" />
        </div>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-ping" />
            <span className="text-xs font-black uppercase tracking-tighter">Sincronização em tempo real ativa</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium italic">
            Última atualização: {format(new Date(), "HH:mm:ss")}
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openHandovers}</p>
                <p className="text-xs text-muted-foreground">Em andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <ListTodo className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingTasks}</p>
                <p className="text-xs text-muted-foreground">Pendências</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.criticalTasks}</p>
                <p className="text-xs text-muted-foreground">Críticas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <History className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recentOccurrences}</p>
                <p className="text-xs text-muted-foreground">Ocorrências abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="current" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Passagens
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Pendências
            {stats.pendingTasks > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.pendingTasks}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="occurrences" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Ocorrências
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros:</span>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as máquinas</SelectItem>
                    {machines?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="open">Em andamento</SelectItem>
                    <SelectItem value="pending_acceptance">Aguardando aceite</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Handovers List */}
          <div className="grid gap-4">
            {loadingHandovers ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : handovers && handovers.length > 0 ? (
              handovers.map((handover) => (
                <Card
                  key={handover.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedHandover(handover)}
                >
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                          handover.status === 'open' ? 'bg-primary/10' :
                          handover.status === 'pending_acceptance' ? 'bg-warning/10' :
                          'bg-muted'
                        }`}>
                          <ArrowRightLeft className={`h-5 w-5 ${
                            handover.status === 'open' ? 'text-primary' :
                            handover.status === 'pending_acceptance' ? 'text-warning' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">
                              Turno {SHIFT_LABELS[handover.shift_type]}
                            </h3>
                            <Badge variant={STATUS_LABELS[handover.status]?.variant || 'default'}>
                              {STATUS_LABELS[handover.status]?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {handover.machine?.name || 'Sem máquina'} •
                            {format(new Date(handover.started_at), " dd/MM/yyyy 'às' HH:mm")}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>
                              <span className="text-muted-foreground">Saindo:</span>{' '}
                              {handover.outgoing_profile?.full_name || 'N/A'}
                            </span>
                            {handover.incoming_profile && (
                              <span>
                                <span className="text-muted-foreground">Entrando:</span>{' '}
                                {handover.incoming_profile.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {handover.status === 'pending_acceptance' &&
                         handover.outgoing_operator_id !== user?.id && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptHandover.mutate(handover.id);
                            }}
                            disabled={acceptHandover.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Aceitar Turno
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Nenhuma passagem encontrada</h3>
                  <p className="text-muted-foreground">
                    Não há passagens de turno para os filtros selecionados
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Iniciar Passagem
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <PendingTasksPanel />
        </TabsContent>

        <TabsContent value="occurrences">
          <OccurrencesPanel />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Passagens</CardTitle>
              <CardDescription>
                Visualize todas as passagens de turno anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as máquinas</SelectItem>
                    {machines?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {loadingHandovers ? (
                  Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : handovers && handovers.length > 0 ? (
                  handovers.map((handover) => (
                    <div
                      key={handover.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ver passagem de turno ${handover.shift_date}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => setSelectedHandover(handover)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedHandover(handover); } }}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={STATUS_LABELS[handover.status]?.variant || 'default'}>
                          {SHIFT_LABELS[handover.shift_type]}
                        </Badge>
                        <div>
                          <p className="font-medium">
                            {format(parseDateOnly(handover.shift_date) ?? new Date(), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {handover.machine?.name || 'Geral'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>{handover.outgoing_profile?.full_name}</p>
                        <p className="text-muted-foreground">
                          → {handover.incoming_profile?.full_name || 'Não aceito'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum registro no histórico
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <ChecklistTemplatesManager />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateHandoverModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        machines={machines || []}
      />

      <HandoverDetailsModal
        handover={selectedHandover}
        onClose={() => setSelectedHandover(null)}
      />
    </div>
  );
}
