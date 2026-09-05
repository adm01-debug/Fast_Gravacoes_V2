import { useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { useAuth } from '@/features/auth';
import { useRealtimeChannel } from '@/lib/realtimeChannel';

const statusLabels: Record<string, string> = {
  queue: 'Na Fila', ready: 'No Jeito', scheduled: 'Agendado',
  production: 'Em Produção', finished: 'Finalizado', paused: 'Pausado',
  cancelled: 'Cancelado', delayed: 'Atrasado', rework: 'Retrabalho',
};

/**
 * Watches real-time events and pushes them into the in-app NotificationsContext
 * so the notification bell badge + dropdown always stays up to date.
 */
export function InAppNotificationWatcher() {
  const { user } = useAuth();
  const { add } = useNotificationsContext();
  const notifiedRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | undefined>(undefined);
  // Keep the ref mirroring the latest user id without mutating it during
  // render (React refs must only be read/written in effects or handlers).
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  // Watch job status changes — filtered to jobs assigned to this operator.
  // (`user?.id` is read directly here, not via the ref: this value is only
  // consumed once, at the effect's first run inside useRealtimeChannel, to
  // build the postgres filter string — reading a ref during render is
  // disallowed, and it would evaluate to the same value at this point anyway.)
  useRealtimeChannel('inapp-job-notifications', [{ table: 'jobs', filter: `assigned_operator_id=eq.${user?.id ?? ''}` }], (payload) => {
    if (!userIdRef.current) return;
    const newJob = payload.new as Record<string, unknown>;
    const oldJob = payload.old as Record<string, unknown>;

    if (oldJob.status === newJob.status) return;
    const key = `job-${newJob.id}-${newJob.status}`;
    if (notifiedRef.current.has(key)) return;
    notifiedRef.current.add(key);

    const newStatus = newJob.status as string;

    if (newStatus === 'delayed') {
      add({
        title: 'Job Atrasado!',
        message: `${newJob.order_number} - ${newJob.client} está atrasado`,
        type: 'warning',
        href: '/alerts',
      });
      return;
    }

    if (newStatus === 'finished') {
      add({
        title: 'Produção Finalizada',
        message: `${newJob.order_number} - ${newJob.product} concluído`,
        type: 'success',
      });
      return;
    }

    if (newStatus === 'production') {
      add({
        title: 'Produção Iniciada',
        message: `${newJob.order_number} entrou em produção`,
        type: 'info',
      });
      return;
    }

    add({
      title: 'Status Atualizado',
      message: `${newJob.order_number}: ${statusLabels[oldJob.status as string] || oldJob.status} → ${statusLabels[newStatus] || newStatus}`,
      type: 'info',
    });
  });

  // Watch efficiency alerts
  useRealtimeChannel('inapp-efficiency-alerts', [{ table: 'efficiency_alert_history' }], (payload) => {
    const alert = payload.new as Record<string, unknown>;
    const key = `alert-${alert.id}`;
    if (notifiedRef.current.has(key)) return;
    notifiedRef.current.add(key);

    add({
      title: alert.title as string,
      message: alert.description as string,
      type: (alert.severity as string) === 'critical' ? 'error' : 'warning',
      href: '/alerts',
    });
  });

  // Watch maintenance alerts
  useRealtimeChannel('inapp-maintenance-alerts', [{ table: 'maintenance_alerts' }], (payload) => {
    const alert = payload.new as Record<string, unknown>;
    add({
      title: 'Alerta de Manutenção',
      message: alert.message as string,
      type: 'warning',
      href: '/tpm',
    });
  });

  // Cleanup old entries periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (notifiedRef.current.size > 200) {
        const arr = Array.from(notifiedRef.current);
        notifiedRef.current = new Set(arr.slice(-100));
      }
    }, 60000);
    return () => clearInterval(cleanup);
  }, []);

  return null;
}
