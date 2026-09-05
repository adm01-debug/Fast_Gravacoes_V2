import { useMemo } from 'react';
import { DbJob } from '@/features/jobs';

interface UtilizationOptions {
  startHour: number;
  endHour: number;
}

/**
 * Computes occupancy ratio per machine for a set of jobs (E9 — heatmap).
 */
export function useMachineUtilization(
  jobs: DbJob[],
  { startHour, endHour }: UtilizationOptions
): Record<string, number> {
  return useMemo(() => {
    const totalMinutes = (endHour - startHour) * 60;
    const acc: Record<string, number> = {};
    if (totalMinutes <= 0) return acc;
    jobs.forEach((job) => {
      if (!job.machine_id || !job.start_time || !job.end_time) return;
      const [sh, sm] = job.start_time.split(':').map(Number);
      const [eh, em] = job.end_time.split(':').map(Number);
      const start = Math.max((sh - startHour) * 60 + sm, 0);
      const end = Math.min((eh - startHour) * 60 + em, totalMinutes);
      const dur = Math.max(end - start, 0);
      acc[job.machine_id] = (acc[job.machine_id] || 0) + dur;
    });
    Object.keys(acc).forEach((k) => {
      acc[k] = Math.min(acc[k] / totalMinutes, 1);
    });
    return acc;
  }, [jobs, startHour, endHour]);
}
