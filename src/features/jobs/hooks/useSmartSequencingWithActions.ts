import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useJobs, useTechniques, DbJob, DbMachine, DbTechnique } from '../index';
import { useMachines } from '@/features/production';
import { parseDateOnly } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { showErrorToast, createAppError } from '@/lib/errorHandling';

const SEQUENCING_ERROR_CONTEXT = {
  applySequencing: { entity: 'jobs', operation: 'apply_sequencing' },
  applyAllSequencing: { entity: 'jobs', operation: 'apply_all_sequencing' },
};

export interface SequencingSuggestion {
  id: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  techniqueId: string;
  techniqueName: string;
  currentSequence: DbJob[];
  optimizedSequence: DbJob[];
  estimatedSavings: number; // minutes saved
  colorGroups: ColorGroup[];
  bottleneckRisk: 'low' | 'medium' | 'high';
  totalMinutes: number;
  currentChanges: number;
  optimizedChanges: number;
  totalQuantity: number;
  aiPriorityScore: number;
  setupComplexity: 'low' | 'medium' | 'high';
}

export interface ColorGroup {
  color: string;
  jobs: DbJob[];
  jobCount: number;
}

export interface ApplySequencingResult {
  machineId: string;
  machineName: string;
  appliedJobs: number;
  estimatedSavings: number;
}

function normalizeColor(color: string | null): string {
  if (!color) return 'sem-cor';
  return color.toLowerCase().trim().replace(/\s+/g, '-');
}

function countSequenceChanges(jobs: DbJob[]): number {
  let changes = 0;
  for (let i = 1; i < jobs.length; i++) {
    if (normalizeColor(jobs[i].gravure_color) !== normalizeColor(jobs[i - 1].gravure_color)) {
      changes++;
    }
  }
  return changes;
}

function calculateSetupSavings(currentChanges: number, optimizedChanges: number, setupTime: number): number {
  return (currentChanges - optimizedChanges) * setupTime;
}

function generateTimeSlots(startHour: number, jobs: DbJob[]): { jobId: string; startTime: string; endTime: string }[] {
  const slots: { jobId: string; startTime: string; endTime: string }[] = [];
  let currentMinutes = startHour * 60;

  for (const job of jobs) {
    const startHours = Math.floor(currentMinutes / 60);
    const startMins = currentMinutes % 60;
    const startTime = `${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`;

    currentMinutes += job.estimated_duration;

    const endHours = Math.floor(currentMinutes / 60);
    const endMins = currentMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    slots.push({ jobId: job.id, startTime, endTime });
  }

  return slots;
}

