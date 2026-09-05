import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useCallback } from 'react';
import { differenceInMinutes } from 'date-fns';
import { type Job as DbJob } from '../services/jobsService';
import { type Technique as DbTechnique } from '../services/techniquesService';
import { type Machine as DbMachine } from '../../production/services/machinesService';
import { QUERY_KEYS, STALE_TIMES, calculateRetryDelay } from '@/lib/queryConfig';
import { createAppError } from '@/lib/errorHandling';
import { jobsService } from '../services/jobsService';
import { machinesService } from '../../production/services/machinesService';
import { useAuth } from '@/features/auth';

// Retry configuration for connection failures
const RETRY_CONFIG = {
  retry: 3,
  retryDelay: (attemptIndex: number) => calculateRetryDelay(attemptIndex),
};

// Context-specific error messages
const SCHEDULING_ERROR_CONTEXT = {
  profiles: { entity: 'operator-profiles', operation: 'fetch' },
  techniques: { entity: 'techniques', operation: 'fetch' },
  machines: { entity: 'machines', operation: 'fetch' },
  jobs: { entity: 'jobs', operation: 'fetch' },
};

/**
 * Combined hook that fetches all scheduling data in a single place
 * and provides derived data and helper functions.
 *
 * This reduces duplicate subscriptions and provides a centralized data layer.
 * Includes automatic retry on connection failures and specific error handling.
 */
