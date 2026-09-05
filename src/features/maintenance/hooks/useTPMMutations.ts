import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database, Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { addDays, differenceInDays, isBefore, parseISO } from 'date-fns';
import { showErrorToast, categorizeError } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { CheckCircle2 } from 'lucide-react';
import { 
  MaintenanceSchedule, 
  MaintenanceAlert, 
  TPM_ERROR_CONTEXT,
  ChecklistSnapshot,
  AdjustmentParameters,
  QualityChecklistResult
} from './types';

interface UseTPMMutationsProps {
  schedules: MaintenanceSchedule[];
  alerts: MaintenanceAlert[];
}

export function useTPMMutations({ schedules, alerts }: UseTPMMutationsProps) {
  const queryClient = useQueryClient();

  // Create schedule mutation
  const createSchedule = useMutation({
    mutationFn: async (data: {
      machine_id: string;
      maintenance_type_id: string;
      name: string;
      description?: string;
      interval_days: number;
      next_due_at: string;
      estimated_duration_minutes: number;
    }) => {
      const { error } = await supabase.from('maintenance_schedules').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      toast.success('Manutenção agendada com sucesso');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao agendar manutenção', TPM_ERROR_CONTEXT.schedules);
    },
  });

  // Start maintenance mutation
  const startMaintenance = useMutation({
    mutationFn: async (data: {
      schedule_id: string;
      performed_by: string;
      performed_by_name: string;
    }) => {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('id', data.schedule_id)
        .maybeSingle();

      if (scheduleError || !scheduleData) {
        throw new Error('Agendamento não encontrado');
      }

      const { data: record, error } = await supabase
        .from('maintenance_records')
        .insert({
          schedule_id: data.schedule_id,
          machine_id: scheduleData.machine_id,
          maintenance_type_id: scheduleData.maintenance_type_id,
          performed_by: data.performed_by,
          performed_by_name: data.performed_by_name,
          status: 'in_progress',
        })
        .select()
        .single();
      if (error) throw error;
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      toast.success('Manutenção iniciada');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao iniciar manutenção', TPM_ERROR_CONTEXT.records);
    },
  });

  // Complete maintenance mutation
  const completeMaintenance = useMutation({
    mutationFn: async (data: {
      record_id: string;
      notes?: string;
      total_cost?: number;
      downtime_minutes?: number;
      checklist_version?: number;
      checklist_snapshot?: ChecklistSnapshot;
      technical_sheet_id?: string;
      technical_sheet_version?: number;
      adjustment_parameters?: AdjustmentParameters;
      quality_checklist_results?: QualityChecklistResult[];
      failure_risk_detected?: boolean;
      responses?: Array<{
        checklist_item_id: string;
        is_checked: boolean;
        measurement_value?: number;
        notes?: string;
        photo_url?: string;
      }>;
      parts?: Array<{
        name: string;
        code?: string;
        quantity: number;
        cost?: number;
      }>;
      supplies_used?: Array<{
        name: string;
        quantity: string;
        alternative_used?: boolean;
        original_recommended_id?: string;
      }>;
      execution_alerts?: Array<{
        alert_type: string;
        parameter_name?: string;
        expected_range?: string;
        actual_value?: string;
        severity?: string;
        description?: string;
        evidence_urls?: string[];
      }>;
      signature?: string;
    }) => {
      const { data: recordData, error: recordFetchError } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('id', data.record_id)
        .maybeSingle();

      if (recordFetchError || !recordData) {
        throw new Error('Registro de manutenção não encontrado no sistema.');
      }

      // Validar Snapshot do Checklist
      if (data.checklist_snapshot) {
        if (!data.checklist_snapshot.id || !data.checklist_snapshot.items || data.checklist_snapshot.items.length === 0) {
          throw new Error('Snapshot do checklist inválido: estrutura de dados corrompida ou incompleta.');
        }
      }

      // Validar Parâmetros de Ajuste
      if (data.adjustment_parameters) {
        const params = data.adjustment_parameters;
        if (typeof params !== 'object') {
          throw new Error('Parâmetros de ajuste inválidos: formato incorreto.');
        }
        
        // Se houver ficha técnica, os parâmetros devem estar dentro dos limites aceitáveis
        if (params.ranges) {
          const criticalAlerts = (data.execution_alerts || []).filter(a => a.alert_type === 'out_of_range' && a.severity === 'critical');
          const hasEvidence = criticalAlerts.every(a => a.evidence_urls && a.evidence_urls.length > 0);
          
          if (criticalAlerts.length > 0 && !hasEvidence) {
            throw new Error(`Existem ${criticalAlerts.length} parâmetros fora do range crítico sem evidências fotográficas anexadas.`);
          }
        }
      }

      // Validar Requisitos de Qualidade
      if (data.quality_checklist_results && Array.isArray(data.quality_checklist_results)) {
        const failures = data.quality_checklist_results.filter(r => r.status === 'fail' && (!r.notes || r.notes.length < 5));
        if (failures.length > 0) {
          throw new Error(`Reprovação em ${failures.length} itens de qualidade exige justificativa técnica detalhada.`);
        }
      }

      // Validar Tempos e Custos
      if (data.downtime_minutes && data.downtime_minutes > 480) {
         toast.warning("Tempo de parada muito alto (>8h) detectado. Certifique-se de que o valor está correto.", {
           action: { label: 'Revisar', onClick: () => {} }
         });
      }

      if (data.total_cost && data.total_cost > 10000) {
         toast.warning("Custo de manutenção elevado detectado. Verifique se o valor está em centavos ou reais.", {
           description: `R$ ${(data.total_cost).toLocaleString('pt-BR')}`,
           duration: 6000
         });
      }

      // Update the main record to 'completed' (Pending Approval)
      const { error: recordError } = await (supabase
        .from('maintenance_records')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: data.notes,
          total_cost: data.total_cost || 0,
          downtime_minutes: data.downtime_minutes || 0,
          signature_url: data.signature,
          checklist_version: data.checklist_version,
          checklist_snapshot: data.checklist_snapshot as unknown as Json,
          technical_sheet_id: data.technical_sheet_id,
          technical_sheet_version: data.technical_sheet_version,
          adjustment_parameters: data.adjustment_parameters as unknown as Json,
          // NOTE: `quality_checklist_results` and `failure_risk_detected` are columns
          // on `tpm_executions`, not `maintenance_records`. Writing them here made the
          // whole update fail at runtime ("column does not exist"), so they are omitted.
        } as never)
        .eq('id', data.record_id));

      if (recordError) throw recordError;

      // Register specific execution alerts if provided
      if (data.execution_alerts && data.execution_alerts.length > 0) {
        const { error: alertsErr } = await supabase
          .from('tpm_execution_alerts')
          .insert(data.execution_alerts.map(alert => ({
            ...alert,
            execution_id: data.record_id
          })));
        if (alertsErr) throw alertsErr;
      }

      // Register supplies used
      if (data.supplies_used && data.supplies_used.length > 0) {
        const { error: suppliesErr } = await supabase
          .from('tpm_execution_supplies')
          .insert(data.supplies_used.map(supply => ({
            ...supply,
            execution_id: data.record_id
          })));
        if (suppliesErr) throw suppliesErr;
      }

      // Se houver parâmetros fora do recomendado, registrar alertas na tabela legada tpm_parameter_alerts também
      // para compatibilidade com painéis existentes se necessário, mas tpm_execution_alerts é o novo padrão.
      if (data.adjustment_parameters?.ranges) {
        const params = data.adjustment_parameters;
        const ranges = params.ranges;
        const alertsToInsert: Array<{
          execution_id: string;
          parameter_name: string;
          recorded_value: string;
          recommended_range: string;
          severity: string;
        }> = [];

        const checkRange = (name: string, value: string | undefined, range: { min?: string; max?: string } | undefined) => {
          if (!value || !range || (!range.min && !range.max)) return;
          const val = parseFloat(value.replace(/[^0-9.]/g, ''));
          const min = range.min ? parseFloat(range.min.replace(/[^0-9.]/g, '')) : -Infinity;
          const max = range.max ? parseFloat(range.max.replace(/[^0-9.]/g, '')) : Infinity;

          if (!isNaN(val)) {
            if (val < min || val > max) {
              alertsToInsert.push({
                execution_id: data.record_id,
                parameter_name: name,
                recorded_value: value,
                recommended_range: `Mín: ${range.min || '-'} / Máx: ${range.max || '-'}`,
                severity: 'warning'
              });
            }
          }
        };

        if (ranges) {
          checkRange('Passadas de Rodo', params.squeegee_passes, ranges.squeegee_passes);
          checkRange('Pressão', params.pressure, ranges.pressure);
          checkRange('Velocidade', params.speed, ranges.speed);
          checkRange('Temperatura', params.temperature, ranges.temperature);
        }

        if (alertsToInsert.length > 0) {
          const { error: alertInsertError } = await supabase.from('tpm_parameter_alerts').insert(alertsToInsert);
          if (alertInsertError) throw alertInsertError;
        }
      }

      // Insert checklist responses if provided
      if (data.responses && data.responses.length > 0) {
        const responsesToInsert = data.responses.map(resp => ({
          record_id: data.record_id,
          ...resp
        }));

        const { error: respError } = await supabase
          .from('maintenance_item_responses')
          .insert(responsesToInsert);

        if (respError) throw respError;
      }

      // Insert parts if provided
      if (data.parts && data.parts.length > 0) {
        const partsToInsert = data.parts.map(part => ({
          execution_id: data.record_id, // Map record_id to execution_id for the new table
          part_name: part.name,
          part_code: part.code,
          quantity: part.quantity,
          cost: part.cost
        }));

        // Insert into tpm_execution_parts (new table)
        const { error: partsError } = await supabase
          .from('tpm_execution_parts')
          .insert(partsToInsert);

        if (partsError) throw partsError;
      }

      // Scheduling recalculation moved to approveMaintenance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      toast.success('Execução concluída e enviada para revisão');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao concluir manutenção', TPM_ERROR_CONTEXT.records);
    },
  });

  // Approve maintenance mutation
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

  const checkAndGenerateAlerts = useMutation({
    mutationFn: async () => {
      const now = new Date();

      // 1. Static checks (due dates)
      const alertsToCreate: Array<{
        schedule_id: string;
        machine_id: string;
        alert_type: MaintenanceAlert['alert_type'];
        message: string;
      }> = schedules
        .filter(schedule => {
          const existingAlert = alerts.find(
            a => a.schedule_id === schedule.id && !a.is_resolved
          );
          return !existingAlert;
        })
        .map(schedule => {
          const dueDate = new Date(schedule.next_due_at);
          const daysUntilDue = differenceInDays(dueDate, now);

          let alertType: MaintenanceAlert['alert_type'] | null = null;
          let message = '';

          if (daysUntilDue < -7) {
            alertType = 'critical';
            message = `Manutenção CRÍTICA atrasada há ${Math.abs(daysUntilDue)} dias: ${schedule.name}`;
          } else if (daysUntilDue < 0) {
            alertType = 'overdue';
            message = `Manutenção atrasada há ${Math.abs(daysUntilDue)} dias: ${schedule.name}`;
          } else if (daysUntilDue === 0) {
            alertType = 'due';
            message = `Manutenção vence HOJE: ${schedule.name}`;
          } else if (daysUntilDue <= 3) {
            alertType = 'upcoming';
            message = `Manutenção próxima (${daysUntilDue} dias): ${schedule.name}`;
          }

          if (alertType) {
            return {
              schedule_id: schedule.id,
              machine_id: schedule.machine_id,
              alert_type: alertType,
              message,
            };
          }
          return null;
        })
        .filter((alert): alert is NonNullable<typeof alert> => alert !== null);

      // 2. Predictive AI Check (Edge Function)
      try {

        const { data: mlResult, error: mlError } = await supabase.functions.invoke('ml-predictions', {
          body: { action: 'batch_analyze' }
        });

        if (!mlError && mlResult?.predictions) {
          mlResult.predictions.forEach((p: { machine: { id: string }, prediction: { risk_score: number, recommendations?: string[] } }) => {
            if (p.prediction?.risk_score > 75) {
              // High risk detected by AI, find the primary schedule for this machine
              const machineSchedule = schedules.find(s => s.machine_id === p.machine.id && s.is_active);
              if (machineSchedule) {
                const existingAlert = alerts.find(a => a.schedule_id === machineSchedule.id && a.alert_type === 'predictive' && !a.is_resolved);
                if (!existingAlert) {
                  alertsToCreate.push({
                    schedule_id: machineSchedule.id,
                    machine_id: p.machine.id,
                    alert_type: 'predictive',
                    message: `IA PREDIZ FALHA (Risco: ${p.prediction.risk_score}%): ${p.prediction.recommendations?.[0] || 'Inspeção urgente necessária'}`,
                  });
                }
              }
            }
          });
        }
      } catch (err) {
        // Verificação preditiva por IA é best-effort; não bloqueia o fluxo principal.
        logger.warn('Falha na análise preditiva de IA (TPM)', err, 'useTPMMutations');
      }

      const results = await Promise.all(
        alertsToCreate.map(async (alertData) => {
          const { error } = await supabase.from('maintenance_alerts').insert(alertData);
          return error ? null : alertData;
        })
      );

      return results.filter(r => r !== null).length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['machine-predictions'] });
      if (count > 0) {
        toast.info(`${count} alertas de manutenção (Estáticos + IA) gerados`);
      } else {
        toast.success('Diagnóstico concluído: Nenhum novo risco detectado.');
      }
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao gerar alertas de manutenção', TPM_ERROR_CONTEXT.alerts);
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('maintenance_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao resolver alerta', TPM_ERROR_CONTEXT.alerts);
    },
  });

  // Approve batch mutation. Must enforce the same minimum-evidence
  // requirements as single approveMaintenance (signature + photo when
  // required) — the batch path previously skipped that validation entirely,
  // letting records without required evidence get approved when done via
  // the batch UI but not the single-record UI. Every write's error is also
  // checked; a mid-batch RLS/constraint failure previously went unnoticed
  // and was still reported to the user as a full success.
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
    createSchedule,
    startMaintenance,
    approveMaintenance,
    approveBatch,
    requestCorrection,
    completeMaintenance,
    checkAndGenerateAlerts,
    resolveAlert,
  };
}