export function useSmartSequencingWithActions() {
  const { data: jobs } = useJobs();
  const { data: machines } = useMachines();
  const { data: techniques } = useTechniques();
  const queryClient = useQueryClient();

  // Mutation to apply sequencing for a machine — single upsert instead of N individual updates
  const applySequencingMutation = useMutation({
    mutationFn: async (suggestion: SequencingSuggestion): Promise<ApplySequencingResult> => {
      const timeSlots = generateTimeSlots(7, suggestion.optimizedSequence); // Start at 07:00

      // Single upsert: one round-trip for all slots
      const { error } = await supabase
        .from('jobs')
        .upsert(
          timeSlots.map(slot => ({ id: slot.jobId, start_time: slot.startTime, end_time: slot.endTime })) as never,
          { onConflict: 'id' }
        );

      if (error) throw createAppError(error, SEQUENCING_ERROR_CONTEXT.applySequencing);

      return {
        machineId: suggestion.machineId,
        machineName: suggestion.machineName,
        appliedJobs: timeSlots.length,
        estimatedSavings: suggestion.estimatedSavings,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated-jobs'] });
      toast.success(`Sequência otimizada aplicada`, {
        description: `${result.machineName}: ${result.appliedJobs} jobs reordenados, ~${result.estimatedSavings}min economizados`,
      });
    },
    onError: (error, suggestion) => {
      showErrorToast(error, `Erro ao aplicar sequência para ${suggestion.machineName}`);
    },
  });

  // Mutation to apply all sequencing suggestions — surfaces partial failures to the user
  const applyAllSequencingMutation = useMutation({
    mutationFn: async (suggestions: SequencingSuggestion[]): Promise<{ succeeded: ApplySequencingResult[]; failedCount: number }> => {
      const succeeded: ApplySequencingResult[] = [];
      let failedCount = 0;

      // Process suggestions in parallel; collect individual outcomes instead of short-circuiting
      const outcomes = await Promise.all(
        suggestions.map(async (suggestion): Promise<ApplySequencingResult | null> => {
          try {
            const timeSlots = generateTimeSlots(7, suggestion.optimizedSequence);

            // Single upsert per suggestion: one round-trip per machine
            const { error } = await supabase
              .from('jobs')
              .upsert(
                timeSlots.map(slot => ({ id: slot.jobId, start_time: slot.startTime, end_time: slot.endTime })) as never,
                { onConflict: 'id' }
              );

            if (error) throw createAppError(error, SEQUENCING_ERROR_CONTEXT.applyAllSequencing);

            return {
              machineId: suggestion.machineId,
              machineName: suggestion.machineName,
              appliedJobs: timeSlots.length,
              estimatedSavings: suggestion.estimatedSavings,
            };
          } catch {
            return null;
          }
        })
      );

      outcomes.forEach(r => {
        if (r !== null) succeeded.push(r);
        else failedCount++;
      });

      // Propagate failure so onError fires when everything failed
      if (succeeded.length === 0 && failedCount > 0) {
        throw new Error(`Falha ao otimizar todas as ${failedCount} máquina(s)`);
      }

      return { succeeded, failedCount };
    },
    onSuccess: ({ succeeded, failedCount }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated-jobs'] });

      const totalJobs = succeeded.reduce((sum, r) => sum + r.appliedJobs, 0);
      const totalSavings = succeeded.reduce((sum, r) => sum + r.estimatedSavings, 0);
      toast.success(`${succeeded.length} máquina(s) otimizada(s)`, {
        description: `${totalJobs} jobs reordenados, ~${totalSavings}min economizados${failedCount > 0 ? ` (${failedCount} falha(s))` : ''}`,
      });
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao otimizar sequências');
    },
  });

  const suggestions = useMemo(() => {
    if (!jobs || !machines || !techniques) return [];

    const result: SequencingSuggestion[] = [];
    const today = new Date();

    if (!today || isNaN(today.getTime())) {
      return [];
    }

    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    let suggestionId = 0;

    const jobsByMachine = new Map<string, DbJob[]>();

    jobs.forEach(job => {
      if (!job.machine_id || !job.scheduled_date) return;
      if (!['scheduled', 'ready', 'queue'].includes(job.status)) return;

      const jobDate = parseDateOnly(job.scheduled_date);
      if (!jobDate || isNaN(jobDate.getTime())) return;

      jobDate.setHours(0, 0, 0, 0);

      if (jobDate < today || jobDate > tomorrow) return;

      const existing = jobsByMachine.get(job.machine_id) || [];
      existing.push(job);
      jobsByMachine.set(job.machine_id, existing);
    });

    jobsByMachine.forEach((machineJobs, machineId) => {
      if (machineJobs.length < 2) return;

      const machine = machines.find(m => m.id === machineId);
      if (!machine) return;

      const technique = techniques.find(t => t.id === machine.technique_id);
      if (!technique) return;

      const currentSequence = [...machineJobs].sort((a, b) =>
        (a.start_time || '').localeCompare(b.start_time || '')
      );

      const colorGroups = new Map<string, DbJob[]>();
      machineJobs.forEach(job => {
        const color = normalizeColor(job.gravure_color);
        const group = colorGroups.get(color) || [];
        group.push(job);
        colorGroups.set(color, group);
      });

      const optimizedSequence: DbJob[] = [];
      const sortedColorGroups = Array.from(colorGroups.entries())
        .sort((a, b) => b[1].length - a[1].length);

      sortedColorGroups.forEach(([_, groupJobs]) => {
        const sortedGroup = groupJobs.sort((a, b) => {
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
          const priorityA = priorityOrder[a.priority] ?? 2;
          const priorityB = priorityOrder[b.priority] ?? 2;
          return priorityA - priorityB;
        });
        optimizedSequence.push(...sortedGroup);
      });

      // Calculate complexity and priority score
      const colorComplexity = colorGroups.size;
      const setupComplexity = colorComplexity > 5 ? 'high' : colorComplexity > 3 ? 'medium' : 'low';

      const urgentJobsCount = machineJobs.filter(j => j.priority === 'urgent').length;
      const highPriorityJobsCount = machineJobs.filter(j => j.priority === 'high').length;
      const aiPriorityScore = Math.min(100, (urgentJobsCount * 30) + (highPriorityJobsCount * 15) + (machineJobs.length * 5));

      const currentChanges = countSequenceChanges(currentSequence);
      const optimizedChanges = countSequenceChanges(optimizedSequence);
      const estimatedSavings = calculateSetupSavings(currentChanges, optimizedChanges, technique.setup_time);
      const totalMinutes = optimizedSequence.reduce((acc, job) => acc + (job.estimated_duration || 0), 0);
      const totalQuantity = optimizedSequence.reduce((acc, job) => acc + (job.quantity || 0), 0);

      // Use dynamic thresholds from technique
      const lowT = technique.low_threshold || 300;
      const medT = technique.medium_threshold || 480;
      const highT = technique.high_threshold || 600;

      const bottleneckRisk = totalMinutes > medT ? 'high' : totalMinutes > lowT ? 'medium' : 'low';

      if (estimatedSavings > 0) {
        result.push({
          id: `seq-${++suggestionId}`,
          machineId,
          machineName: machine.name,
          machineCode: machine.code,
          techniqueId: machine.technique_id,
          techniqueName: technique.name,
          currentSequence,
          optimizedSequence,
          currentChanges,
          optimizedChanges,
          estimatedSavings,
          totalQuantity,
          bottleneckRisk,
          totalMinutes,
          aiPriorityScore,
          setupComplexity,
          colorGroups: Array.from(colorGroups.entries()).map(([color, jobs]) => ({
            color,
            jobs,
            jobCount: jobs.length
          }))
        });
      }
    });

    return result.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }, [jobs, machines, techniques]);

  // Apply sequencing for a single machine
  const applySequencing = useCallback((suggestion: SequencingSuggestion) => {
    return applySequencingMutation.mutateAsync(suggestion);
  }, [applySequencingMutation]);

  // Apply all sequencing suggestions
  const applyAllSequencing = useCallback(() => {
    if (suggestions.length === 0) {
      toast.info('Nenhuma sugestão de sequenciamento disponível');
      return Promise.resolve([]);
    }
    return applyAllSequencingMutation.mutateAsync(suggestions);
  }, [suggestions, applyAllSequencingMutation]);

  return {
    suggestions,
    totalSavings: suggestions.reduce((acc, s) => acc + s.estimatedSavings, 0),
    hasSuggestions: suggestions.length > 0,
    applySequencing,
    applyAllSequencing,
    isApplying: applySequencingMutation.isPending || applyAllSequencingMutation.isPending,
  };
}
