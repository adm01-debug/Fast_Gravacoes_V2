/* eslint-disable react-hooks/immutability -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePushNotifications } from '@/features/notifications';
import { useNotificationSounds } from '@/features/notifications';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailySummary {
  generated_at: string;
  date: string;
  maintenance: {
    overdue: { count: number; items: Array<{ name: string; machine: string }> };
    due_today: { count: number; items: Array<{ name: string; machine: string }> };
    upcoming_7_days: { count: number };
  };
  predictions: {
    critical: { count: number; items: Array<{ machine: string; risk_score: number }> };
    high_risk: { count: number };
  };
  alerts: {
    has_critical: boolean;
    total_attention_items: number;
  };
}

const LAST_SUMMARY_KEY = 'lastDailySummaryDate';
const DAILY_SUMMARY_HOUR = 8; // 8 AM

export function useDailySummaryNotifications() {
  const { permission, sendNotification, requestPermission } = usePushNotifications();
  const { playSound, isEnabled } = useNotificationSounds();
  const [lastSummary, setLastSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shouldShowSummary = useCallback(() => {
    const lastShown = localStorage.getItem(LAST_SUMMARY_KEY);
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentHour = new Date().getHours();

    // Show if it's after 8 AM and we haven't shown today's summary yet
    return currentHour >= DAILY_SUMMARY_HOUR && lastShown !== today;
  }, []);

  const fetchDailySummary = useCallback(async (): Promise<DailySummary | null> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('daily-maintenance-summary');

      if (error) {
        return null;
      }

      return data as DailySummary;
    } catch (error) {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const buildNotificationMessage = useCallback((summary: DailySummary): string => {
    const parts: string[] = [];

    if (summary.maintenance.overdue.count > 0) {
      parts.push(`${summary.maintenance.overdue.count} manutenção(ões) atrasada(s)`);
    }

    if (summary.maintenance.due_today.count > 0) {
      parts.push(`${summary.maintenance.due_today.count} manutenção(ões) para hoje`);
    }

    if (summary.predictions.critical.count > 0) {
      parts.push(`${summary.predictions.critical.count} predição(ões) crítica(s)`);
    } else if (summary.predictions.high_risk.count > 0) {
      parts.push(`${summary.predictions.high_risk.count} predição(ões) de alto risco`);
    }

    if (parts.length === 0) {
      parts.push('Nenhum item crítico para hoje');
    }

    return parts.join(' | ');
  }, []);

  const showDailySummaryNotification = useCallback(async () => {
    if (!shouldShowSummary()) {
      return;
    }

    const summary = await fetchDailySummary();

    if (!summary) {
      return;
    }

    setLastSummary(summary);

    const today = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(LAST_SUMMARY_KEY, today);

    const message = buildNotificationMessage(summary);
    const title = `Resumo Diário - ${format(new Date(), "dd 'de' MMMM", { locale: ptBR })}`;

    // Play sound for critical alerts
    if (summary.alerts.has_critical && isEnabled()) {
      playSound('alert');
    } else if (summary.alerts.total_attention_items > 0 && isEnabled()) {
      playSound('statusChange');
    }

    // Show push notification
    if (permission === 'granted') {
      sendNotification({
        title,
        body: message,
        icon: '/pwa-icons/icon-192x192.png',
        tag: 'daily-summary',
        data: { route: '/tpm' },
      });
    }

    // Show toast with summary
    const toastMessage = buildToastMessage(summary);

    if (summary.alerts.has_critical) {
      toast.warning(title, {
        description: toastMessage,
        duration: 10000,
      });
    } else if (summary.alerts.total_attention_items > 0) {
      toast.info(title, {
        description: toastMessage,
        duration: 10000,
      });
    } else {
      toast.success(title, {
        description: 'Tudo em ordem!',
        duration: 5000,
      });
    }
  }, [
    shouldShowSummary,
    fetchDailySummary,
    buildNotificationMessage,
    permission,
    sendNotification,
    playSound,
    isEnabled,
  ]);

  const buildToastMessage = (summary: DailySummary): string => {
    const parts: string[] = [];

    if (summary.maintenance.overdue.count > 0) {
      parts.push(`⚠️ ${summary.maintenance.overdue.count} atrasada(s)`);
    }
    if (summary.maintenance.due_today.count > 0) {
      parts.push(`📅 ${summary.maintenance.due_today.count} para hoje`);
    }
    if (summary.predictions.critical.count > 0) {
      parts.push(`🔴 ${summary.predictions.critical.count} crítica(s)`);
    }
    if (summary.predictions.high_risk.count > 0) {
      parts.push(`🟠 ${summary.predictions.high_risk.count} alto risco`);
    }

    return parts.join(' • ');
  };

  const manualRefresh = useCallback(async () => {
    const summary = await fetchDailySummary();
    if (summary) {
      setLastSummary(summary);
      toast.success('Resumo atualizado com sucesso!');
    }
    return summary;
  }, [fetchDailySummary]);

  // Check for summary on mount and periodically
  useEffect(() => {
    // Initial check after a short delay to allow app to load
    const initialTimeout = setTimeout(() => {
      showDailySummaryNotification();
    }, 3000);

    // Check every 30 minutes if we should show the summary
    checkIntervalRef.current = setInterval(() => {
      if (shouldShowSummary()) {
        showDailySummaryNotification();
      }
    }, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [showDailySummaryNotification, shouldShowSummary]);

  return {
    lastSummary,
    isLoading,
    manualRefresh,
    requestPermission,
    permission,
    showDailySummaryNotification,
  };
}
