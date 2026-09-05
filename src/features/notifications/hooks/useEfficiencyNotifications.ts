import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useBottleneckPrediction } from '@/features/analytics/hooks/useBottleneckPrediction';
import { useLoadBalancing } from '@/features/analytics/hooks/useLoadBalancing';
import { useEfficiencyAlertHistory } from '@/features/analytics/hooks/useEfficiencyAlertHistory';
import { navigateTo } from '@/lib/navigation';

interface EfficiencyNotificationConfig {
  enableBottleneckAlerts: boolean;
  enableLoadBalancingAlerts: boolean;
  checkIntervalMs: number;
}

const defaultConfig: EfficiencyNotificationConfig = {
  enableBottleneckAlerts: true,
  enableLoadBalancingAlerts: true,
  checkIntervalMs: 60000, // 1 minute
};

export function useEfficiencyNotifications(config: Partial<EfficiencyNotificationConfig> = {}) {
  const settings = { ...defaultConfig, ...config };

  const { alerts: bottleneckAlerts, criticalCount, warningCount } = useBottleneckPrediction();
  const { suggestions: loadBalancingSuggestions } = useLoadBalancing();
  const { activeAlerts, recordAlert, resolveAlert } = useEfficiencyAlertHistory();

  // Track previous state to detect changes
  const prevBottleneckCount = useRef<number>(0);
  const prevLoadBalancingCount = useRef<number>(0);
  const prevBottleneckIds = useRef<Set<string>>(new Set());
  const prevSuggestionIds = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  // Auto-resolve alerts that are no longer detected
  const autoResolveAlerts = useCallback(() => {
    if (!hasInitialized.current) return;

    const currentBottleneckKeys = new Set(bottleneckAlerts.map(a =>
      `${a.techniqueId}-${a.date.toISOString().split('T')[0]}`
    ));
    const currentSuggestionKeys = new Set(loadBalancingSuggestions.map(s =>
      `${s.jobId}-${s.currentMachineId}-${s.suggestedMachineId}`
    ));

    activeAlerts.forEach(alert => {
      const metadata = alert.metadata as Record<string, unknown> | null;

      if (alert.alert_type === 'bottleneck') {
        // Extract date from metadata (could be ISO string or Date object)
        let dateStr = '';
        if (metadata?.date) {
          const dateValue = metadata.date;
          if (typeof dateValue === 'string') {
            dateStr = dateValue.split('T')[0];
          } else if (dateValue instanceof Date) {
            dateStr = dateValue.toISOString().split('T')[0];
          }
        }
        const alertKey = `${alert.technique_id}-${dateStr}`;
        if (!currentBottleneckKeys.has(alertKey)) {
          // Alert no longer exists in current analysis, resolve it
          resolveAlert.mutate({
            alertId: alert.id,
            resolution_notes: 'Resolvido automaticamente: situação normalizada'
          });
        }
      } else if (alert.alert_type === 'load_balancing') {
        const alertKey = `${metadata?.jobId}-${metadata?.currentMachineId}-${metadata?.suggestedMachineId}`;
        if (!currentSuggestionKeys.has(alertKey)) {
          // Suggestion no longer relevant, resolve it
          resolveAlert.mutate({
            alertId: alert.id,
            resolution_notes: 'Resolvido automaticamente: carga rebalanceada'
          });
        }
      }
    });
  }, [activeAlerts, bottleneckAlerts, loadBalancingSuggestions, resolveAlert]);

  const checkBottleneckAlerts = useCallback(() => {
    if (!settings.enableBottleneckAlerts) return;

    const currentCount = (criticalCount ?? 0) + (warningCount ?? 0);
    const currentIds = new Set(bottleneckAlerts.map(a =>
      `${a.techniqueId}-${a.date.toISOString().split('T')[0]}`
    ));

    // Find new alerts that weren't in the previous set
    if (hasInitialized.current) {
      bottleneckAlerts.forEach(alert => {
        const alertId = `${alert.techniqueId}-${alert.date.toISOString().split('T')[0]}`;
        if (!prevBottleneckIds.current.has(alertId)) {
          // Record new alert to history
          recordAlert.mutate({
            alert_type: 'bottleneck',
            severity: alert.severity === 'critical' ? 'error' : 'warning',
            title: `Gargalo: ${alert.techniqueName}`,
            description: alert.message,
            technique_id: alert.techniqueId,
            metadata: {
              date: alert.date.toISOString(),
              currentCapacity: alert.currentCapacity,
              projectedCapacity: alert.projectedCapacity,
              jobCount: alert.jobCount,
              pendingJobCount: alert.pendingJobCount,
              machineCount: alert.machineCount
            }
          });
        }
      });

      // Show toast notifications for new alerts
      if (currentCount > prevBottleneckCount.current) {
        const newAlerts = currentCount - prevBottleneckCount.current;
        const criticalAlerts = bottleneckAlerts.filter(a => a.severity === 'critical');

        if (criticalAlerts.length > 0) {
          toast.error(`${newAlerts} novo(s) alerta(s) de gargalo`, {
            description: criticalAlerts[0]?.message || 'Técnica próxima da saturação',
            action: {
              label: 'Ver Alertas',
              onClick: () => navigateTo('/alerts'),
            },
            duration: 8000,
          });
        } else {
          toast.warning(`${newAlerts} novo(s) alerta(s) de gargalo`, {
            description: bottleneckAlerts[0]?.message || 'Atenção à capacidade',
            action: {
              label: 'Ver Alertas',
              onClick: () => navigateTo('/alerts'),
            },
            duration: 6000,
          });
        }
      }
    }

    prevBottleneckCount.current = currentCount;
    prevBottleneckIds.current = currentIds;
  }, [bottleneckAlerts, criticalCount, warningCount, settings.enableBottleneckAlerts, recordAlert]);

  const checkLoadBalancingAlerts = useCallback(() => {
    if (!settings.enableLoadBalancingAlerts) return;

    const currentCount = loadBalancingSuggestions.length;
    const currentIds = new Set(loadBalancingSuggestions.map(s => `${s.jobId}-${s.currentMachineId}-${s.suggestedMachineId}`));

    // Find new suggestions that weren't in the previous set
    if (hasInitialized.current) {
      loadBalancingSuggestions.forEach(suggestion => {
        const suggestionId = `${suggestion.jobId}-${suggestion.currentMachineId}-${suggestion.suggestedMachineId}`;
        if (!prevSuggestionIds.current.has(suggestionId)) {
          // Record new suggestion to history
          recordAlert.mutate({
            alert_type: 'load_balancing',
            severity: 'info',
            title: `Balanceamento de Carga`,
            description: `Sugestão: mover job ${suggestion.orderNumber} de ${suggestion.currentMachineName} para ${suggestion.suggestedMachineName}`,
            machine_id: suggestion.currentMachineId,
            metadata: {
              jobId: suggestion.jobId,
              orderNumber: suggestion.orderNumber,
              client: suggestion.client,
              currentMachineId: suggestion.currentMachineId,
              suggestedMachineId: suggestion.suggestedMachineId,
              loadDifference: suggestion.loadDifference
            }
          });
        }
      });

      // Show toast notifications for new suggestions
      if (currentCount > prevLoadBalancingCount.current) {
        const newSuggestions = currentCount - prevLoadBalancingCount.current;
        const topSuggestion = loadBalancingSuggestions[0];

        toast.info(`${newSuggestions} nova(s) sugestão(ões) de balanceamento`, {
          description: topSuggestion
            ? `Redistribuir de ${topSuggestion.currentMachineName} para ${topSuggestion.suggestedMachineName}`
            : 'Carga desbalanceada detectada',
          action: {
            label: 'Ver Sugestões',
            onClick: () => navigateTo('/alerts'),
          },
          duration: 6000,
        });
      }
    }

    prevLoadBalancingCount.current = currentCount;
    prevSuggestionIds.current = currentIds;
  }, [loadBalancingSuggestions, settings.enableLoadBalancingAlerts, recordAlert]);

  // Keep the latest dataset in a ref so the baseline can be seeded from the
  // data present when initialization completes (not the empty data at mount).
  const latestDataRef = useRef({ criticalCount, warningCount, bottleneckAlerts, loadBalancingSuggestions });
  useEffect(() => {
    latestDataRef.current = { criticalCount, warningCount, bottleneckAlerts, loadBalancingSuggestions };
  }, [criticalCount, warningCount, bottleneckAlerts, loadBalancingSuggestions]);

  // Initialize and run first check after a delay
  useEffect(() => {
    const initTimeout = setTimeout(() => {
      // Seed baselines from the data available at init time, so the first real
      // dataset that arrives during loading is not flagged as entirely "new".
      const data = latestDataRef.current;
      prevBottleneckCount.current = (data.criticalCount ?? 0) + (data.warningCount ?? 0);
      prevLoadBalancingCount.current = data.loadBalancingSuggestions.length;
      prevBottleneckIds.current = new Set(data.bottleneckAlerts.map(a => `${a.techniqueId}-${a.date.toISOString().split('T')[0]}`));
      prevSuggestionIds.current = new Set(data.loadBalancingSuggestions.map(s => `${s.jobId}-${s.currentMachineId}-${s.suggestedMachineId}`));
      hasInitialized.current = true;
    }, 3000);

    return () => clearTimeout(initTimeout);
  }, []); // Only run once on mount

  // Periodic checks for changes and auto-resolution
  useEffect(() => {
    if (!hasInitialized.current) return;

    checkBottleneckAlerts();
    checkLoadBalancingAlerts();
    autoResolveAlerts();
  }, [bottleneckAlerts, loadBalancingSuggestions, checkBottleneckAlerts, checkLoadBalancingAlerts, autoResolveAlerts]);

  // Manual check functions
  const forceCheckBottlenecks = useCallback(() => {
    if ((criticalCount ?? 0) > 0) {
      toast.error(`${criticalCount} gargalo(s) crítico(s) detectado(s)`, {
        description: bottleneckAlerts.find(a => a.severity === 'critical')?.message,
        action: {
          label: 'Ver Alertas',
          onClick: () => navigateTo('/alerts'),
        },
      });
    } else if ((warningCount ?? 0) > 0) {
      toast.warning(`${warningCount} alerta(s) de capacidade`, {
        description: bottleneckAlerts[0]?.message,
        action: {
          label: 'Ver Alertas',
          onClick: () => navigateTo('/alerts'),
        },
      });
    } else {
      toast.success('Sem gargalos detectados', {
        description: 'Capacidade operacional normal',
      });
    }
  }, [bottleneckAlerts, criticalCount, warningCount]);

  const forceCheckLoadBalancing = useCallback(() => {
    if (loadBalancingSuggestions.length > 0) {
      toast.info(`${loadBalancingSuggestions.length} sugestão(ões) de balanceamento`, {
        description: 'Redistribuição pode otimizar a produção',
        action: {
          label: 'Ver Sugestões',
          onClick: () => navigateTo('/alerts'),
        },
      });
    } else {
      toast.success('Carga balanceada', {
        description: 'Nenhuma redistribuição necessária',
      });
    }
  }, [loadBalancingSuggestions]);

  return {
    checkBottleneckAlerts: forceCheckBottlenecks,
    checkLoadBalancingAlerts: forceCheckLoadBalancing,
    bottleneckCount: (criticalCount ?? 0) + (warningCount ?? 0),
    loadBalancingCount: loadBalancingSuggestions.length,
  };
}
