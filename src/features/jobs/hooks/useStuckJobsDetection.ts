/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { DbJob, useJobs } from '@/features/jobs';
import { useMemo } from 'react';

export interface StuckJob {
  job: DbJob;
  hoursInProduction: number;
  severity: 'warning' | 'critical';
  message: string;
}

const WARNING_HOURS = 8; // Alert after 8 hours in production
const CRITICAL_HOURS = 24; // Critical after 24 hours

export function useStuckJobsDetection() {
  const { data: jobs } = useJobs();

  const stuckJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];

    const now = Date.now();
    const result: StuckJob[] = [];

    jobs.forEach(job => {
      // Only check jobs in production with a valid start time
      if (job.status === 'production' && job.actual_start_time) {
        const startTime = new Date(job.actual_start_time).getTime();

        // Validate the date is valid
        if (isNaN(startTime)) return;

        // Ensure we don't calculate negative hours (future start times)
        const elapsedMs = now - startTime;
        if (elapsedMs <= 0) return;

        const hoursInProduction = elapsedMs / (1000 * 60 * 60);

        if (hoursInProduction >= CRITICAL_HOURS) {
          result.push({
            job,
            hoursInProduction,
            severity: 'critical',
            message: `Job ${job.order_number} está em produção há ${Math.round(hoursInProduction)} horas! Verificar se não está travado.`
          });
        } else if (hoursInProduction >= WARNING_HOURS) {
          result.push({
            job,
            hoursInProduction,
            severity: 'warning',
            message: `Job ${job.order_number} está em produção há ${Math.round(hoursInProduction)} horas.`
          });
        }
      }
    });

    return result.sort((a, b) => b.hoursInProduction - a.hoursInProduction);
  }, [jobs]);

  return {
    stuckJobs,
    criticalCount: stuckJobs.filter(s => s.severity === 'critical').length,
    warningCount: stuckJobs.filter(s => s.severity === 'warning').length,
    hasStuckJobs: stuckJobs.length > 0,
  };
}