export function useSchedulingData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);

  // Using useQueries for parallel data fetching
  const results = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.OPERATOR_PROFILES,
        queryFn: async () => {
          const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url');
          if (error) throw createAppError(error, SCHEDULING_ERROR_CONTEXT.profiles);
          return data;
        },
        enabled: isAuthenticated,
        staleTime: STALE_TIMES.STATIC,
        ...RETRY_CONFIG,
      },
      {
        queryKey: QUERY_KEYS.TECHNIQUES,
        queryFn: async () => {
          const { data, error } = await supabase.from('techniques').select('*').order('name');
          if (error) throw createAppError(error, SCHEDULING_ERROR_CONTEXT.techniques);
          return data as DbTechnique[];
        },
        enabled: isAuthenticated,
        staleTime: STALE_TIMES.STATIC,
        ...RETRY_CONFIG,
      },
      {
        queryKey: QUERY_KEYS.MACHINES,
        queryFn: async () => {
          try {
            return await machinesService.getAll();
          } catch (error) {
            throw createAppError(error, SCHEDULING_ERROR_CONTEXT.machines);
          }
        },
        enabled: isAuthenticated,
        staleTime: STALE_TIMES.STATIC,
        ...RETRY_CONFIG,
      },
      {
        queryKey: QUERY_KEYS.JOBS_RECENT,
        queryFn: async () => {
          try {
            const data = await jobsService.getAll({ recentOnly: true });
            return data as unknown as DbJob[];
          } catch (error) {
            throw createAppError(error, SCHEDULING_ERROR_CONTEXT.jobs);
          }
        },
        enabled: isAuthenticated,
        staleTime: STALE_TIMES.DYNAMIC,
        ...RETRY_CONFIG,
      },
    ],
  });

  const [profilesQuery, techniquesQuery, machinesQuery, jobsQuery] = results;

  // Note: the original "app-core-sync" channel was removed because it collided
  // with `useJobs`/`useMachines`/`useTechniques`, which already invalidate the
  // same query keys via their own realtime subscriptions (see
  // src/lib/realtimeChannel.ts). Keeping both produced Supabase's
  // "cannot add `postgres_changes` callbacks after `subscribe()`" error.

  // Pre-build Maps for O(1) lookups instead of O(n) .find()
  const techniquesMap = useMemo(() => {
    const map = new Map<string, DbTechnique>();
    techniquesQuery.data?.forEach(t => map.set(t.id, t));
    return map;
  }, [techniquesQuery.data]);

  const machinesMap = useMemo(() => {
    const map = new Map<string, DbMachine>();
    machinesQuery.data?.forEach(m => map.set(m.id, m));
    return map;
  }, [machinesQuery.data]);

  const profilesMap = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();
    profilesQuery.data?.forEach(p => map.set(p.id, p));
    return map;
  }, [profilesQuery.data]);

  // Helper functions using O(1) Map lookups
  const getOperatorById = useCallback((id: string | null) => {
    if (!id) return undefined;
    return profilesMap.get(id);
  }, [profilesMap]);

  const getTechniqueById = useCallback((id: string): DbTechnique | undefined => {
    return techniquesMap.get(id);
  }, [techniquesMap]);

  const getMachineById = useCallback((id: string | null): DbMachine | undefined => {
    if (!id) return undefined;
    return machinesMap.get(id);
  }, [machinesMap]);

  const getMachinesByTechnique = useCallback((techniqueId: string): DbMachine[] => {
    return machinesQuery.data?.filter(m => m.technique_id === techniqueId) || [];
  }, [machinesQuery.data]);

  const getJobsByStatus = useCallback((status: DbJob['status']): DbJob[] => {
    return jobsQuery.data?.filter(j => j.status === status) || [];
  }, [jobsQuery.data]);

  const getJobsByMachine = useCallback((machineId: string): DbJob[] => {
    return jobsQuery.data?.filter(j => j.machine_id === machineId) || [];
  }, [jobsQuery.data]);

  const getJobsByTechnique = useCallback((techniqueId: string): DbJob[] => {
    return jobsQuery.data?.filter(j => j.technique_id === techniqueId) || [];
  }, [jobsQuery.data]);

  // Single-pass stats computation (replaces 9+ separate .filter() calls)
  const stats = useMemo(() => {
    const jobs = jobsQuery.data || [];
    const today = new Date().toISOString().split('T')[0];

    const result = {
      total: jobs.length,
      completed: 0, inProgress: 0, delayed: 0, queue: 0,
      ready: 0, scheduled: 0, paused: 0, rework: 0, buffer: 0,
      todayScheduled: 0, todayCompleted: 0, todayInProgress: 0, todayDelayed: 0,
      totalPieces: 0, completedPieces: 0, lostPieces: 0,
    };

    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      const isToday = j.scheduled_date === today;

      const quantity = Number(j.quantity) || 0;
      result.totalPieces += quantity;
      result.lostPieces += Number(j.lost_pieces) || 0;

      if (isToday) result.todayScheduled++;

      switch (j.status) {
        case 'finished':
          result.completed++;
          result.completedPieces += quantity;
          if (isToday) result.todayCompleted++;
          break;
        case 'production':
          result.inProgress++;
          if (isToday) result.todayInProgress++;
          break;
        case 'delayed':
          result.delayed++;
          if (isToday) result.todayDelayed++;
          break;
        case 'queue': result.queue++; break;
        case 'ready': result.ready++; break;
        case 'scheduled': result.scheduled++; break;
        case 'paused': result.paused++; break;
        case 'rework': result.rework++; break;
        case 'buffer': result.buffer++; break;
      }
    }

    return result;
  }, [jobsQuery.data]);

  // OEE History (14 dias) — extraído do return para respeitar Rules of Hooks
  const oeeTrend = useMemo(() => {
    const jobs = jobsQuery.data || [];
    const trend: Array<{ date: string; oee: number }> = [];
    const now = new Date();
    const days = 14;

    const jobsByDateMap = new Map<string, DbJob[]>();
    jobs.forEach(j => {
      if (j.status === 'finished' && j.actual_end_time) {
        const d = j.actual_end_time.substring(0, 10);
        const list = jobsByDateMap.get(d) || [];
        list.push(j);
        jobsByDateMap.set(d, list);
      }
    });

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayJobs = jobsByDateMap.get(dateStr) || [];

      if (dayJobs.length === 0) {
        trend.push({ date: dateStr, oee: 0 });
        continue;
      }

      let totalActual = 0, totalEstimated = 0;
      for (let j = 0; j < dayJobs.length; j++) {
        const job = dayJobs[j];
        if (job.actual_start_time && job.actual_end_time) {
          totalActual += Math.max(0, differenceInMinutes(new Date(job.actual_end_time), new Date(job.actual_start_time)));
        }
        totalEstimated += Number(job.estimated_duration) || 60;
      }

      const oee = totalActual > 0 ? Math.min(100, (totalEstimated / totalActual) * 100) : 100;
      trend.push({ date: dateStr, oee: Math.round(oee) });
    }
    return trend;
  }, [jobsQuery.data]);

  // Capacity Trend (7 dias) — extraído do return para respeitar Rules of Hooks
  const capacityTrend = useMemo(() => {
    const jobs = jobsQuery.data || [];
    const trend: Array<{ date: string; load: number; jobCount: number; risk: 'high' | 'medium' | 'low' }> = [];
    const days = 7;

    const jobsByScheduledDateMap = new Map<string, DbJob[]>();
    jobs.forEach(j => {
      if (j.scheduled_date) {
        const d = j.scheduled_date;
        const existing = jobsByScheduledDateMap.get(d) || [];
        existing.push(j);
        jobsByScheduledDateMap.set(d, existing);
      }
    });

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayJobs = jobsByScheduledDateMap.get(dateStr) || [];
      const load = dayJobs.reduce((sum, j) => sum + (j.estimated_duration || 0), 0);

      trend.push({
        date: dateStr,
        load,
        jobCount: dayJobs.length,
        risk: load > 480 ? 'high' : load > 300 ? 'medium' : 'low',
      });
    }
    return trend;
  }, [jobsQuery.data]);

  return {
    // Raw data
    jobs: jobsQuery.data || [],
    techniques: techniquesQuery.data || [],
    machines: machinesQuery.data || [],
    profiles: profilesQuery.data || [],

    // Loading states
    isLoading: jobsQuery.isLoading || techniquesQuery.isLoading || machinesQuery.isLoading,
    isLoadingJobs: jobsQuery.isLoading,
    isLoadingTechniques: techniquesQuery.isLoading,
    isLoadingMachines: machinesQuery.isLoading,

    // Error states
    error: jobsQuery.error || techniquesQuery.error || machinesQuery.error,

    // Helper functions
    getOperatorById,
    getTechniqueById,
    getMachineById,
    getMachinesByTechnique,
    getJobsByStatus,
    getJobsByMachine,
    getJobsByTechnique,

    // Derived stats
    stats,

    // Refetch functions
    refetchJobs: jobsQuery.refetch,
    refetchAll: () => {
      jobsQuery.refetch();
      techniquesQuery.refetch();
      machinesQuery.refetch();
    },

    // OEE History and Capacity Monitoring (memoizados acima)
    oeeTrend,
    capacityTrend,
  };
}

// Export individual hook selectors for backward compatibility
// These use the shared query cache, so there's no duplicate fetching
export function useJobsData() {
  const { jobs, isLoadingJobs, refetchJobs } = useSchedulingData();
  return { data: jobs, isLoading: isLoadingJobs, refetch: refetchJobs };
}

export function useTechniquesData() {
  const { techniques, isLoadingTechniques } = useSchedulingData();
  return { data: techniques, isLoading: isLoadingTechniques };
}

export function useMachinesData() {
  const { machines, isLoadingMachines } = useSchedulingData();
  return { data: machines, isLoading: isLoadingMachines };
}
