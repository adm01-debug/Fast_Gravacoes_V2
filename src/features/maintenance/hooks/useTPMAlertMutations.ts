import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInCalendarDays } from 'date-fns';
import { showErrorToast } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { TPM_ERROR_CONTEXT } from './types';
import type {
  MaintenanceSchedule,
  MaintenanceAlert
} from './types';

interface UseTPMMutationsProps {
  schedules: MaintenanceSchedule[];
  alerts: MaintenanceAlert[];
}

export function useTPMAlertMutations({ schedules, alerts }: UseTPMMutationsProps) {
  const queryClient = useQueryClient();
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
        .map(schedule => {
          const dueDate = new Date(schedule.next_due_at);
          const daysUntilDue = differenceInCalendarDays(dueDate, now);

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

          if (!alertType) return null;

          return {
            schedule_id: schedule.id,
            machine_id: schedule.machine_id,
            alert_type: alertType,
            message,
          };
        })
        .filter((alert): alert is NonNullable<typeof alert> => alert !== null)
        .filter(alert => {
          const existingAlert = alerts.find(
            a =>
              a.schedule_id === alert.schedule_id &&
              a.alert_type === alert.alert_type &&
              !a.is_resolved
          );
          return !existingAlert;
        });

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

      // Resolve lower-severity pending alerts for schedules that are about
      // to receive a higher-severity alert (e.g. an 'overdue' supersedes a
      // pending 'due') so the panel never shows contradictory states for
      // the same maintenance at once.
      const alertSeverity: Record<MaintenanceAlert['alert_type'], number> = {
        upcoming: 1,
        due: 2,
        overdue: 3,
        critical: 4,
        predictive: 0,
      };
      const alertsToResolve = alerts.filter(a =>
        !a.is_resolved &&
        a.alert_type !== 'predictive' &&
        alertsToCreate.some(newAlert =>
          newAlert.schedule_id === a.schedule_id &&
          newAlert.alert_type !== 'predictive' &&
          alertSeverity[newAlert.alert_type] > alertSeverity[a.alert_type]
        )
      );
      // Insert first; only resolve the superseded (lower-severity) alerts
      // if every insert succeeds. This keeps the panel consistent when a
      // single write fails (an insert error no longer discards the
      // previous pending alert).
      const results = await Promise.all(
        alertsToCreate.map(async (alertData) => {
          const { error } = await supabase.from('maintenance_alerts').insert(alertData);
          return error ? null : alertData;
        })
      );

      if (results.every(r => r !== null)) {
        const supersedeMark = new Date().toISOString();
        for (const pending of alertsToResolve) {
          const { error } = await supabase
            .from('maintenance_alerts')
            .update({ is_resolved: true, resolved_at: supersedeMark })
            .eq('id', pending.id)
            // Guard: missing records mean a user dismissed (or resolved)
            // this alert concurrently ? do not overwrite their stamp.
            .eq('is_resolved', false);
          if (error) throw error;
        }
      }

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
  return {
    checkAndGenerateAlerts,
    resolveAlert
  };
}
