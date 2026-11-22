import { useMemo, useEffect, useRef } from 'react';
import { useSchedulingData } from '@/features/jobs';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { useAuth } from '@/features/auth';
import { formatDateOnly } from '@/lib/dateUtils';

export interface CapacityMetric {
  techniqueId: string;
  techniqueName: string;
  occupancyPercent: number;
  activeJobs: number;
  scheduledJobs: number;
  totalMachines: number;
  status: 'normal' | 'warning' | 'critical';
}

/**
 * Hook that monitors technique capacity and alerts when a technique is reaching 
 * or exceeding its daily production capacity.
 */
export function useTechniqueCapacityAlerts() {
  const { user } = useAuth();
  const { jobs, techniques, machines } = useSchedulingData();
  const { add } = useNotificationsContext();
  const alertedRef = useRef<Set<string>>(new Set());

  // Daily capacity in minutes (e.g., 8 hours = 480 minutes)
  const DAILY_CAPACITY = 480;

  const capacities = useMemo(() => {
    if (!jobs.length || !techniques.length) return [] as CapacityMetric[];

    const today = formatDateOnly(new Date());
    
    return techniques.map(technique => {
      const techniqueJobs = jobs.filter(j => j.technique_id === technique.id && j.scheduled_date === today);
      const techniqueMachines = machines.filter(m => m.technique_id === technique.id);
      
      const activeJobs = techniqueJobs.filter(j => ['production', 'paused'].includes(j.status)).length;
      const scheduledJobs = techniqueJobs.filter(j => ['scheduled', 'ready', 'queue'].includes(j.status)).length;
      
      const totalLoad = techniqueJobs
        .filter(j => !['finished', 'cancelled'].includes(j.status))
        .reduce((sum, j) => sum + (j.estimated_duration || 0), 0);
      
      // Capacity depends on number of machines
      const capacity = DAILY_CAPACITY * (techniqueMachines.length || 1);
      const utilization = capacity > 0 ? (totalLoad / capacity) * 100 : 0;

      return {
        techniqueId: technique.id,
        techniqueName: technique.name,
        occupancyPercent: Math.round(utilization),
        activeJobs,
        scheduledJobs,
        totalMachines: techniqueMachines.length,
        status: utilization >= 105 ? 'critical' : utilization >= 90 ? 'warning' : 'normal'
      } as CapacityMetric;
    });
  }, [jobs, techniques, machines]);

  useEffect(() => {
    if (!user || !capacities.length) return;

    const today = formatDateOnly(new Date());

    capacities.forEach(cap => {
      if (cap.status === 'critical') {
        const key = `capacity-critical-${cap.techniqueId}-${today}`;
        if (!alertedRef.current.has(key)) {
          alertedRef.current.add(key);
          add({
            title: '⚠️ Capacidade Excedida',
            message: `Técnica ${cap.techniqueName} está com ${cap.occupancyPercent}% de ocupação para hoje.`,
            type: 'error',
            href: '/kanban',
          });
        }
      } else if (cap.status === 'warning') {
        const key = `capacity-warn-${cap.techniqueId}-${today}`;
        if (!alertedRef.current.has(key)) {
          alertedRef.current.add(key);
          add({
            title: '📊 Técnica Próxima ao Limite',
            message: `Técnica ${cap.techniqueName} atingiu ${cap.occupancyPercent}% da capacidade diária.`,
            type: 'warning',
            href: '/kanban',
          });
        }
      }
    });

    if (alertedRef.current.size > 100) {
      alertedRef.current.clear();
    }
  }, [user, capacities, add]);

  return { capacities };
}
