/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaintenanceType } from '@/features/maintenance/hooks/useTPM';

interface CreateScheduleModalProps {
  machines: { id: string; name: string; code: string }[];
  maintenanceTypes: MaintenanceType[];
  onSubmit: (data: {
    machine_id: string;
    maintenance_type_id: string;
    name: string;
    description?: string;
    interval_days: number;
    next_due_at: string;
    estimated_duration_minutes: number;
  }) => void;
  isSubmitting: boolean;
  initialMachineId?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateScheduleModal({
  machines,
  maintenanceTypes,
  onSubmit,
  isSubmitting,
  initialMachineId,
  isOpen: propsOpen,
  onOpenChange: propsOnOpenChange
}: CreateScheduleModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = propsOpen !== undefined ? propsOpen : internalOpen;
  const setOpen = propsOnOpenChange || setInternalOpen;

  const [formData, setFormData] = useState({
    machine_id: initialMachineId || '',
    maintenance_type_id: '',
    name: '',
    description: '',
    interval_days: 30,
    next_due_at: new Date().toISOString().split('T')[0],
    estimated_duration_minutes: 60,
  });

  useEffect(() => {
    if (initialMachineId) {
      setFormData(prev => ({ ...prev, machine_id: initialMachineId }));
    }
  }, [initialMachineId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      next_due_at: new Date(formData.next_due_at).toISOString(),
    });
    setOpen(false);
    setFormData({
      machine_id: initialMachineId || '',
      maintenance_type_id: '',
      name: '',
      description: '',
      interval_days: 30,
      next_due_at: new Date().toISOString().split('T')[0],
      estimated_duration_minutes: 60,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!propsOpen && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Agendar Manutenção
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-title">Nova Manutenção Programada</DialogTitle>
          <DialogDescription>
            Configure os detalhes para o agendamento de uma nova manutenção preventiva.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Máquina *</Label>
            <Select
              value={formData.machine_id}
              onValueChange={(v) => setFormData(prev => ({ ...prev, machine_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a máquina" />
              </SelectTrigger>
              <SelectContent>
                {machines.map(machine => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name} ({machine.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Manutenção *</Label>
            <Select
              value={formData.maintenance_type_id}
              onValueChange={(v) => {
                const type = maintenanceTypes.find(t => t.id === v);
                setFormData(prev => ({
                  ...prev,
                  maintenance_type_id: v,
                  interval_days: type?.default_interval_days || 30,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome da Manutenção *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Troca de óleo, Calibração mensal..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes da manutenção..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Próxima Data *</Label>
              <Input
                type="date"
                value={formData.next_due_at}
                onChange={(e) => setFormData(prev => ({ ...prev, next_due_at: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalo (dias)</Label>
              <Input
                type="number"
                value={formData.interval_days}
                onChange={(e) => setFormData(prev => ({ ...prev, interval_days: parseInt(e.target.value, 10) || 30 }))}
                min={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duração Estimada (minutos)</Label>
            <Input
              type="number"
              value={formData.estimated_duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value, 10) || 60 }))}
              min={5}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.machine_id || !formData.maintenance_type_id || !formData.name}
            >
              {isSubmitting ? 'Salvando...' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
