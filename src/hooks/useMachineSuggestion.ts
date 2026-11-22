import { useMemo } from 'react';
import { useSchedulingData } from '@/features/jobs';
import { formatDateOnly } from '@/lib/dateUtils';

interface MachineSuggestion {
  machineId: string;
  machineName: string;
  machineCode: string;
  score: number;
  reason: string;
  activeJobs: number;
  totalLoad: number; // in minutes
}

/**
 * Suggests the best available machine for a given technique based on:
 * - Current occupancy (fewer active jobs = better)
 * - Total scheduled load (less load = better)
 * - Machine active status
 */
export function useMachineSuggestion(techniqueId: string | null) {
  const { jobs, machines } = useSchedulingData();

  const suggestions = useMemo((): MachineSuggestion[] => {
    if (!techniqueId || !machines.length) return [];

    const techniqueMachines = machines.filter(
      m => m.technique_id === techniqueId && m.is_active
    );

    if (!techniqueMachines.length) return [];

    const today = formatDateOnly(new Date());

    return techniqueMachines
      .map(machine => {
        const machineJobs = jobs.filter(
          j => j.machine_id === machine.id &&
            !['finished', 'cancelled'].includes(j.status)
        );

        const todayJobs = machineJobs.filter(j => j.scheduled_date === today);
        const totalLoad = machineJobs.reduce((sum, j) => sum + j.estimated_duration, 0);

        // Score: lower is better (fewer jobs and less load)
        const activeJobsPenalty = todayJobs.length * 30;
        const loadPenalty = totalLoad;
        const score = 100 - Math.min(activeJobsPenalty + (loadPenalty / 10), 100);

        let reason = '';
        if (todayJobs.length === 0) {
          reason = 'Máquina livre hoje';
        } else if (todayJobs.length <= 2) {
          reason = `${todayJobs.length} job(s) hoje — carga leve`;
        } else {
          reason = `${todayJobs.length} jobs hoje — carga alta`;
        }

        return {
          machineId: machine.id,
          machineName: machine.name,
          machineCode: machine.code,
          score,
          reason,
          activeJobs: todayJobs.length,
          totalLoad,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [techniqueId, jobs, machines]);

  const bestMachine = suggestions[0] || null;

  return { suggestions, bestMachine };
}
