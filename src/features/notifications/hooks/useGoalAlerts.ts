import { useMemo, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useOperatorGoals, calculateGoalProgress, GOAL_TYPE_LABELS, GoalType } from '@/features/production';
import { useOperatorProductivity } from '@/features/production';
import { navigateTo } from '@/lib/navigation';

export interface GoalAlert {
  goalId: string;
  operatorId: string;
  operatorName: string;
  goalType: GoalType;
  targetValue: number;
  currentValue: number;
  progressPercentage: number;
  daysRemaining: number;
  riskLevel: 'critical' | 'warning' | 'on-track';
  message: string;
}

interface GoalAlertConfig {
  criticalThreshold: number; // Below this % with < 7 days = critical
  warningThreshold: number;  // Below this % with < 14 days = warning
  enableNotifications: boolean;
  checkOnMount: boolean;
}

const defaultConfig: GoalAlertConfig = {
  criticalThreshold: 50,
  warningThreshold: 75,
  enableNotifications: true,
  checkOnMount: false,
};

export function useGoalAlerts(config: Partial<GoalAlertConfig> = {}) {
  const settings = { ...defaultConfig, ...config };

  const { activeGoals, isLoading: isLoadingGoals } = useOperatorGoals();
  const { operators, isLoading: isLoadingOperators } = useOperatorProductivity(30);

  const hasNotified = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  // Calculate goal alerts
  const goalAlerts = useMemo((): GoalAlert[] => {
    if (!activeGoals.length || !operators.length) return [];

    const alerts: GoalAlert[] = [];
    const now = new Date();

    activeGoals.forEach(goal => {
      const operator = operators.find(o => o.operatorId === goal.operator_id);
      if (!operator) return;

      // Get current value based on goal type
      let currentValue: number;
      switch (goal.goal_type) {
        case 'efficiency': currentValue = operator.efficiencyScore; break;
        case 'jobs_completed': currentValue = operator.totalJobsCompleted; break;
        case 'pieces_produced': currentValue = operator.totalPiecesProduced; break;
        case 'loss_rate': currentValue = operator.lossRate; break;
        default: currentValue = 0;
      }

      const progress = calculateGoalProgress(goal, currentValue);

      // Skip already achieved goals
      if (progress.is_achieved) return;

      // Calculate days remaining
      const endDate = new Date(goal.period_end);
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      // Determine risk level based on progress and time remaining
      let riskLevel: GoalAlert['riskLevel'] = 'on-track';
      let message = '';

      if (progress.progress_percentage < settings.criticalThreshold && daysRemaining <= 7) {
        riskLevel = 'critical';
        message = `Meta crítica! ${operator.operatorName} está em ${progress.progress_percentage.toFixed(0)}% com apenas ${daysRemaining} dia(s) restante(s)`;
      } else if (progress.progress_percentage <= settings.warningThreshold && daysRemaining <= 14) {
        riskLevel = 'warning';
        message = `Atenção: ${operator.operatorName} precisa acelerar para atingir a meta de ${GOAL_TYPE_LABELS[goal.goal_type as GoalType]}`;
      } else if (progress.progress_percentage < 50) {
        riskLevel = 'warning';
        message = `${operator.operatorName} está abaixo de 50% na meta de ${GOAL_TYPE_LABELS[goal.goal_type as GoalType]}`;
      }

      if (riskLevel !== 'on-track') {
        alerts.push({
          goalId: goal.id,
          operatorId: goal.operator_id,
          operatorName: operator.operatorName,
          goalType: goal.goal_type as GoalType,
          targetValue: goal.target_value,
          currentValue,
          progressPercentage: progress.progress_percentage,
          daysRemaining,
          riskLevel,
          message,
        });
      }
    });

    // Sort by risk level and progress
    return alerts.sort((a, b) => {
      if (a.riskLevel === 'critical' && b.riskLevel !== 'critical') return -1;
      if (a.riskLevel !== 'critical' && b.riskLevel === 'critical') return 1;
      return a.progressPercentage - b.progressPercentage;
    });
  }, [activeGoals, operators, settings.criticalThreshold, settings.warningThreshold]);

  // Count alerts by risk level
  const criticalCount = goalAlerts.filter(a => a.riskLevel === 'critical').length;
  const warningCount = goalAlerts.filter(a => a.riskLevel === 'warning').length;

  // Show notifications for new critical/warning alerts
  const showNotifications = useCallback(() => {
    if (!settings.enableNotifications || !hasInitialized.current) return;

    goalAlerts.forEach(alert => {
      const alertKey = `${alert.goalId}-${alert.riskLevel}`;

      if (!hasNotified.current.has(alertKey)) {
        hasNotified.current.add(alertKey);

        if (alert.riskLevel === 'critical') {
          toast.error('Meta em risco crítico!', {
            description: alert.message,
            action: {
              label: 'Ver Metas',
              onClick: () => navigateTo('/kpis'),
            },
            duration: 10000,
          });
        } else if (alert.riskLevel === 'warning') {
          toast.warning('Meta em alerta', {
            description: alert.message,
            action: {
              label: 'Ver Metas',
              onClick: () => navigateTo('/kpis'),
            },
            duration: 8000,
          });
        }
      }
    });
  }, [goalAlerts, settings.enableNotifications]);

  // Manual check function
  const forceCheckGoals = useCallback(() => {
    if (criticalCount > 0) {
      toast.error(`${criticalCount} meta(s) em risco crítico!`, {
        description: goalAlerts.find(a => a.riskLevel === 'critical')?.message,
        action: {
          label: 'Ver Metas',
          onClick: () => navigateTo('/kpis'),
        },
      });
    } else if (warningCount > 0) {
      toast.warning(`${warningCount} meta(s) em alerta`, {
        description: goalAlerts.find(a => a.riskLevel === 'warning')?.message,
        action: {
          label: 'Ver Metas',
          onClick: () => navigateTo('/kpis'),
        },
      });
    } else if (activeGoals.length > 0) {
      toast.success('Todas as metas no caminho certo!', {
        description: 'Operadores estão progredindo conforme esperado',
      });
    } else {
      toast.info('Nenhuma meta ativa', {
        description: 'Configure metas para acompanhar o desempenho',
      });
    }
  }, [criticalCount, warningCount, goalAlerts, activeGoals.length]);

  // Initialize after delay to prevent notification spam on load
  useEffect(() => {
    const timeout = setTimeout(() => {
      hasInitialized.current = true;
      showNotifications();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [settings.checkOnMount, showNotifications]);

  // Show notifications when alerts change
  useEffect(() => {
    if (hasInitialized.current) {
      showNotifications();
    }
  }, [goalAlerts, showNotifications]);

  return {
    goalAlerts,
    criticalCount,
    warningCount,
    totalAlertCount: criticalCount + warningCount,
    isLoading: isLoadingGoals || isLoadingOperators,
    forceCheckGoals,
  };
}
