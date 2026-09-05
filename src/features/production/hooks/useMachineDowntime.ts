import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export type DowntimeType = 'setup' | 'maintenance' | 'breakdown' | 'idle' | 'other';

export interface MachineDowntime {
  id: string;
  machine_id: string;
  job_id?: string | null;
  downtime_type: DowntimeType;
  start_time: string;
  end_time?: string | null;
  reason?: string | null;
  operator_id?: string | null;
  created_at: string;
}

export function useMachineDowntime(machineId?: string) {
  const queryClient = useQueryClient();

  const { data: downtimes, isLoading } = useQuery({
    queryKey: ['machine-downtime', machineId],
    queryFn: async () => {
      let query = supabase.from('machine_downtime').select('*, machine:machines(name, code)');
      if (machineId) {
        query = query.eq('machine_id', machineId);
      }

      const { data, error } = await query.order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const startDowntime = useMutation({
    mutationFn: async (data: Omit<MachineDowntime, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('machine_downtime')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-downtime'] });
      toast.success('Parada registrada com sucesso');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao registrar parada');
    },
  });

  const endDowntime = useMutation({
    mutationFn: async ({ id, endTime }: { id: string; endTime: string }) => {
      const { error } = await supabase
        .from('machine_downtime')
        .update({ end_time: endTime })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-downtime'] });
      toast.success('Parada encerrada');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao encerrar parada');
    },
  });

  return {
    downtimes,
    isLoading,
    startDowntime: startDowntime.mutate,
    endDowntime: endDowntime.mutate,
  };
}
