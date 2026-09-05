import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { showErrorToast, createAppError, createMutationErrorHandler } from '@/lib/errorHandling';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';

const EFFICIENCY_ALERTS_CONTEXT = {
  fetch: { entity: 'efficiency_alert_history', operation: 'fetch' },
  count: { entity: 'efficiency_alert_history', operation: 'count' },
  record: { entity: 'efficiency_alert_history', operation: 'record' },
  resolve: { entity: 'efficiency_alert_history', operation: 'resolve' },
};

export interface EfficiencyAlertHistory {
  id: string;
  alert_type: 'bottleneck' | 'load_balancing';
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  technique_id?: string;
  machine_id?: string;
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  metadata?: Json;
  created_at: string;
}

export const useEfficiencyAlertHistory = (options?: { limit?: number; offset?: number }) => {
  const queryClient = useQueryClient();
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['efficiency-alert-history', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efficiency_alert_history')
        .select('*')
        .order('detected_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw createAppError(error, EFFICIENCY_ALERTS_CONTEXT.fetch);
      return data as EfficiencyAlertHistory[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['efficiency-alert-history-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('efficiency_alert_history')
        .select('*', { count: 'exact', head: true });

      if (error) throw createAppError(error, EFFICIENCY_ALERTS_CONTEXT.count);
      return count ?? 0;
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Subscribe to realtime updates
  useRealtimeChannel('efficiency-alert-history-changes', [{ table: 'efficiency_alert_history' }], () => {
    queryClient.invalidateQueries({ queryKey: ['efficiency-alert-history'] });
  });

  const recordAlert = useMutation({
    mutationFn: async (alert: Omit<EfficiencyAlertHistory, 'id' | 'created_at' | 'detected_at'>) => {
      const { data, error } = await supabase
        .from('efficiency_alert_history')
        .insert([{
          alert_type: alert.alert_type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          technique_id: alert.technique_id,
          machine_id: alert.machine_id,
          metadata: (alert.metadata || {}) as Json
        }])
        .select()
        .single();

      if (error) throw createAppError(error, EFFICIENCY_ALERTS_CONTEXT.record);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efficiency-alert-history'] });
    },
    onError: createMutationErrorHandler('Erro ao registrar alerta'),
  });

  const resolveAlert = useMutation({
    mutationFn: async ({
      alertId,
      resolution_notes
    }: {
      alertId: string;
      resolution_notes?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('efficiency_alert_history')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: session?.user?.id,
          resolution_notes
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw createAppError(error, EFFICIENCY_ALERTS_CONTEXT.resolve);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efficiency-alert-history'] });
    },
    onError: createMutationErrorHandler('Erro ao resolver alerta'),
  });

  const activeAlerts = alerts.filter(a => !a.resolved_at);
  const resolvedAlerts = alerts.filter(a => a.resolved_at);

  return {
    alerts,
    activeAlerts,
    resolvedAlerts,
    isLoading,
    recordAlert,
    resolveAlert,
    refetch,
    totalCount,
    hasMore: offset + limit < totalCount,
  };
};
