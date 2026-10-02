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
import { MachineStatsCards } from '@/components/machines/MachineStatsCards';
import { MachinesByTechniqueList } from '@/components/machines/MachinesByTechniqueList';
import { MachineQRDialog } from '@/components/machines/MachineQRDialog';
import { MachineProfileDialog } from '@/components/machines/MachineProfileDialog';
import { MachineHistoryTab } from '@/components/machines/MachineHistoryTab';
import { FactoryHeatmap } from '@/components/machines/FactoryHeatmap';
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

        <MachineStatsCards machines={machines} isLoadingReliability={isLoadingReliability} reliabilitySummary={reliabilitySummary} />
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
              <MachinesByTechniqueList
                machinesByTechnique={machinesByTechnique}
                getTechniqueById={getTechniqueById}
                selectedMachines={selectedMachines}
                onToggleSelect={(id) => {
                  setSelectedMachines(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onToggleGroup={(group, allSelected) => {
                  setSelectedMachines(prev => {
                    const next = new Set(prev);
                    group.forEach((m) => {
                      if (allSelected) next.delete(m.id);
                      else next.add(m.id);
                    });
                    return next;
                  });
                }}
                oeeData={oeeData}
                onOpenSettings={setSelectedMachine}
                onShowQR={setMachineForQR}
              />
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="heatmap" className="outline-none">
             <FactoryHeatmap machines={machines} techniques={techniques} />
          </TabsContent>
        </Tabs>

        <MachineQRDialog
          machine={machineForQR}
          onClose={() => setMachineForQR(null)}
        />
        {/* Machine Profile / TPM Dialog */}
        <MachineProfileDialog
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
          getTechniqueById={getTechniqueById}
          onStartMaintenance={handleStartMaintenance}
          onOpenCreateSchedule={() => setCreateScheduleModalOpen(true)}
        />
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
