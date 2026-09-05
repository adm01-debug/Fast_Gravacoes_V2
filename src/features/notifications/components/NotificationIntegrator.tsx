import { useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/features/notifications";
import { useNotificationSounds } from "@/features/notifications";
import { useAuth } from "@/features/auth";
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { useGoalAlerts } from "@/features/notifications";
import { useOEEAlerts } from "@/features/production";
import { useTPMNotifications } from "@/features/notifications";

interface NotificationPreferences {
  delayedJobs: boolean;
  lowBuffer: boolean;
  bottleneck: boolean;
  statusChanges: boolean;
  productionComplete: boolean;
  oeeAlerts: boolean;
  goalAlerts: boolean;
  maintenanceAlerts: boolean;
}

interface JobPayload {
  id: string;
  order_number: string;
  product: string;
  client: string;
  status: string;
}

interface EfficiencyAlertPayload {
  id: string;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  metadata?: Record<string, unknown>;
}

const getPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem('notification-preferences');
  return saved ? JSON.parse(saved) : {
    delayedJobs: true,
    lowBuffer: true,
    bottleneck: true,
    statusChanges: false,
    productionComplete: false,
    oeeAlerts: true,
    goalAlerts: true,
    maintenanceAlerts: true
  };
};

export const NotificationIntegrator = () => {
  const { user } = useAuth();
  const {
    permission,
    sendDelayedJobAlert,
    sendLowBufferAlert,
    sendBottleneckAlert,
    sendStatusChangeAlert,
    sendProductionCompleteAlert
  } = usePushNotifications();

  const {
    playDelayedAlert,
    playBufferAlert,
    playBottleneckAlert,
    playStatusChangeAlert,
    playCompleteAlert
  } = useNotificationSounds();

  const previousJobsRef = useRef<Map<string, string>>(new Map());
  const notifiedAlertsRef = useRef<Set<string>>(new Set());
  const permissionRef = useRef<string | undefined>(undefined);
  const userIdRef = useRef<string | undefined>(undefined);
  // Keep the refs mirroring the latest values without mutating them during
  // render (React refs must only be read/written in effects or handlers).
  useEffect(() => {
    permissionRef.current = permission;
    userIdRef.current = user?.id;
  }, [permission, user?.id]);

  // Listen to job status changes
  useRealtimeChannel('job-notifications', [{ table: 'jobs' }], async (payload) => {
    if (permissionRef.current !== 'granted' || !userIdRef.current) return;
    const prefs = getPreferences();
    const newJob = payload.new as JobPayload;
    const oldJob = payload.old as JobPayload;

    if (prefs.statusChanges && oldJob.status !== newJob.status) {
      playStatusChangeAlert();
      sendStatusChangeAlert({
        orderNumber: newJob.order_number,
        oldStatus: getStatusLabel(oldJob.status),
        newStatus: getStatusLabel(newJob.status)
      });
    }

    if (prefs.productionComplete && newJob.status === 'finished' && oldJob.status !== 'finished') {
      playCompleteAlert();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userIdRef.current)
        .maybeSingle();

      sendProductionCompleteAlert({
        orderNumber: newJob.order_number,
        product: newJob.product,
        operator: profile?.full_name || 'Operador'
      });
    }

    if (prefs.delayedJobs && newJob.status === 'delayed' && oldJob.status !== 'delayed') {
      const alertKey = `delayed-${newJob.id}`;
      if (!notifiedAlertsRef.current.has(alertKey)) {
        notifiedAlertsRef.current.add(alertKey);
        playDelayedAlert();
        sendDelayedJobAlert({
          orderNumber: newJob.order_number,
          product: newJob.product,
          client: newJob.client
        });
      }
    }
  });

  // Listen to efficiency alerts
  useRealtimeChannel('efficiency-notifications', [{ table: 'efficiency_alert_history' }], (payload) => {
    if (permissionRef.current !== 'granted' || !userIdRef.current) return;
    const prefs = getPreferences();
    const alert = payload.new as EfficiencyAlertPayload;

    const alertKey = `${alert.alert_type}-${alert.id}`;
    if (notifiedAlertsRef.current.has(alertKey)) return;
    notifiedAlertsRef.current.add(alertKey);

    if (prefs.bottleneck && alert.alert_type === 'bottleneck') {
      playBottleneckAlert();
      const metadata = alert.metadata as { occupancy?: number } || {};
      sendBottleneckAlert(
        alert.title.replace('Gargalo: ', ''),
        metadata.occupancy ?? 90
      );
    }

    if (prefs.lowBuffer && alert.alert_type === 'load_balancing') {
      playBufferAlert();
      sendLowBufferAlert(
        alert.title.replace('Carga Desbalanceada: ', ''),
        0
      );
    }
  });

  // Goal, OEE and TPM Alerts Hooks (Self-contained)
  useGoalAlerts({ enableNotifications: getPreferences().goalAlerts });
  useOEEAlerts(); // Internal OEEAlerts already handles throttling and dispatch
  useTPMNotifications(); // Already listens to maintenance alerts via realtime

  useEffect(() => {
    const cleanup = setInterval(() => {
      if (notifiedAlertsRef.current.size > 100) {
        const entries = Array.from(notifiedAlertsRef.current);
        notifiedAlertsRef.current = new Set(entries.slice(-50));
      }
    }, 60000);
    return () => clearInterval(cleanup);
  }, []);

  return null;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    queue: 'Na Fila',
    ready: 'No Jeito',
    scheduled: 'Agendado',
    production: 'Em Produção',
    finished: 'Finalizado',
    paused: 'Pausado',
    cancelled: 'Cancelado',
    delayed: 'Atrasado',
    rework: 'Retrabalho'
  };
  return labels[status] || status;
};
