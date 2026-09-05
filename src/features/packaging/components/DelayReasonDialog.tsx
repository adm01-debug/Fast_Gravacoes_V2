import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { DELAY_CATEGORIES, delayReasonSchema, type DelayReasonForm } from '../types/packaging.schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slaLabel: string;
  onConfirm: (values: DelayReasonForm) => Promise<void> | void;
  submitting?: boolean;
}

export function DelayReasonDialog({ open, onOpenChange, slaLabel, onConfirm, submitting }: Props) {
  const form = useForm<DelayReasonForm>({
    resolver: zodResolver(delayReasonSchema),
    defaultValues: { delay_category: 'fila_manuseio', delay_reason: '' },
  });
  const [category, setCategory] = useState<DelayReasonForm['delay_category']>('fila_manuseio');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Tarefa com SLA vencido
          </DialogTitle>
          <DialogDescription>
            Antes de liberar para envio, registre o motivo do atraso. {slaLabel}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (values) => {
            await onConfirm(values);
          })}
          className="space-y-4"
        >
          <div>
            <Label>Categoria do atraso</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as DelayReasonForm['delay_category']);
                form.setValue('delay_category', v as DelayReasonForm['delay_category']);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DELAY_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="delay_reason">Descrição / causa raiz</Label>
            <Textarea id="delay_reason" rows={3} {...form.register('delay_reason')} />
            {form.formState.errors.delay_reason && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.delay_reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando…' : 'Confirmar envio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
