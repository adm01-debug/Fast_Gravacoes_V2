import { TargetArrowIcon } from '@/components/icons/TargetArrowIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MachineTPMPanel } from '@/features/maintenance/components/MachineTPMPanel';
import { MachineReliabilityTab } from '@/components/machines/MachineReliabilityTab';
import { MachineHistoryTab } from '@/components/machines/MachineHistoryTab';
import type { DbMachine, DbTechnique } from '@/features/jobs';

interface MachineProfileDialogProps {
  machine: DbMachine | null;
  onClose: () => void;
  getTechniqueById: (id: string) => DbTechnique | undefined;
  onStartMaintenance: (scheduleId: string) => void;
  onOpenCreateSchedule: () => void;
}

export function MachineProfileDialog({ machine, onClose, getTechniqueById, onStartMaintenance, onOpenCreateSchedule }: MachineProfileDialogProps) {
  return (
    <Dialog open={!!machine} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                   <TargetArrowIcon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {machine?.code}
                  </DialogTitle>
                  <DialogDescription>
                    {machine?.name} • {machine?.technique_id ? getTechniqueById(machine.technique_id)?.name : 'Técnica não definida'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {machine && (
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
                      machineId={machine.id}
                      onStartMaintenance={onStartMaintenance}
                      onOpenCreateSchedule={onOpenCreateSchedule}
                    />
                  </TabsContent>

                  <TabsContent value="reliability" className="mt-0 outline-none">
                    <MachineReliabilityTab machineId={machine.id} />
                  </TabsContent>

                  <TabsContent value="history" className="mt-0 outline-none">
                    <MachineHistoryTab machineId={machine.id} />
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

  );
}
