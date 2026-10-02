import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { showErrorToast } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { CheckCircle2 } from 'lucide-react';
import { TPM_ERROR_CONTEXT } from './types';
import type {
  MaintenanceSchedule,
  MaintenanceAlert
} from './types';

interface UseTPMMutationsProps {
  schedules: MaintenanceSchedule[];
  alerts: MaintenanceAlert[];
}

export function useTPMApprovalMutations({ schedules, alerts }: UseTPMMutationsProps) {
  const queryClient = useQueryClient();
  const approveMaintenance = useMutation({
    mutationFn: async (data: {
      record_id: string;
      approver_id: string;
    }) => {
      // Single fetch for both validation data (responses/photos) and schedule
      // data — two separate fetches previously created a TOCTOU window where
      // a concurrent delete or double-approve could slip through after the first
      // validation check passed.
      const { data: record, error: fetchErr } = await supabase
        .from('maintenance_records')
        .select('*, responses:maintenance_item_responses(*, checklist_item:maintenance_checklist_items(requires_photo)), schedule:maintenance_schedules(*)')
        .eq('id', data.record_id)
        .single();

      if (fetchErr || !record) throw new Error('Registro não encontrado');

      if (!record.signature_url) throw new Error('Assinatura obrigatória ausente');

      // Requisito: pelo menos uma foto se algum item de checklist exigir foto.
      // requires_photo lives on maintenance_checklist_items, not on the
      // response row itself — must join through checklist_item_id to read it
      // (a bare cast to a shape with requires_photo on the response silently
      // always evaluated to false, so this check never actually fired).
      type ResponseRow = { checklist_item?: { requires_photo?: boolean | null } | null; photo_url?: string | null };
      const responses = (record.responses || []) as ResponseRow[];
      const hasPhotoRequired = responses.some((r) => r.checklist_item?.requires_photo);
      const hasPhoto = responses.some((r) => r.photo_url);
      if (hasPhotoRequired && !hasPhoto) {
        throw new Error('Pelo menos uma foto de evidência é obrigatória para itens que exigem foto.');
      }

      const recordData = record;
      const scheduleData = (recordData as { schedule?: { id: string; interval_days?: number } | null }).schedule ?? null;
      const nextDue = addDays(new Date(), scheduleData?.interval_days || 30).toISOString();



      // Update the record to 'approved'
      const { error: recordError } = await supabase
        .from('maintenance_records')
        .update({
          status: 'approved',
          approver_id: data.approver_id,
          approved_at: new Date().toISOString(),
          next_scheduled_date_after_approval: nextDue,
        } as never)
        .eq('id', data.record_id);

      if (recordError) throw recordError;

      // Update the schedule
      if (scheduleData) {
        const { error: scheduleError } = await supabase
          .from('maintenance_schedules')
          .update({
            last_completed_at: new Date().toISOString(),
            next_due_at: nextDue,
          })
          .eq('id', scheduleData.id);

        if (scheduleError) throw scheduleError;
      }

      // Resolve alerts — non-fatal: the record is already approved; log but
      // do not throw so a missing schedule_id does not roll back the approval.
      if (recordData.schedule_id) {
        const { error: resolveError } = await supabase
          .from('maintenance_alerts')
          .update({ is_resolved: true, resolved_at: new Date().toISOString() })
          .eq('schedule_id', recordData.schedule_id)
          .eq('is_resolved', false);
        if (resolveError) {
          logger.error('Falha ao resolver alertas de manutenção após aprovação', resolveError, 'useTPMMutations');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
      toast.success('Manutenção aprovada e próximo agendamento atualizado', {
        description: `Próxima revisão agendada.`,
        icon: React.createElement(CheckCircle2, { className: "h-4 w-4 text-success" })
      });
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao aprovar manutenção', TPM_ERROR_CONTEXT.records);
    },
  });

  // Request correction mutation
  const requestCorrection = useMutation({
    mutationFn: async (data: {
      record_id: string;
      notes: string;
      deadline?: string;
    }) => {
      const { error } = await (supabase
        .from('maintenance_records')
        .update({
          status: 'correction_requested',
          correction_notes: data.notes,
          correction_deadline: data.deadline,
        } as never)
        .eq('id', data.record_id));

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      toast.info('Solicitação de correção enviada ao técnico', {
        description: variables.notes.substring(0, 100) + (variables.notes.length > 100 ? '...' : ''),
        duration: 5000
      });
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao solicitar correção', TPM_ERROR_CONTEXT.records);
    },
  });

  const approveBatch = useMutation({
    mutationFn: async (data: {
      record_ids: string[];
      approver_id: string;
    }) => {
      const approved: string[] = [];
      const failed: Array<{ id: string; reason: string }> = [];

      for (const id of data.record_ids) {
        const { data: recordRaw, error: fetchErr } = await supabase
          .from('maintenance_records')
          .select('*, schedule:maintenance_schedules(*), responses:maintenance_item_responses(*, checklist_item:maintenance_checklist_items(requires_photo))')
          .eq('id', id)
          .single();

        const record = recordRaw as (typeof recordRaw & {
          schedule?: { id: string; interval_days?: number } | null;
          responses?: Array<{ checklist_item?: { requires_photo?: boolean | null } | null; photo_url?: string | null }> | null;
        }) | null;

        if (fetchErr || !record) {
          failed.push({ id, reason: 'Registro não encontrado' });
          continue;
        }

        if (!record.signature_url) {
          failed.push({ id, reason: 'Assinatura obrigatória ausente' });
          continue;
        }

        const responses = record.responses || [];
        const hasPhotoRequired = responses.some((r) => r.checklist_item?.requires_photo);
        const hasPhoto = responses.some((r) => r.photo_url);
        if (hasPhotoRequired && !hasPhoto) {
          failed.push({ id, reason: 'Foto de evidência obrigatória ausente' });
          continue;
        }

        const nextDue = addDays(new Date(), record.schedule?.interval_days || 30).toISOString();

        const { error: recordError } = await supabase
          .from('maintenance_records')
          .update({
            status: 'approved',
            approver_id: data.approver_id,
            approved_at: new Date().toISOString(),
            next_scheduled_date_after_approval: nextDue,
          } as never)
          .eq('id', id);

        if (recordError) {
          failed.push({ id, reason: recordError.message });
          continue;
        }

        if (record.schedule) {
          const { error: scheduleError } = await supabase
            .from('maintenance_schedules')
            .update({
              last_completed_at: new Date().toISOString(),
              next_due_at: nextDue,
            })
            .eq('id', record.schedule.id);

          if (scheduleError) {
            failed.push({ id, reason: scheduleError.message });
            continue;
          }
        }
        approved.push(id);
      }
      return { approved, failed };
    },
    onSuccess: ({ approved, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
      if (approved.length > 0) {
        toast.success(`${approved.length} manutenções aprovadas em lote`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} manutenções não puderam ser aprovadas`, {
          description: failed.map(f => f.reason).slice(0, 3).join('; '),
        });
      }
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao aprovar manutenções em lote', TPM_ERROR_CONTEXT.records);
    },
  });
  return {
    approveMaintenance,
    requestCorrection,
    approveBatch
  };
}
