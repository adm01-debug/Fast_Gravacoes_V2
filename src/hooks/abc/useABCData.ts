import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { categorizeError } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';
import { ABCActivity, ABCCostPool, ABCActivityRate, ABCJobCost, ABC_ERROR_CONTEXT } from './types';
import { useTechniques } from '@/features/jobs';

export function useABCData() {
  // Fetch activities
  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['abc-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abc_activities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        if (import.meta.env.DEV) {
          logger.error('[useABCCosts] activities fetch failed: ' + categorizeError(error), error, 'ABC');
        }
        throw error;
      }
      return data as ABCActivity[];
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Fetch cost pools
  const { data: costPools = [], isLoading: loadingPools } = useQuery({
    queryKey: ['abc-cost-pools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abc_cost_pools')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        if (import.meta.env.DEV) {
          logger.error('[useABCCosts] pools fetch failed: ' + categorizeError(error), error, 'ABC');
        }
        throw error;
      }
      return data as ABCCostPool[];
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Fetch activity rates
  const { data: activityRates = [], isLoading: loadingRates } = useQuery({
    queryKey: ['abc-activity-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abc_activity_rates')
        .select('*')
        .order('period_start', { ascending: false });

      if (error) {
        if (import.meta.env.DEV) {
          logger.error('[useABCCosts] rates fetch failed: ' + categorizeError(error), error, 'ABC');
        }
        throw error;
      }
      return data as ABCActivityRate[];
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Fetch job costs
  const { data: jobCosts = [], isLoading: loadingJobCosts } = useQuery({
    queryKey: ['abc-job-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abc_job_costs')
        .select('*')
        .order('calculated_at', { ascending: false });

      if (error) {
        if (import.meta.env.DEV) {
          logger.error('[useABCCosts] jobCosts fetch failed: ' + categorizeError(error), error, 'ABC');
        }
        throw error;
      }
      return data as ABCJobCost[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch jobs for cost calculation
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-abc'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .in('status', ['finished', 'production'])
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) {
        if (import.meta.env.DEV) {
          logger.error('[useABCCosts] jobs fetch failed: ' + categorizeError(error), error, 'ABC');
        }
        throw error;
      }
      return data;
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch techniques (shared cache)
  const { data: techniques = [] } = useTechniques();

  return {
    activities,
    costPools,
    activityRates,
    jobCosts,
    jobs,
    techniques,
    isLoading: loadingActivities || loadingPools || loadingRates || loadingJobCosts,
  };
}
