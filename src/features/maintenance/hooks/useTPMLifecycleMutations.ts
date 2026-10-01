import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { TPM_ERROR_CONTEXT } from './types';
import type {
  MaintenanceSchedule,
  MaintenanceAlert,
  ChecklistSnapshot,
  AdjustmentParameters,
  QualityChecklistResult
} from './types';

interface UseTPMMutationsProps {
  schedules: MaintenanceSchedule[];
  alerts: MaintenanceAlert[];
}

export function useTPMLifecycleMutations({ schedules, alerts }: UseTPMMutationsProps) {
  const queryClient = useQueryClient();
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
  return {
    createSchedule,
    startMaintenance,
    completeMaintenance
  };
}
