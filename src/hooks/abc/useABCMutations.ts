import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast, categorizeError } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { ABCActivity, ABCActivityRate, ABCJobCost, ABC_ERROR_CONTEXT } from './types';
import type { Database } from '@/integrations/supabase/types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Technique = Database['public']['Tables']['techniques']['Row'];

interface UseABCMutationsProps {
  activities: ABCActivity[];
  activityRates: ABCActivityRate[];
  jobs: Job[];
  techniques: Technique[];
}

export function useABCMutations({ activities, activityRates, jobs, techniques }: UseABCMutationsProps) {
  const queryClient = useQueryClient();

  // Calculate cost for a job
  const calculateJobCost = useMutation({
    mutationFn: async (jobId: string) => {
      const job = jobs.find(j => j.id === jobId);
      if (!job) throw new Error('Job não encontrado');

      const technique = techniques.find(t => t.id === job.technique_id);
      const now = new Date().toISOString().split('T')[0];

      // Get current rates
      const currentRates = activityRates.filter(
        r => r.period_start <= now && r.period_end >= now
      );

      // Delete existing costs for this job
      await supabase.from('abc_job_costs').delete().eq('job_id', jobId);

      // Calculate production duration in hours
      const durationHours = job.actual_start_time && job.actual_end_time
        ? (new Date(job.actual_end_time).getTime() - new Date(job.actual_start_time).getTime()) / (1000 * 60 * 60)
        : job.estimated_duration / 60;

      // Calculate costs for each activity
      const newCosts: Omit<ABCJobCost, 'id' | 'created_at' | 'activity' | 'cost_pool'>[] = [];

      for (const activity of activities) {
        const activityRate = currentRates.find(r => r.activity_id === activity.id);
        if (!activityRate) continue;

        let driverQuantity = 0;
        switch (activity.cost_driver) {
          case 'machine_hours':
            driverQuantity = durationHours;
            break;
          case 'setup_count':
            driverQuantity = 1;
            break;
          case 'quantity':
            // Null produced_quantity means "not recorded" — not "fully produced".
            driverQuantity = job.produced_quantity ?? 0;
            break;
          case 'labor_hours':
            driverQuantity = durationHours * 1.2;
            break;
          default:
            driverQuantity = 1;
        }

        const totalCost = driverQuantity * Number(activityRate.rate_per_unit);

        newCosts.push({
          job_id: jobId,
          activity_id: activity.id,
          cost_pool_id: activityRate.cost_pool_id,
          driver_quantity: driverQuantity,
          unit_rate: Number(activityRate.rate_per_unit),
          total_cost: totalCost,
          calculated_at: new Date().toISOString(),
        });
      }

      if (newCosts.length > 0) {
        const { error } = await supabase.from('abc_job_costs').insert(newCosts);
        if (error) throw error;
      }

      return newCosts;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abc-job-costs'] });
      toast.success('Custo do job calculado com sucesso');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao calcular custo do job', ABC_ERROR_CONTEXT.calculation);
    },
  });

  // Calculate costs for all jobs with parallel batching
  const calculateAllJobsCosts = useMutation({
    mutationFn: async () => {
      const BATCH_SIZE = 5;
      let calculated = 0;

      for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
        const batch = jobs.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map(job => calculateJobCost.mutateAsync(job.id))
        );

        calculated += results.filter(r => r.status === 'fulfilled').length;

        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            logger.warn(`Falha ao calcular custo ABC do job ${batch[idx]?.id}`, result.reason, 'useABCMutations');
          }
        });
      }

      return calculated;
    },
    onSuccess: (count) => {
      toast.success(`Custos calculados para ${count} jobs`);
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao calcular custos em lote');
    },
  });

  // Update activity rate
  const updateActivityRate = useMutation({
    mutationFn: async (data: {
      activity_id: string;
      cost_pool_id: string;
      rate_per_unit: number;
      period_start: string;
      period_end: string;
    }) => {
      const { error } = await supabase.from('abc_activity_rates').upsert({
        ...data,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'activity_id,cost_pool_id,period_start',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abc-activity-rates'] });
      toast.success('Taxa atualizada com sucesso');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao atualizar taxa');
    },
  });

  // Update cost pool budget
  const updateCostPoolBudget = useMutation({
    mutationFn: async (data: { id: string; monthly_budget: number }) => {
      const { error } = await supabase
        .from('abc_cost_pools')
        .update({ monthly_budget: data.monthly_budget })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abc-cost-pools'] });
      toast.success('Orçamento atualizado');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao atualizar orçamento');
    },
  });

  return {
    calculateJobCost,
    calculateAllJobsCosts,
    updateActivityRate,
    updateCostPoolBudget,
  };
}
