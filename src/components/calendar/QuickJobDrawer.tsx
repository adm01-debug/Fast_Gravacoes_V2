/* eslint-disable react-hooks/incompatible-library -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DbMachine, DbTechnique } from '@/features/jobs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addMinutes, parse } from 'date-fns';
import { Loader2, Plus, Zap } from 'lucide-react';

const quickJobSchema = z.object({
  order_number: z.string().min(1, 'OS obrigatória'),
  client: z.string().min(1, 'Cliente obrigatório'),
  product: z.string().min(1, 'Produto obrigatório'),
  quantity: z.string().min(1, 'Qtd obrigatória'),
  technique_id: z.string().min(1, 'Técnica obrigatória'),
  machine_id: z.string().min(1, 'Máquina obrigatória'),
  start_time: z.string().min(1, 'Início obrigatório'),
  end_time: z.string().min(1, 'Fim obrigatório'),
});

type QuickJobFormValues = z.infer<typeof quickJobSchema>;

interface QuickJobDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedMachineId?: string;
  selectedTime?: { hour: number; minute: number };
  machines: DbMachine[];
  techniques: DbTechnique[];
  onSuccess: () => void;
}

export function QuickJobDrawer({
  open,
  onOpenChange,
  selectedDate,
  selectedMachineId,
  selectedTime,
  machines,
  techniques,
  onSuccess
}: QuickJobDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<QuickJobFormValues>({
    resolver: zodResolver(quickJobSchema),
    defaultValues: {
      order_number: '',
      client: '',
      product: '',
      quantity: '',
      technique_id: '',
      machine_id: '',
      start_time: '',
      end_time: '',
    }
  });

  const techniqueId = watch('technique_id');
  const availableMachines = machines.filter(m => m.technique_id === techniqueId);

  useEffect(() => {
    if (open) {
      if (selectedMachineId) {
        const machine = machines.find(m => m.id === selectedMachineId);
        if (machine) {
          setValue('technique_id', machine.technique_id);
          setValue('machine_id', machine.id);
        }
      }

      if (selectedTime) {
        const startStr = `${selectedTime.hour.toString().padStart(2, '0')}:${selectedTime.minute.toString().padStart(2, '0')}`;
        setValue('start_time', startStr);

        // Default 1 hour duration
        const startTime = parse(startStr, 'HH:mm', new Date());
        const endTime = addMinutes(startTime, 60);
        setValue('end_time', format(endTime, 'HH:mm'));
      }
    } else {
      reset();
    }
  }, [open, selectedMachineId, selectedTime, machines, setValue, reset]);

  const onSubmit = async (data: QuickJobFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        order_number: data.order_number,
        client: data.client,
        product: data.product,
        quantity: parseInt(data.quantity, 10),
        technique_id: data.technique_id,
        machine_id: data.machine_id,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: data.start_time,
        end_time: data.end_time,
        status: 'scheduled',
        priority: 'medium',
        estimated_duration: 60, // Default for quick job
      });

      if (error) {
        if (error.message?.includes('Conflito de agendamento')) {
          toast.error('Conflito de agendamento: máquina já possui job neste horário.');
          return;
        }
        throw error;
      }

      toast.success('Job agendado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {

      toast.error('Erro ao agendar job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md border-l border-border/40 bg-card/95 backdrop-blur-md">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2 text-title gradient-text">
            <Zap className="w-5 h-5 text-primary animate-pulse" />
            Agendamento Rápido
          </SheetTitle>
          <SheetDescription>
            Criando agendamento para {format(selectedDate, 'dd/MM/yyyy')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_number">OS *</Label>
              <Controller
                name="order_number"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="OS-001" className={errors.order_number ? 'border-destructive' : ''} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Controller
                name="client"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Nome" className={errors.client ? 'border-destructive' : ''} />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product">Produto *</Label>
            <Controller
              name="product"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Descrição do produto" className={errors.product ? 'border-destructive' : ''} />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Qtd *</Label>
              <Controller
                name="quantity"
                control={control}
                render={({ field }) => (
                  <Input {...field} type="number" placeholder="0" className={errors.quantity ? 'border-destructive' : ''} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Técnica *</Label>
              <Controller
                name="technique_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(v) => { field.onChange(v); setValue('machine_id', ''); }} value={field.value}>
                    <SelectTrigger className={errors.technique_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Técnica" />
                    </SelectTrigger>
                    <SelectContent>
                      {techniques.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Máquina *</Label>
            <Controller
              name="machine_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!techniqueId}>
                  <SelectTrigger className={errors.machine_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione a máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMachines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>{machine.code} - {machine.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Início *</Label>
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => (
                  <Input {...field} type="time" className={errors.start_time ? 'border-destructive' : ''} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fim *</Label>
              <Controller
                name="end_time"
                control={control}
                render={({ field }) => (
                  <Input {...field} type="time" className={errors.end_time ? 'border-destructive' : ''} />
                )}
              />
            </div>
          </div>

          <SheetFooter className="pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Agendar Agora
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
