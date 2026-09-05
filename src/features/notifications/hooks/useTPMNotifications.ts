import { useCallback, useRef, useState, useEffect } from 'react';
import { usePushNotifications } from '@/features/notifications';
import { useNotificationSounds } from '@/features/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { MaintenanceAlert } from '@/features/maintenance/hooks/types';
import { toast } from 'sonner';

export interface TPMNotificationPreferences {
  upcomingMaintenance: boolean;
  dueMaintenance: boolean;
  overdueMaintenance: boolean;
  criticalAlerts: boolean;
  soundEnabled: boolean;
}

const DEFAULT_PREFERENCES: TPMNotificationPreferences = {
  upcomingMaintenance: true,
  dueMaintenance: true,
  overdueMaintenance: true,
  criticalAlerts: true,
  soundEnabled: true,
};

const STORAGE_KEY = 'tpm_notification_preferences';

const getPreferences = (): TPMNotificationPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const saveTPMNotificationPreferences = (prefs: Partial<TPMNotificationPreferences>) => {
  const current = getPreferences();
  const updated = { ...current, ...prefs };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* quota exceeded or private browsing */ }
  return updated;
};

export const useTPMNotifications = () => {
  const {
    permission,
    isSupported,
    requestPermission,
    sendNotification
  } = usePushNotifications();
  const { playAlertSound } = useNotificationSounds();
  const notifiedAlertsRef = useRef<Set<string>>(new Set());

  // Send maintenance alert notification
  const sendMaintenanceNotification = useCallback((alert: MaintenanceAlert) => {
    const prefs = getPreferences();

    // Check if this alert type is enabled
    const shouldNotify =
      (alert.alert_type === 'upcoming' && prefs.upcomingMaintenance) ||
      (alert.alert_type === 'due' && prefs.dueMaintenance) ||
      (alert.alert_type === 'overdue' && prefs.overdueMaintenance) ||
      (alert.alert_type === 'predictive' && prefs.criticalAlerts) ||
      (alert.alert_type === 'critical' && prefs.criticalAlerts);

    if (!shouldNotify) return null;

    // Don't notify for already notified alerts
    if (notifiedAlertsRef.current.has(alert.id)) return null;
    notifiedAlertsRef.current.add(alert.id);

    // Play sound for critical and overdue alerts
    if (prefs.soundEnabled && (alert.alert_type === 'critical' || alert.alert_type === 'overdue')) {
      playAlertSound();
    }

    const iconMap: Record<string, string> = {
      upcoming: '📅',
      due: '⚠️',
      overdue: '🔴',
      critical: '🚨',
      predictive: '🧠',
    };

    const titleMap: Record<string, string> = {
      upcoming: 'Manutenção Próxima',
      due: 'Manutenção Vencendo',
      overdue: 'Manutenção Atrasada',
      critical: 'ALERTA CRÍTICO',
      predictive: 'PREDIÇÃO IA: RISCO DE FALHA',
    };

    const machineName = alert.machine?.name || 'Máquina desconhecida';

    return sendNotification({
      title: `${iconMap[alert.alert_type as string]} ${titleMap[alert.alert_type as string]}`,
      body: `${machineName}: ${alert.message}`,
      tag: `tpm-alert-${alert.id}`,
      requireInteraction: alert.alert_type === 'critical' || alert.alert_type === 'overdue',
      data: { route: '/tpm', type: 'maintenance', alertId: alert.id }
    });
  }, [sendNotification, playAlertSound]);

  // Send overdue alert
  const sendOverdueAlert = useCallback((machineName: string, scheduleName: string, daysOverdue: number) => {
    const prefs = getPreferences();
    if (!prefs.overdueMaintenance) return null;

    if (prefs.soundEnabled) {
      playAlertSound();
    }

    return sendNotification({
      title: '🔴 Manutenção Atrasada',
      body: `${machineName} - ${scheduleName}: ${daysOverdue} dias de atraso`,
      tag: `tpm-overdue-${machineName}-${scheduleName}`,
      requireInteraction: true,
      data: { route: '/tpm', type: 'overdue' }
    });
  }, [sendNotification, playAlertSound]);

  // Send critical alert
  const sendCriticalAlert = useCallback((machineName: string, message: string) => {
    const prefs = getPreferences();
    if (!prefs.criticalAlerts) return null;

    if (prefs.soundEnabled) {
      playAlertSound();
    }

    return sendNotification({
      title: '🚨 ALERTA CRÍTICO DE MANUTENÇÃO',
      body: `${machineName}: ${message}`,
      tag: `tpm-critical-${machineName}`,
      requireInteraction: true,
      data: { route: '/tpm', type: 'critical' }
    });
  }, [sendNotification, playAlertSound]);

  // Send maintenance due today notification
  const sendDueTodayAlert = useCallback((machineName: string, scheduleName: string) => {
    const prefs = getPreferences();
    if (!prefs.dueMaintenance) return null;

    return sendNotification({
      title: '⚠️ Manutenção para Hoje',
      body: `${machineName} - ${scheduleName} vence hoje`,
      tag: `tpm-due-${machineName}-${scheduleName}`,
      data: { route: '/tpm', type: 'due' }
    });
  }, [sendNotification]);

  // Send upcoming reminder
  const sendUpcomingReminder = useCallback((machineName: string, scheduleName: string, daysUntilDue: number) => {
    const prefs = getPreferences();
    if (!prefs.upcomingMaintenance) return null;

    return sendNotification({
      title: '📅 Manutenção Próxima',
      body: `${machineName} - ${scheduleName} em ${daysUntilDue} dias`,
      tag: `tpm-upcoming-${machineName}-${scheduleName}`,
      data: { route: '/tpm', type: 'upcoming' }
    });
  }, [sendNotification]);

  // Send test notification
  const sendTestNotification = useCallback(async (machineId: string, channel: 'email' | 'whatsapp' | 'push', forceSend = false): Promise<{ success: boolean; needsValidation?: boolean; recipients: unknown[]; machine?: { name: string; code: string } }> => {
    try {
      const { data: settings } = await supabase
        .from('user_notification_settings')
        .select('*');

      const { data: machine } = await supabase
        .from('machines')
        .select('name, code')
        .eq('id', machineId)
        .single();

      if (!machine) throw new Error('Máquina não encontrada');

      const recipients = settings?.filter(s => {
        const isChannelEnabled =
          (channel === 'email' && s.email_enabled) ||
          (channel === 'whatsapp' && s.whatsapp_enabled) ||
          (channel === 'push' && s.push_enabled);

        const machineFilters = s.machine_filters || [];
        const isMachineAllowed = machineFilters.length === 0 || machineFilters.includes(machineId);

        return isChannelEnabled && isMachineAllowed;
      }) || [];

      if (recipients.length === 0) {
        toast.warning('Nenhum destinatário configurado para este canal e máquina.');
        return { success: false, recipients: [] };
      }

      if (!forceSend) {
        return { success: true, needsValidation: true, recipients, machine };
      }

      const { data: user } = await supabase.auth.getUser();

      const { error: logError } = await supabase
        .from('tpm_notification_logs')
        .insert({
          machine_id: machineId,
          user_id: user.user?.id,
          channel,
          severity: 'critical',
          status: 'success',
          recipient: `${recipients.length} destinatários`,
          payload: { test: true, machine_name: machine.name, recipients: recipients.map(r => r.user_id) }
        });

      if (logError) throw logError;

      if (channel === 'push') {
        sendNotification({
          title: '🚨 Teste de Notificação TPM',
          body: `Máquina: ${machine.name} - Este é um teste para ${recipients.length} destinatários.`,
          tag: 'tpm-test',
        });
      }

      toast.success(`Notificação de teste enviada via ${channel} para ${recipients.length} usuários.`);
      return { success: true, recipients };
    } catch {

      toast.error('Erro ao processar notificação de teste');
      return { success: false, recipients: [] };
    }
  }, [sendNotification]);

  // Listen to realtime maintenance alerts
  useRealtimeChannel('tpm-alerts-notifications', [{ table: 'maintenance_alerts' }], async (payload) => {
    if (permission !== 'granted') return;
    const newAlert = payload.new as MaintenanceAlert;

    const { data: machine } = await supabase
      .from('machines')
      .select('id, name, code')
      .eq('id', newAlert.machine_id)
      .single();

    const alertWithMachine = {
      ...newAlert,
      machine: machine || undefined
    };

    sendMaintenanceNotification(alertWithMachine);
  });

  // Cleanup old notified alerts periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (notifiedAlertsRef.current.size > 100) {
        const arr = Array.from(notifiedAlertsRef.current);
        notifiedAlertsRef.current = new Set(arr.slice(-50));
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(cleanup);
  }, []);

  return {
    permission,
    isSupported,
    requestPermission,
    sendMaintenanceNotification,
    sendOverdueAlert,
    sendCriticalAlert,
    sendDueTodayAlert,
    sendUpcomingReminder,
    getPreferences,
    savePreferences: saveTPMNotificationPreferences,
    sendTestNotification,
  };
};
