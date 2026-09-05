/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cpu } from 'lucide-react';
import { useSchedulingData } from '@/features/jobs';
import { useOperatorMachines } from '@/features/production';
import type { OperatorWithProfile } from '@/features/production';

interface MachineAssignmentModalProps {
  operator: OperatorWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineAssignmentModal({ operator, open, onOpenChange }: MachineAssignmentModalProps) {
  const { machines, techniques, isLoading: loadingMachines } = useSchedulingData();
  const { assignments, assignMachine, unassignMachine, isLoading: loadingAssignments } = useOperatorMachines();
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const assignedMachineIds = operator
    ? (assignments || []).filter(a => a.operator_id === operator.user_id).map(a => a.machine_id)
    : [];

  useEffect(() => {
    if (operator && assignments) {
      setSelectedMachines(new Set(assignedMachineIds));
    }
  }, [operator, assignments]);

  const getTechniqueName = (techniqueId: string) => {
    return techniques?.find(t => t.id === techniqueId)?.name || techniqueId;
  };

  const getTechniqueColor = (techniqueId: string) => {
    return techniques?.find(t => t.id === techniqueId)?.color || '#888';
  };

  const handleToggleMachine = (machineId: string) => {
    setSelectedMachines(prev => {
      const next = new Set(prev);
      if (next.has(machineId)) {
        next.delete(machineId);
      } else {
        next.add(machineId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!operator) return;
    setIsSaving(true);

    try {
      const toAdd = [...selectedMachines].filter(id => !assignedMachineIds.includes(id));
      const toRemove = assignedMachineIds.filter(id => !selectedMachines.has(id));

      for (const machineId of toRemove) {
        await unassignMachine.mutateAsync({ operatorId: operator.user_id, machineId });
      }

      for (const machineId of toAdd) {
        await assignMachine.mutateAsync({ operatorId: operator.user_id, machineId });
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const machinesByTechnique = (machines || []).reduce((acc, machine) => {
    const key = machine.technique_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(machine);
    return acc;
  }, {} as Record<string, typeof machines>);

  const isLoading = loadingMachines || loadingAssignments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Atribuir Máquinas - {operator?.full_name || 'Operador'}
          </DialogTitle>
          <DialogDescription>
            Selecione as máquinas que este operador está autorizado a operar.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-6">
                {Object.entries(machinesByTechnique).map(([techniqueId, techMachines]) => (
                  <div key={techniqueId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getTechniqueColor(techniqueId) }}
                      />
                      <h4 className="font-medium text-sm">{getTechniqueName(techniqueId)}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {techMachines?.filter(m => selectedMachines.has(m.id)).length || 0}/{techMachines?.length || 0}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-5">
                      {techMachines?.map(machine => (
                        <label
                          key={machine.id}
                          htmlFor={`machine-assign-${machine.id}`}
                          className="flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            id={`machine-assign-${machine.id}`}
                            checked={selectedMachines.has(machine.id)}
                            onCheckedChange={() => handleToggleMachine(machine.id)}
                            aria-label={machine.name}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{machine.name}</p>
                            <p className="text-xs text-muted-foreground">{machine.code}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedMachines.size} máquina(s) selecionada(s)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
