import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  defectTriageFormSchema,
  DEFECT_TYPE_LABELS,
  SEVERITY_LABELS,
  DECISION_LABELS,
  type DefectTriageForm,
  type PackagingDefectType,
  type PackagingDefectSeverity,
  type PackagingDefectDecision,
} from '../types/packaging.schema';
import { useState } from 'react';
import { packagingService } from '../services/packagingService';
import { toast } from 'sonner';

interface Props {
  taskId: string;
  onSubmit: (values: DefectTriageForm) => Promise<void> | void;
  submitting?: boolean;
}

export function DefectTriageForm({ taskId, onSubmit, submitting }: Props) {
  const [uploading, setUploading] = useState(false);
  const form = useForm<DefectTriageForm>({
    resolver: zodResolver(defectTriageFormSchema),
    defaultValues: {
      quantity: 1,
      defect_type: 'other',
      severity: 'minor',
      decision: 'discard',
      photo_url: '',
      notes: '',
    },
  });

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const url = await packagingService.uploadDefectPhoto(taskId, file);
      form.setValue('photo_url', url);
      toast.success('Foto enviada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Quantidade</Label>
          <Input id="quantity" type="number" min={1} {...form.register('quantity')} />
          {form.formState.errors.quantity && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.quantity.message}</p>
          )}
        </div>
        <div>
          <Label>Tipo de defeito</Label>
          <Select
            value={form.watch('defect_type')}
            onValueChange={(v) => form.setValue('defect_type', v as PackagingDefectType)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DEFECT_TYPE_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Severidade</Label>
          <Select
            value={form.watch('severity')}
            onValueChange={(v) => form.setValue('severity', v as PackagingDefectSeverity)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SEVERITY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Decisão</Label>
          <Select
            value={form.watch('decision')}
            onValueChange={(v) => form.setValue('decision', v as PackagingDefectDecision)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DECISION_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.watch('decision') === 'rework' && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          Ao registrar, um novo pedido de <strong>retrabalho</strong> será criado automaticamente
          na fila de produção com a mesma técnica e cliente, na quantidade defeituosa informada.
        </div>
      )}
      <div>
        {(() => {
          const photoRequired = form.watch('severity') === 'critical' || form.watch('decision') === 'rework';
          return (
            <>
              <Label htmlFor="defect-photo">
                Foto {photoRequired ? <span className="text-destructive">*</span> : '(opcional)'}
              </Label>
              <Input
                id="defect-photo"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {photoRequired && !form.watch('photo_url') && (
                <p className="text-xs text-amber-400 mt-1">
                  Anexe uma foto para {form.watch('severity') === 'critical' ? 'defeitos críticos' : 'pedidos de retrabalho'}.
                </p>
              )}
              {form.watch('photo_url') && (
                <p className="text-xs text-muted-foreground mt-1">Foto anexada.</p>
              )}
              {form.formState.errors.photo_url && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.photo_url.message}</p>
              )}
            </>
          );
        })()}
      </div>
      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={3} {...form.register('notes')} />
      </div>
      <Button type="submit" disabled={submitting || uploading} className="w-full">
        {submitting ? 'Registrando…' : 'Registrar defeito'}
      </Button>
    </form>
  );
}
