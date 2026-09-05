import { useOEE, MachineOEE } from './useOEE';
import { useBusinessConfig } from '@/features/admin';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useCallback } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import { logger } from '@/lib/logger';
import { usePushNotifications, useNotificationSounds } from '@/features/notifications';
import { toast } from 'sonner';
import { createAppError } from '@/lib/errorHandling';

const CONTEXT = 'useOEEAlerts';

export function useOEEAlerts() {
  const { data: oeeData } = useOEE(1, 0, { startDate: startOfDay(new Date()), endDate: endOfDay(new Date()) }); // Check current day OEE strictly
  const { getConfig } = useBusinessConfig();
  const lastAlertsRef = useRef<Record<string, number>>({});
  const lastOEEValueRef = useRef<Record<string, number>>({}); // Track last seen values to detect drops
  const { sendNotification } = usePushNotifications();
  const { playBottleneckAlert } = useNotificationSounds();

  const checkMetric = useCallback(async (machine: MachineOEE, name: string, value: number, warningThreshold: number, criticalThreshold?: number) => {
    const prefs = localStorage.getItem('notification-preferences');
    const oeeAlertsEnabled = prefs ? JSON.parse(prefs).oeeAlerts !== false : true;
    if (!oeeAlertsEnabled) return;
    // Logic to prevent alert spam: only alert once every 4 hours per metric/machine
    const now = Date.now();
    const throttleMs = 4 * 60 * 60 * 1000;
    const alertKey = `${machine.machineId}-${name}`;
    const lastAlert = lastAlertsRef.current[alertKey] || 0;

    if (now - lastAlert < throttleMs) return;

    let severity: 'WARNING' | 'CRITICAL' | null = null;
    let threshold = warningThreshold;

    if (criticalThreshold && value < criticalThreshold) {
      severity = 'CRITICAL';
      threshold = criticalThreshold;
    } else if (value < warningThreshold) {
      severity = 'WARNING';
      threshold = warningThreshold;
    }

    if (severity) {
      try {
        // App notification
        const title = severity === 'CRITICAL' ? `🚨 CRÍTICO: ${name} em Queda` : `⚠️ ALERTA: ${name} Baixo`;
        const body = `${machine.machineName}: ${value.toFixed(1)}% (Limite: ${threshold}%)`;

        toast[severity === 'CRITICAL' ? 'error' : 'warning'](title, {
          description: body,
          duration: 10000,
        });

        // Sound alert for critical
        if (severity === 'CRITICAL') {
          playBottleneckAlert();
        }

        // Push notification
        sendNotification({
          title,
          body,
          tag: alertKey,
          requireInteraction: severity === 'CRITICAL',
          data: { route: '/oee', type: 'oee-alert' }
        });

        // Persist in DB
        await supabase.rpc('check_and_notify_kpi_alert', {
          p_machine_id: machine.machineId,
          p_metric_name: name,
          p_metric_value: value,
          p_threshold: threshold,
          p_severity: severity
        });

        lastAlertsRef.current[alertKey] = now;
        logger.info(`Alert triggered for ${machine.machineName}: ${name} is ${value}%`, { machine: machine.machineName, metric: name, value }, CONTEXT);
      } catch (err) {
        const appError = createAppError(err, { context: CONTEXT, machine: machine.machineName, metric: name });
        logger.error(`Failed to send KPI alert for ${machine.machineName}`, appError, CONTEXT);
      }
    }
  }, [sendNotification, playBottleneckAlert]);

  useEffect(() => {
    if (!oeeData || !oeeData.byMachine) return;

    // Skip alerts for the entire effect when there is no real production data —
    // zero OEE because of missing jobs is not an operational alert.
    const hasAnyProduction = oeeData.byMachine.some(
      m => m.totalJobs > 0 && m.plannedProductionMinutes > 0
    );
    if (!hasAnyProduction) return;

    const thresholds = {
      oee: {
        warning: Number(getConfig('oee_threshold_warning', 65)),
        critical: Number(getConfig('oee_threshold_critical', 50)),
      },
      availability: {
        warning: Number(getConfig('availability_threshold_warning', 70)),
      },
      performance: {
        warning: Number(getConfig('performance_threshold_warning', 75)),
      },
      speed: {
        warning: Number(getConfig('speed_threshold_warning', 80)),
      },
      quality: {
        warning: Number(getConfig('quality_threshold_warning', 95)),
      }
    };

    oeeData.byMachine.forEach(machine => {
      // Don't alert on 0% if the machine had no jobs at all in this period
      if (machine.totalJobs === 0 || machine.plannedProductionMinutes === 0) return;

      // Check main metrics
      checkMetric(machine, 'OEE', machine.oee, thresholds.oee.warning, thresholds.oee.critical);
      checkMetric(machine, 'Disponibilidade', machine.availability, thresholds.availability.warning);
      checkMetric(machine, 'Performance', machine.performance, thresholds.performance.warning);
      checkMetric(machine, 'Qualidade', machine.quality, thresholds.quality.warning);
      
      // Speed check (using performance as proxy)
      checkMetric(machine, 'Velocidade', machine.performance, thresholds.speed.warning);

      // DROP DETECTION: If OEE drops more than 10% compared to last check within the same session
      const lastVal = lastOEEValueRef.current[machine.machineId];
      if (lastVal !== undefined && lastVal - machine.oee > 10) {
        toast.error(`⚠️ QUEDA DE PERFORMANCE: ${machine.machineName}`, {
          description: `OEE caiu de ${lastVal.toFixed(1)}% para ${machine.oee.toFixed(1)}%`,
          duration: 0, // Persistent until closed
        });
      }
      lastOEEValueRef.current[machine.machineId] = machine.oee;
    });
  }, [oeeData, getConfig, checkMetric]);

  return null;
}
