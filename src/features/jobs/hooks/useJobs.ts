import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { createAppError, createMutationErrorHandler } from '@/lib/errorHandling';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/queryConfig';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { jobsService } from '../services/jobsService';
import type { Job, JobStatus } from '../services/jobsService';
import { useTechniques } from '../index';
import type { Technique } from '../services/techniquesService';

// Error context for debugging
const JOBS_ERROR_CONTEXT = {
  hooks: {
    jobs: { entity: 'jobs', operation: 'fetch' },
    updateStatus: { entity: 'jobs', operation: 'update_status' },
    updateJob: { entity: 'jobs', operation: 'update' },
    deleteJob: { entity: 'jobs', operation: 'delete' },
  }
};

export const STATIC_STALE_TIME = STALE_TIMES.STATIC;
export const JOBS_STALE_TIME = STALE_TIMES.DYNAMIC;

export function useJobs() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.JOBS,
    queryFn: async () => {
      try {
        return await jobsService.getAll();
      } catch (error) {
        throw createAppError(error, JOBS_ERROR_CONTEXT.hooks.jobs);
      }
    },
    staleTime: JOBS_STALE_TIME,
  });

  // Shared realtime channel — see src/lib/realtimeChannel.ts. Multiple
  // `useJobs` consumers (14+ call sites in this codebase, plus StrictMode
  // double-mount) reuse one channel, avoiding the "cannot add
  // `postgres_changes` callbacks ... after `subscribe()`" crash.
  useRealtimeChannel('jobs-changes', [{ table: 'jobs' }], () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS_RECENT });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGINATED_JOBS });
  });

  return query;
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: JobStatus }) => {
      try {
        return await jobsService.updateStatus(jobId, status);
      } catch (error) {
        throw createAppError(error, JOBS_ERROR_CONTEXT.hooks.updateStatus);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS_RECENT });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGINATED_JOBS });
    },
    onError: createMutationErrorHandler('Erro ao atualizar status do job'),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, data }: { jobId: string; data: Partial<Job> }) => {
      try {
        return await jobsService.update(jobId, data);
      } catch (error) {
        throw createAppError(error, JOBS_ERROR_CONTEXT.hooks.updateJob);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS_RECENT });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGINATED_JOBS });
    },
    onError: createMutationErrorHandler('Erro ao atualizar job'),
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      try {
        await jobsService.delete(jobId);
      } catch (error) {
        throw createAppError(error, JOBS_ERROR_CONTEXT.hooks.deleteJob);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS_RECENT });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGINATED_JOBS });
    },
    onError: createMutationErrorHandler('Erro ao excluir job'),
  });
}

export interface BufferTechniqueStatus {
  technique: Technique;
  readyCount: number;
  queueCount: number;
  isHealthy: boolean;
  isCritical: boolean;
  isWarning: boolean;
}

export function useBufferStatus() {
  const { data: jobs } = useJobs();
  const { data: techniques } = useTechniques();

  return useMemo(() => {
    if (!jobs || !techniques) {
      return { bufferByTechnique: [] as BufferTechniqueStatus[], isLoading: true };
    }

    const jobsByTechnique = new Map<string, Job[]>();
    for (const job of jobs) {
      if (!job.technique_id) continue;
      const list = jobsByTechnique.get(job.technique_id) || [];
      list.push(job);
      jobsByTechnique.set(job.technique_id, list);
    }

    const bufferByTechnique: BufferTechniqueStatus[] = techniques.map(technique => {
      const techniqueJobs = jobsByTechnique.get(technique.id) || [];

      let readyCount = 0;
      let queueCount = 0;
      let hasActiveWork = false;

      for (const job of techniqueJobs) {
        if (job.status === 'ready') readyCount++;
        else if (job.status === 'queue') queueCount++;
        else if (['production', 'scheduled', 'delayed', 'paused', 'rework'].includes(job.status)) {
          hasActiveWork = true;
        }
      }

      const hasWork = readyCount > 0 || queueCount > 0 || hasActiveWork;

      return {
        technique,
        readyCount,
        queueCount,
        isHealthy: readyCount >= 3,
        isCritical: hasWork && readyCount === 0,
        isWarning: hasWork && readyCount > 0 && readyCount < 3,
      };
    }).filter(item => item.queueCount > 0 || item.readyCount > 0 || item.isCritical);

    return { bufferByTechnique, isLoading: false };
  }, [jobs, techniques]);
}
