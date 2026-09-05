import { useState, useMemo, useCallback } from 'react';
import { DbMachine, DbTechnique } from '@/features/jobs';
import type { MaintenanceSchedule } from '@/features/maintenance/hooks/types';


import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Settings, History,
  Activity, AlertTriangle, Map as MapIcon, Zap, Search, FileDown
} from 'lucide-react';
import { TargetArrowIcon } from '@/components/icons/TargetArrowIcon';
import { useSchedulingData } from '@/features/jobs';
import { Skeleton } from '@/components/ui/skeleton';
// Breadcrumbs removed - handled by MainLayout
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEntityAuditTrail } from '@/features/admin';
import { AuditEntryCard } from '@/features/admin/components/audit/AuditEntryCard';
import { HistoryPeriodFilter, type HistoryPeriodValue } from '@/features/admin/components/audit/HistoryPeriodFilter';
import { MachineTPMPanel } from '@/features/maintenance/components/MachineTPMPanel';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { MaintenanceExecutionModal } from '@/features/maintenance/components/MaintenanceExecutionModal';
import { CreateScheduleModal } from '@/features/maintenance/components/CreateScheduleModal';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import { MachineReliabilityTab } from '@/components/machines/MachineReliabilityTab';
import { useMTBFMTTR } from '@/features/production';
import { useDataExport } from '@/features/admin';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { MachineCard } from '@/components/machines/MachineCard';
import { MachineBulkActions } from '@/components/machines/MachineBulkActions';
import { useOEE } from '@/features/production';
import { QrCode as QrCodeIcon, Download, Trash2, Power } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MachinesPage() {
  const { machines, techniques, isLoadingMachines, getTechniqueById } = useSchedulingData();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const {
    schedules,
    maintenanceTypes,
    startMaintenance,
    completeMaintenance,
    createSchedule
  } = useTPM();
  const { summary: reliabilitySummary, isLoading: isLoadingReliability } = useMTBFMTTR();
  const { exportData } = useDataExport('machines');
  const { data: oeeData } = useOEE(30);

  const [selectedMachine, setSelectedMachine] = useState<DbMachine | null>(null);
  const [machineForQR, setMachineForQR] = useState<DbMachine | null>(null);
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [createScheduleModalOpen, setCreateScheduleModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleStartMaintenance = (scheduleId: string) => {
    if (!user || !profile) {
      toast.error('Você precisa estar logado para iniciar uma manutenção');
      return;
    }

    const schedule = schedules.find((s: MaintenanceSchedule) => s.id === scheduleId);
    setSelectedSchedule(schedule ?? null);

    startMaintenance.mutate({
      schedule_id: scheduleId,
      performed_by: user.id,
      performed_by_name: profile.full_name || 'Usuário',
    }, {
      onSuccess: (record: { id: string }) => {
        setCurrentRecordId(record.id);
        setExecutionModalOpen(true);
      }
    });

  };

  const handleCompleteMaintenance = (data: Parameters<NonNullable<React.ComponentProps<typeof MaintenanceExecutionModal>['onComplete']>>[0]) => {
    if (!currentRecordId) return;

    completeMaintenance.mutate({
      record_id: currentRecordId,
      ...data
    }, {
      onSuccess: () => {
        setExecutionModalOpen(false);
        setSelectedSchedule(null);
        setCurrentRecordId(null);
      }
    });
  };

  const handleToggleBulk = async (active: boolean) => {
    if (selectedMachines.size === 0) return;

    try {
      const { error } = await supabase
        .from('machines')
        .update({ is_active: active })
        .in('id', Array.from(selectedMachines));

      if (error) throw error;

      toast.success(`${selectedMachines.size} máquinas ${active ? 'ativadas' : 'desativadas'}`);
      setSelectedMachines(new Set());
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    } catch (error) {

      toast.error('Erro ao atualizar máquinas');
    }
  };

  const filteredMachines = useMemo(() => {
    return machines.filter((m: DbMachine) => {
      const matchesSearch = m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && m.is_active) ||
                           (statusFilter === 'inactive' && !m.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [machines, searchTerm, statusFilter]);

  const machinesByTechnique = useMemo(() => {
    return filteredMachines.reduce<Record<string, DbMachine[]>>((acc, machine) => {
      const techniqueId = machine.technique_id;
      if (!acc[techniqueId]) {
        acc[techniqueId] = [];
      }
      acc[techniqueId].push(machine);
      return acc;
    }, {});
  }, [filteredMachines]);


  if (isLoadingMachines) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-20">
        {/* Breadcrumbs removed - handled by MainLayout */}

        <MachineBulkActions
          selectedCount={selectedMachines.size}
          onToggle={handleToggleBulk}
          onCancel={() => setSelectedMachines(new Set())}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl text-title font-bold gradient-text">Máquinas</h1>
            <p className="text-muted-foreground">Orquestração e monitoramento de equipamentos industriais</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="gap-2" onClick={() => exportData()}>
               <FileDown className="h-4 w-4" />
               Exportar
             </Button>
             <VoiceButton />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <TargetArrowIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{machines.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Frota Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{machines.filter(m => m.is_active).length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Operacionais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold">
                    {isLoadingReliability ? <Skeleton className="h-6 w-12" /> : `${Math.round(reliabilitySummary.averageAvailability)}%`}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Disponibilidade</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold">
                    {isLoadingReliability ? <Skeleton className="h-6 w-12" /> : reliabilitySummary.criticalMachines.length}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Críticas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className="bg-muted/50 p-1 w-fit">
              <TabsTrigger value="list" className="gap-2">
                <TargetArrowIcon className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-2">
                <MapIcon className="h-4 w-4" />
                Heatmap
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por código ou nome..."
                  className="pl-9 bg-muted/30 border-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant={statusFilter === 'all' ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter(prev => prev === 'all' ? 'active' : prev === 'active' ? 'inactive' : 'all')}
              >
                {statusFilter === 'all' ? 'Status: Todos' : statusFilter === 'active' ? 'Ativas' : 'Inativas'}
              </Button>
            </div>
          </div>

          <TabsContent value="list" className="space-y-6 outline-none">
            <AnimatePresence mode="popLayout">
              {Object.entries(machinesByTechnique).length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center"
                >
                  <TargetArrowIcon className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">Nenhuma máquina encontrada com os filtros aplicados.</p>
                </motion.div>
              ) : (
                Object.entries(machinesByTechnique).map(([techniqueId, techMachines]) => {
                  const technique = techniqueId ? getTechniqueById(techniqueId) : undefined;
                  return (
                    <motion.div
                      layout
                      key={techniqueId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card className="glass-card overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/10 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-base">
                              <div
                                className="w-2 h-2 rounded-full ring-4 ring-background"
                                style={{ backgroundColor: technique?.color || '#888' }}
                              />
                              <span>{technique?.name || 'Técnica Desconhecida'}</span>
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest">
                                {(techMachines as DbMachine[]).length}
                              </Badge>
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] uppercase font-bold tracking-tighter"
                              onClick={() => {
                                const allSelected = (techMachines as DbMachine[]).every((m) => selectedMachines.has(m.id));
                                setSelectedMachines(prev => {
                                  const next = new Set(prev);
                                  (techMachines as DbMachine[]).forEach((m) => {
                                    if (allSelected) next.delete(m.id);
                                    else next.add(m.id);
                                  });
                                  return next;
                                });
                              }}
                            >
                              {(techMachines as DbMachine[]).every((m) => selectedMachines.has(m.id)) ? 'Deselecionar' : 'Selecionar Grupo'}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {(techMachines as DbMachine[]).map((machine, idx: number) => {

                              const machineMetrics = oeeData?.byMachine.find(m => m.machineId === machine.id);
                              return (
                                <div key={machine.id} className="relative group">
                                  <MachineCard
                                    machine={machine}
                                    isSelected={selectedMachines.has(machine.id)}
                                    onSelect={(id) => {
                                      setSelectedMachines(prev => {
                                        const next = new Set(prev);
                                        if (next.has(id)) next.delete(id);
                                        else next.add(id);
                                        return next;
                                      });
                                    }}
                                    onOpenSettings={setSelectedMachine}
                                    index={idx}
                                    metrics={machineMetrics ? {
                                      oee: machineMetrics.oee,
                                      availability: machineMetrics.availability,
                                      performance: machineMetrics.performance,
                                      quality: machineMetrics.quality
                                    } : undefined}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-12 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-background/50 hover:bg-primary/10 hover:text-primary z-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMachineForQR(machine);
                                    }}
                                  >
                                    <QrCodeIcon className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="heatmap" className="outline-none">
             <FactoryHeatmap machines={machines} techniques={techniques} />
          </TabsContent>
        </Tabs>

        {/* Machine QR Code Dialog */}
        <Dialog open={!!machineForQR} onOpenChange={() => setMachineForQR(null)}>
          <DialogContent className="sm:max-w-xs text-center">
            <DialogHeader>
              <DialogTitle className="text-center">TAG de Máquina</DialogTitle>
              <DialogDescription className="text-center">Escaneie para acesso mobile</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-xl border-2 border-black">
                <QRCodeSVG
                  value={JSON.stringify({ id: machineForQR?.id, code: machineForQR?.code, type: 'machine' })}
                  size={200}
                  level="H"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black">{machineForQR?.code}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">{machineForQR?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <TargetArrowIcon className="h-4 w-4" /> Imprimir
              </Button>
              <Button className="gap-2" onClick={() => {
                toast.success("QR Code enviado para o terminal móvel.");
                setMachineForQR(null);
              }}>
                <Zap className="h-4 w-4" /> Enviar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Machine Profile / TPM Dialog */}
        <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                   <TargetArrowIcon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {selectedMachine?.code}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedMachine?.name} • {selectedMachine?.technique_id ? getTechniqueById(selectedMachine.technique_id)?.name : 'Técnica não definida'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedMachine && (
              <Tabs defaultValue="tpm" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b border-border/50">
                  <TabsList className="bg-transparent p-0 h-12 gap-6">
                    <TabsTrigger value="tpm" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-sm font-bold uppercase tracking-tight">Manutenção</TabsTrigger>
                    <TabsTrigger value="reliability" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-sm font-bold uppercase tracking-tight">Confiabilidade</TabsTrigger>
                    <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-sm font-bold uppercase tracking-tight">Histórico</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-auto min-h-0 p-6">
                  <TabsContent value="tpm" className="mt-0 outline-none">
                    <MachineTPMPanel
                      machineId={selectedMachine.id}
                      onStartMaintenance={handleStartMaintenance}
                      onOpenCreateSchedule={() => setCreateScheduleModalOpen(true)}
                    />
                  </TabsContent>

                  <TabsContent value="reliability" className="mt-0 outline-none">
                    <MachineReliabilityTab machineId={selectedMachine.id} />
                  </TabsContent>

                  <TabsContent value="history" className="mt-0 outline-none">
                    <MachineHistoryTab machineId={selectedMachine.id} />
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Execution Modal */}
        <MaintenanceExecutionModal
          isOpen={executionModalOpen}
          onClose={() => setExecutionModalOpen(false)}
          schedule={selectedSchedule}
          recordId={currentRecordId}
          onComplete={handleCompleteMaintenance}
          isSubmitting={completeMaintenance.isPending}
        />

        {/* Create Schedule Modal */}
        {selectedMachine && (
          <CreateScheduleModal
            machines={machines}
            maintenanceTypes={maintenanceTypes}
            initialMachineId={selectedMachine.id}
            isOpen={createScheduleModalOpen}
            onOpenChange={setCreateScheduleModalOpen}
            onSubmit={(data) => createSchedule.mutate(data)}
            isSubmitting={createSchedule.isPending}
          />
        )}
      </div>
    </MainLayout>
  );
}

function MachineHistoryTab({ machineId }: { machineId: string }) {
  const [period, setPeriod] = useState<HistoryPeriodValue>({ preset: 'all' });
  const { data, isLoading, error } = useEntityAuditTrail('machines', machineId, {
    fromDate: period.fromDate,
    toDate: period.toDate,
  });
  const { exportAuditTrail } = useDataExport('machines');

  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    exportAuditTrail({
      entityType: 'machines',
      entityId: machineId,
      fromDate: period.fromDate,
      toDate: period.toDate,
    }, `auditoria_maquina_${machineId.slice(0, 8)}`, format);
  }, [machineId, period, exportAuditTrail]);

  return (
    <div className="space-y-6">
      <HistoryPeriodFilter
        value={period}
        onChange={setPeriod}
        onExport={handleExport}
        resultCount={data?.length}
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive p-4 border border-destructive/30 rounded-xl bg-destructive/10">
          Não foi possível carregar o histórico.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-2xl bg-muted/10">
          Nenhum registro encontrado no período selecionado.
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3 pb-4">
            {data.map((entry) => (
              <AuditEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function FactoryHeatmap({ machines, techniques }: { machines: DbMachine[]; techniques: DbTechnique[] }) {
  const { jobs } = useSchedulingData();

  const getHeatColor = (machine: DbMachine) => {
    if (!machine.is_active) return 'bg-slate-200 dark:bg-slate-800 opacity-40';

    // Count jobs in production for this machine
    const productionJobs = jobs.filter(j => j.machine_id === machine.id && j.status === 'production').length;

    if (productionJobs > 0) return 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]';

    // Check if machine is scheduled for today
    const today = new Date().toISOString().split('T')[0];
    const scheduledToday = jobs.filter(j => j.machine_id === machine.id && j.scheduled_date === today).length;

    if (scheduledToday > 0) return 'bg-warning shadow-[0_0_10px_rgba(251,191,36,0.3)]';

    return 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.2)]';
  };

  const getMachineStats = (machine: DbMachine) => {

    const machineJobs = jobs.filter(j => j.machine_id === machine.id);
    const productionCount = machineJobs.filter(j => j.status === 'production').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = machineJobs.filter(j => j.scheduled_date === today).length;
    const completedCount = machineJobs.filter(j => j.status === 'finished').length;

    return {
      productionCount,
      todayCount,
      completedCount,
      occupancy: machineJobs.length > 0 ? Math.min(100, (todayCount / 5) * 100) : 0
    };
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-warning" />
                Layout Térmico da Fábrica
              </CardTitle>
              <CardDescription>Visualização em tempo real de pontos de calor e ociosidade</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tighter shrink-0">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> Carga Alta</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /> Normal</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /> Inativo</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 overflow-auto">
          <div className="min-w-[800px] relative aspect-[21/9] bg-muted/20 rounded-2xl border-4 border-dashed border-border/40 p-12 overflow-hidden">
             {/* Grid background */}
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

             <div className="relative z-10 grid grid-cols-8 gap-4 h-full">
               {machines.slice(0, 48).map((machine, i) => (
                 <TooltipProvider key={machine.id}>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <motion.div
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         transition={{ delay: i * 0.01 }}
                         className={cn(
                           "w-full aspect-square rounded-lg flex items-center justify-center transition-all cursor-help",
                           getHeatColor(machine)
                         )}
                       >
                         <span className="text-[8px] font-mono font-bold text-white/80">{machine.code}</span>
                       </motion.div>
                     </TooltipTrigger>
                      <TooltipContent>
                         <p className="font-bold">{machine.code}</p>
                         <p className="text-xs">{machine.name}</p>
                         <div className="mt-2 space-y-1 pt-1 border-t border-border/50">
                            <p className="text-[10px] uppercase font-bold flex justify-between gap-4">
                               <span>Em Produção:</span>
                               <span className="text-primary">{getMachineStats(machine).productionCount}</span>
                            </p>
                            <p className="text-[10px] uppercase font-bold flex justify-between gap-4">
                               <span>Agendados Hoje:</span>
                               <span>{getMachineStats(machine).todayCount}</span>
                            </p>
                            <p className="text-[10px] uppercase font-bold flex justify-between gap-4">
                               <span>Ocupação:</span>
                               <span className="text-warning">{Math.round(getMachineStats(machine).occupancy)}%</span>
                            </p>
                         </div>
                      </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
               ))}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
