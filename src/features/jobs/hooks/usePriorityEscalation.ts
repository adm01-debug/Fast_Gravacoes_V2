import { useEffect, useRef } from 'react';
import { useSchedulingData } from '../index';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Automatically escalates job priority based on rules:
 * - Jobs scheduled for today that are still in 'queue' → escalate to 'high'
 * - Jobs past their scheduled date → escalate to 'urgent' and notify
 *
 * Runs every 5 minutes.
 */
export function usePriorityEscalation() {
  const { user } = useAuth();
  const { jobs } = useSchedulingData();
  const { add } = useNotificationsContext();
  const escalatedRef = useRef<Set<string>>(new Set());
  // Jobs with an escalation write currently in flight. Reserved BEFORE the
  // await so two overlapping checkEscalation passes (interval tick + effect
  // re-run) can't both update the same job and fire duplicate notifications.
  const inFlightRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);

  // Seed the escalated-set from the current jobs state on first data load so
  // that jobs already at their target priority (set in a previous session) are
  // skipped and don't fire duplicate notifications on page reload.
  useEffect(() => {
    if (seededRef.current || jobs.length === 0) return;
    seededRef.current = true;
    const today = new Date().toISOString().split('T')[0];
    for (const job of jobs) {
      const isOverdue = job.scheduled_date && job.scheduled_date < today;
      const isDueToday = job.scheduled_date === today;
      if (isOverdue && job.priority === 'urgent') escalatedRef.current.add(job.id);
      if (isDueToday && job.status === 'queue' && job.priority === 'high') escalatedRef.current.add(job.id);
    }
  }, [jobs]);

  useEffect(() => {
    if (!user) return;

    const checkEscalation = async () => {
      const today = new Date().toISOString().split('T')[0];

      for (const job of jobs) {
        if (['finished', 'cancelled', 'production'].includes(job.status)) continue;
        if (escalatedRef.current.has(job.id) || inFlightRef.current.has(job.id)) continue;

        const isOverdue = job.scheduled_date && job.scheduled_date < today;
        const isDueToday = job.scheduled_date === today;

        // Overdue jobs → escalate to urgent
        if (isOverdue && job.priority !== 'urgent') {
          // Per-job try/catch: one failed update must not abort the loop for
          // the remaining jobs, and only a confirmed write marks the job as
          // escalated — otherwise a transient failure would never be retried.
          inFlightRef.current.add(job.id);
          try {
            const { error } = await supabase
              .from('jobs')
              .update({ priority: 'urgent' })
              .eq('id', job.id);
            if (error) throw error;

            escalatedRef.current.add(job.id);
            add({
              title: '🔺 Prioridade Escalada',
              message: `${job.order_number} passou da data agendada — prioridade alterada para URGENTE`,
              type: 'warning',
              href: '/',
            });
          } catch (err) {
            logger.error('Failed to escalate overdue job to urgent', err, 'usePriorityEscalation');
          } finally {
            inFlightRef.current.delete(job.id);
          }
        }

        // Today's queue jobs → escalate to high (if medium or low)
        if (isDueToday && job.status === 'queue' && ['medium', 'low'].includes(job.priority)) {
          inFlightRef.current.add(job.id);
          try {
            const { error } = await supabase
              .from('jobs')
              .update({ priority: 'high' })
              .eq('id', job.id);
            if (error) throw error;

            escalatedRef.current.add(job.id);
            add({
              title: '📋 Prioridade Atualizada',
              message: `${job.order_number} agendado para hoje — prioridade elevada para ALTA`,
              type: 'info',
            });
          } catch (err) {
            logger.error('Failed to escalate due-today job to high', err, 'usePriorityEscalation');
          } finally {
            inFlightRef.current.delete(job.id);
          }
        }
      }

      // Cleanup
      if (escalatedRef.current.size > 200) {
        const arr = Array.from(escalatedRef.current);
        escalatedRef.current = new Set(arr.slice(-100));
      }
    };

    checkEscalation();
    const interval = setInterval(checkEscalation, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, jobs, add]);
}
