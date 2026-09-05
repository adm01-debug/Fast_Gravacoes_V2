import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePackagingSettings, computeSla } from './usePackagingSettings';
import { usePackagingSlaOverrides } from './usePackagingSlaOverrides';

type LiteTask = {
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  jobs?: { technique_id: string | null; client: string | null } | null;
};

type UntypedSupabase = {
  from: (t: string) => {
    select: (cols: string) => {
      in: (col: string, vals: string[]) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

/**
 * Retorna a contagem de tarefas de manuseio com SLA vencido.
 * Usado para exibir badge na sidebar. Falha silenciosa (retorna 0) para operadores sem RLS.
 */
export function usePackagingOverdueCount() {
  const { data: settings } = usePackagingSettings();
  const { data: overrides } = usePackagingSlaOverrides();

  return useQuery<number>({
    queryKey: ['packaging-overdue-count', overrides?.length ?? 0],
    enabled: !!settings,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!settings) return 0;
      try {
        const db = supabase as unknown as UntypedSupabase;
        const { data, error } = await db
          .from('packaging_tasks')
          .select('status, created_at, started_at, completed_at, jobs:job_id(technique_id, client)')
          .in('status', ['pending', 'in_triage', 'packaging']);
        if (error) return 0;
        const tasks = (data as LiteTask[] | null) ?? [];
        return tasks.filter((t) => computeSla(t, settings, overrides).level === 'overdue').length;
      } catch {
        return 0;
      }
    },
  });
}
