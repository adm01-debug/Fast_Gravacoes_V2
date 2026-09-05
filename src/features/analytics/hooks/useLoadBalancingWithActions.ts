import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useJobs, useTechniques } from '@/features/jobs';
import { useMachines } from '@/features/production';
import { toast } from 'sonner';
import { format, isValid as isValidDate } from 'date-fns';
import { showErrorToast, createAppError } from '@/lib/errorHandling';
import { MachineLoad, LoadBalancingSuggestion, TechniqueLoadSummary } from '../types';

const LOAD_BALANCING_ERROR_CONTEXT = {
  applySuggestion: { entity: 'jobs', operation: 'apply_load_balancing' },
  applyMultiple: { entity: 'jobs', operation: 'apply_multiple_load_balancing' },
};

export interface ApplySuggestionResult {
  success: boolean;
  jobId: string;
  orderNumber: string;
  fromMachine: string;
  toMachine: string;
}

const DAILY_CAPACITY_MINUTES = 11 * 60; // 07:00 - 18:00 = 11 hours


export function useLoadBalancingWithActions(targetDate?: Date) {
  const { data: jobs } = useJobs();
  const { data: machines } = useMachines();
  const { data: techniques } = useTechniques();
  const queryClient = useQueryClient();

  // Mutation to apply a single suggestion
  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestion: LoadBalancingSuggestion): Promise<ApplySuggestionResult> => {
      const { error } = await supabase
        .from('jobs')
        .update({ machine_id: suggestion.suggestedMachineId })
        .eq('id', suggestion.jobId);

      if (error) throw createAppError(error, LOAD_BALANCING_ERROR_CONTEXT.applySuggestion);

      return {
        success: true,
        jobId: suggestion.jobId,
        orderNumber: suggestion.orderNumber,
        fromMachine: suggestion.currentMachineName,
        toMachine: suggestion.suggestedMachineName,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated-jobs'] });
      toast.success(`Job ${result.orderNumber} movido`, {
        description: `${result.fromMachine} → ${result.toMachine}`,
      });
    },
    onError: (error, suggestion) => {
      showErrorToast(error, `Erro ao mover job ${suggestion.orderNumber}`);
    },
  });

  // Mutation to apply multiple suggestions — single upsert instead of N individual updates
  const applyMultipleSuggestionsMutation = useMutation({
    mutationFn: async (suggestions: LoadBalancingSuggestion[]): Promise<ApplySuggestionResult[]> => {
      if (suggestions.length === 0) return [];

      // Single upsert: one round-trip for all job reassignments
      const { error } = await supabase
        .from('jobs')
        .upsert(
          suggestions.map(s => ({ id: s.jobId, machine_id: s.suggestedMachineId })) as never,
          { onConflict: 'id' }
        );

      if (error) throw createAppError(error, LOAD_BALANCING_ERROR_CONTEXT.applyMultiple);

      return suggestions.map(s => ({
        success: true,
        jobId: s.jobId,
        orderNumber: s.orderNumber,
        fromMachine: s.currentMachineName,
        toMachine: s.suggestedMachineName,
      }));
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated-jobs'] });
      toast.success(`${results.length} job(s) redistribuído(s) com sucesso`);
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao redistribuir jobs');
    },
  });

  const analysis = useMemo(() => {
    if (!jobs || !machines || !techniques) {
      return { byTechnique: [], suggestions: [], isLoading: true };
    }

    // Validate and use targetDate, fallback to today if invalid
    const date = targetDate && isValidDate(targetDate) ? targetDate : new Date();
    const dateStr = format(date, 'yyyy-MM-dd');

    // Calculate load per machine
    const machineLoads = new Map<string, MachineLoad>();

    machines.forEach(machine => {
      const technique = techniques.find(t => t.id === machine.technique_id);
      if (!technique) return;

      const dailyCapacity = technique.medium_threshold || DAILY_CAPACITY_MINUTES;

      machineLoads.set(machine.id, {
        machine,
        technique,
        scheduledMinutes: 0,
        availableMinutes: dailyCapacity,
        occupancyRate: 0,
        jobCount: 0,
        jobs: []
      });
    });

    // Assign jobs to machines
    jobs.forEach(job => {
      if (!job.machine_id || !job.scheduled_date) return;
      if (['finished', 'cancelled'].includes(job.status)) return;

      const jobDate = job.scheduled_date;
      if (jobDate !== dateStr) return;

      const load = machineLoads.get(job.machine_id);
      if (!load) return;

      load.scheduledMinutes += job.estimated_duration;
      load.jobCount++;
      load.jobs.push(job);
    });

    // Calculate occupancy rates
    machineLoads.forEach(load => {
      const dailyCapacity = load.technique.medium_threshold || DAILY_CAPACITY_MINUTES;
      load.occupancyRate = Math.min(100, (load.scheduledMinutes / dailyCapacity) * 100);
      load.availableMinutes = Math.max(0, dailyCapacity - load.scheduledMinutes);
    });

    // Group by technique and find imbalances
    const techniqueMap = new Map<string, TechniqueLoadSummary>();
    let suggestionCounter = 0;

    techniques.forEach(technique => {
      const techniqueMachines = Array.from(machineLoads.values())
        .filter(l => l.technique.id === technique.id);

      if (techniqueMachines.length === 0) return;

      const occupancies = techniqueMachines.map(m => m.occupancyRate);
      const avgOccupancy = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;
      const maxOccupancy = Math.max(...occupancies);
      const minOccupancy = Math.min(...occupancies);
      const isUnbalanced = maxOccupancy - minOccupancy > 30;

      // Generate suggestions for unbalanced techniques
      const suggestions: LoadBalancingSuggestion[] = [];

      if (isUnbalanced) {
        // Find overloaded machines and underloaded ones
        const overloaded = techniqueMachines
          .filter(m => m.occupancyRate > avgOccupancy + 15)
          .sort((a, b) => b.occupancyRate - a.occupancyRate);

        const underloaded = techniqueMachines
          .filter(m => m.occupancyRate < avgOccupancy - 15 && m.availableMinutes > 60)
          .sort((a, b) => a.occupancyRate - b.occupancyRate);

        overloaded.forEach(overMachine => {
          // Get movable jobs (not in production, not urgent priority)
          const movableJobs = overMachine.jobs.filter(j =>
            !['production', 'finished'].includes(j.status) &&
            j.priority !== 'urgent'
          );

          movableJobs.forEach(job => {
            const bestTarget = underloaded.find(m =>
              m.availableMinutes >= job.estimated_duration
            );

            if (bestTarget) {
              suggestions.push({
                id: `suggestion-${++suggestionCounter}`,
                jobId: job.id,
                orderNumber: job.order_number,
                client: job.client,
                product: job.product,
                estimatedDuration: job.estimated_duration,
                currentMachineId: overMachine.machine.id,
                currentMachineName: overMachine.machine.name,
                suggestedMachineId: bestTarget.machine.id,
                suggestedMachineName: bestTarget.machine.name,
                currentLoad: overMachine.occupancyRate,
                suggestedLoad: bestTarget.occupancyRate,
                loadDifference: overMachine.occupancyRate - bestTarget.occupancyRate
              });
            }
          });
        });
      }

      // Sort suggestions by load difference (most impactful first)
      const sortedSuggestions = suggestions.sort((a, b) => b.loadDifference - a.loadDifference);

      techniqueMap.set(technique.id, {
        technique,
        machines: techniqueMachines.sort((a, b) => b.occupancyRate - a.occupancyRate),
        averageOccupancy: avgOccupancy,
        maxOccupancy,
        minOccupancy,
        isUnbalanced,
        suggestions: sortedSuggestions
      });
    });

    const allSuggestions = Array.from(techniqueMap.values())
      .flatMap(t => t.suggestions)
      .sort((a, b) => b.loadDifference - a.loadDifference);

    return {
      byTechnique: Array.from(techniqueMap.values()),
      suggestions: allSuggestions,
      isLoading: false
    };
  }, [jobs, machines, techniques, targetDate]);

  // Apply a single suggestion
  const applySuggestion = useCallback((suggestion: LoadBalancingSuggestion) => {
    return applySuggestionMutation.mutateAsync(suggestion);
  }, [applySuggestionMutation]);

  // Apply all suggestions for a technique
  const applyAllForTechnique = useCallback((techniqueId: string) => {
    const techSummary = analysis.byTechnique.find(t => t.technique.id === techniqueId);
    if (!techSummary || techSummary.suggestions.length === 0) {
      toast.info('Nenhuma sugestão para aplicar');
      return Promise.resolve([]);
    }
    return applyMultipleSuggestionsMutation.mutateAsync(techSummary.suggestions);
  }, [analysis.byTechnique, applyMultipleSuggestionsMutation]);

  // Apply all suggestions
  const applyAllSuggestions = useCallback(() => {
    if (analysis.suggestions.length === 0) {
      toast.info('Nenhuma sugestão de balanceamento disponível');
      return Promise.resolve([]);
    }
    return applyMultipleSuggestionsMutation.mutateAsync(analysis.suggestions);
  }, [analysis.suggestions, applyMultipleSuggestionsMutation]);

  return {
    ...analysis,
    applySuggestion,
    applyAllForTechnique,
    applyAllSuggestions,
    isApplying: applySuggestionMutation.isPending || applyMultipleSuggestionsMutation.isPending,
  };
}
