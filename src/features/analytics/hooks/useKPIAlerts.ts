import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Alertas de limiar gravados pelo motor de KPI (public.kpi_alerts).
 *
 * A tabela nao aparece nos tipos gerados, entao o client e acessado por um
 * cast local em vez de regenerar `types.ts` nesta mudanca.
 */
export interface PersistedKPIAlert {
  id: string;
  machine_id: string | null;
  metric_name: string;
  metric_value: number;
  threshold: number;
  severity: string | null;
  is_resolved: boolean | null;
  created_at: string | null;
}

interface KpiAlertsQuery {
  select: (cols: string, opts?: { count?: 'exact' }) => KpiAlertsQuery;
  eq: (col: string, value: unknown) => KpiAlertsQuery;
  order: (col: string, opts?: { ascending?: boolean }) => KpiAlertsQuery;
  limit: (n: number) => Promise<{
    data: unknown;
    error: { message: string } | null;
    count: number | null;
  }>;
}

interface KpiAlertsClient {
  from: (table: string) => KpiAlertsQuery;
}

const KPI_ALERTS_KEY = ['kpi-alerts-abertos'];

export const useKPIAlerts = () => {
  const queryClient = useQueryClient();
  const client = supabase as unknown as KpiAlertsClient;

  const alertsQuery = useQuery({
    queryKey: KPI_ALERTS_KEY,
    queryFn: async () => {
      const { data, error, count } = await client
        .from('kpi_alerts')
        .select('*', { count: 'exact' })
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return {
        alertas: (data ?? []) as PersistedKPIAlert[],
        total: (count ?? 0) as number,
      };
    },
    staleTime: 60_000,
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>)('resolve_kpi_alert', { p_alert_id: alertId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KPI_ALERTS_KEY });
    },
    onError: (error: Error) => {
      toast.error('Não foi possível resolver o alerta: ' + error.message);
    },
  });

  return {
    alertas: alertsQuery.data?.alertas ?? [],
    total: alertsQuery.data?.total ?? 0,
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    resolveAlert,
  };
};
