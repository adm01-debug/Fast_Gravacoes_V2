import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductionLoss {
  id: string;
  job_id: string;
  quantity: number;
  operator_id?: string | null;
  notes?: string | null;
  created_at: string;
  shift?: string | null;
  loss_type?: 'availability' | 'performance' | 'quality';
}

interface ExtendedProductionLoss extends ProductionLoss {
  job: {
    order_number: string;
    client: string | null;
    machine_id: string | null;
    technique_id: string | null;
  } | null;
}

export function useProductionLosses(jobId?: string, filters?: { shift?: string; startDate?: string; endDate?: string; machineId?: string; techniqueId?: string }) {
  const queryClient = useQueryClient();

  const { data: losses, isLoading } = useQuery({
    queryKey: ['production-losses', jobId, filters],
    queryFn: async () => {
      let query = supabase.from('production_losses').select('*, job:jobs(order_number, client, machine_id, technique_id)');
      
      if (jobId) {
        query = query.eq('job_id', jobId);
      }
      
      if (filters?.shift && filters.shift !== 'all') {
        query = query.eq('shift', filters.shift);
      }
      
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Client-side filtering for machine and technique since they are in the related job table
      let filteredData = (data as unknown as ExtendedProductionLoss[]) || [];
      
      if (filters?.machineId && filters.machineId !== 'all') {
        filteredData = filteredData.filter((l) => l.job?.machine_id === filters.machineId);
      }
      
      if (filters?.techniqueId && filters.techniqueId !== 'all') {
        filteredData = filteredData.filter((l) => l.job?.technique_id === filters.techniqueId);
      }

      return filteredData;
    },
    enabled: true,
  });

  const recordLoss = useMutation({
    mutationFn: async (data: Omit<ProductionLoss, 'id' | 'created_at'>) => {
      // Resolve shift before insert to avoid a follow-up UPDATE
      let shift = data.shift;
      if (!shift) {
        const { data: job } = await supabase
          .from('jobs')
          .select('start_time, actual_start_time')
          .eq('id', data.job_id)
          .single();
        const timeToUse = job?.actual_start_time || job?.start_time;
        if (timeToUse) {
          const hour = timeToUse.includes('T')
            ? new Date(timeToUse).getHours()
            : parseInt(timeToUse.split(':')[0], 10);
          if (hour >= 7 && hour < 15) shift = '1';
          else if (hour >= 15 && hour < 23) shift = '2';
          else shift = '3';
        }
      }

      const { data: result, error } = await supabase
        .from('production_losses')
        .insert({ ...data, shift })
        .select()
        .single();

      if (error) throw error;

      // Use atomic SQL increment to avoid lost-update race condition
      // RPC não presente nos tipos gerados; cast controlado via `never` do postgrest-js.
      const { error: rpcError } = await supabase.rpc('increment_job_lost_pieces' as never, {
        p_job_id: data.job_id,
        p_amount: data.quantity,
      } as never);

      if (rpcError) {
        // Fallback: read-modify-write (less safe under concurrency)
        const { data: job } = await supabase
          .from('jobs')
          .select('lost_pieces')
          .eq('id', data.job_id)
          .single();
        await supabase
          .from('jobs')
          .update({ lost_pieces: (job?.lost_pieces || 0) + data.quantity })
          .eq('id', data.job_id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-losses'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Perda registrada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao registrar perda. Tente novamente.');
    }
  });

  return {
    losses,
    isLoading,
    recordLoss: recordLoss.mutate,
  };
}
