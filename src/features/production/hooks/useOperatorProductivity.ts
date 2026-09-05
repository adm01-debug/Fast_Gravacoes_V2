import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchedulingData } from '@/features/jobs';
import { subDays, isAfter, parseISO } from 'date-fns';
import { useAuth } from '@/features/auth';

export type ProductivityPeriod = 7 | 30 | 90 | 'all';
export interface OperatorProductivityMetrics {
  operatorId: string;
  operatorName: string;
  avatarUrl: string | null;
  isActive: boolean;

  // Job metrics
  totalJobsCompleted: number;
  totalJobsInProgress: number;
  totalPiecesProduced: number;
  totalPiecesLost: number;
  lossRate: number;

  // Time metrics
  totalProductionTimeMinutes: number;
  averageJobDurationMinutes: number;
  estimatedVsActualRatio: number; // < 1 = faster than estimated, > 1 = slower

  // Efficiency metrics
  efficiencyScore: number; // 0-100
  productionVelocity: number; // pieces per hour

  // Scan activity
  totalScans: number;
  startActions: number;
  finishActions: number;
  pauseActions: number;

  // Machine assignments
  assignedMachines: number;
  machineNames: string[];
}

interface ScanHistoryItem {
  operator_id: string;
  action: string;
  scanned_at: string;
}

interface OperatorMachineItem {
  operator_id: string;
  machine_id: string;
  machines: {
    name: string;
  } | null;
}

export function useOperatorProductivity(period: ProductivityPeriod = 'all') {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);
  const { jobs, machines, isLoading: isLoadingScheduling } = useSchedulingData();

  // Calculate period start date
  const periodStartDate = useMemo(() => {
    if (period === 'all') return null;
    return subDays(new Date(), period);
  }, [period]);

  // Fetch operators with profiles
  const { data: operators, isLoading: isLoadingOperators } = useQuery({
    queryKey: ['operators-productivity'],
    queryFn: async () => {
      // First get user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'operator');

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      // Then get profiles for these users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge the data
      return roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.id === role.user_id) || null,
      }));
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch QR scan history for activity metrics
  const { data: scanHistory, isLoading: isLoadingScans } = useQuery({
    queryKey: ['scan-history-productivity', period],
    queryFn: async () => {
      let query = supabase
        .from('qr_scan_history')
        .select('operator_id, action, scanned_at');

      if (periodStartDate) {
        query = query.gte('scanned_at', periodStartDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ScanHistoryItem[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch operator machine assignments
  const { data: machineAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['operator-machines-productivity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operator_machines')
        .select(`
          operator_id,
          machine_id,
          machines:machine_id (
            name
          )
        `);

      if (error) throw error;
      return (data || []) as OperatorMachineItem[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Filter jobs by period
  const filteredJobs = useMemo(() => {
    if (!periodStartDate) return jobs;
    return jobs.filter(job => {
      // Use actual_end_time for finished jobs, otherwise use created_at
      const dateToCheck = job.actual_end_time || job.created_at;
      if (!dateToCheck) return false;
      return isAfter(parseISO(dateToCheck), periodStartDate);
    });
  }, [jobs, periodStartDate]);

  // Calculate productivity metrics for each operator
  const operatorMetrics = useMemo((): OperatorProductivityMetrics[] => {
    if (!operators) return [];

    return operators.map((op) => {
      const profile = op.profile;
      const operatorId = op.user_id;

      // Get operator's assigned machines
      const operatorMachines = machineAssignments?.filter(ma => ma.operator_id === operatorId) || [];
      const machineIds = operatorMachines.map(ma => ma.machine_id);
      const machineNames = operatorMachines
        .map(ma => ma.machines?.name)
        .filter((name): name is string => !!name);

      // Attribute by who actually ran the job (job.operator_id, set by
      // jobsService.updateStatus when a job moves to 'production') whenever
      // it's recorded. Falling back to "any job on a machine this operator
      // is assigned to" double-counts every job when two operators share a
      // machine, and wrongly credits jobs on shared machines to operators
      // who never touched them. The machine-based fallback only applies to
      // jobs with no operator_id recorded (legacy data / not yet started).
      const operatorJobs = filteredJobs.filter(j => {
        if (j.status !== 'finished') return false;
        if (j.operator_id) return j.operator_id === operatorId;
        if (machineIds.length > 0) {
          return j.machine_id && machineIds.includes(j.machine_id);
        }
        return false;
      });

      const inProgressJobs = filteredJobs.filter(j => {
        if (j.status !== 'production') return false;
        if (j.operator_id) return j.operator_id === operatorId;
        if (machineIds.length > 0) {
          return j.machine_id && machineIds.includes(j.machine_id);
        }
        return false;
      });

      // Null produced_quantity means "not recorded" — falling back to
      // quantity - lost_pieces still fabricates output for jobs whose actual
      // production was never logged.
      const totalPiecesProduced = operatorJobs.reduce((sum, j) => sum + (j.produced_quantity ?? 0), 0);
      const totalPiecesLost = operatorJobs.reduce((sum, j) => sum + (j.lost_pieces || 0), 0);
      const totalPiecesAttempted = totalPiecesProduced + totalPiecesLost;
      const lossRate = totalPiecesAttempted > 0 ? (totalPiecesLost / totalPiecesAttempted) * 100 : 0;

      // Calculate time metrics. estimatedMinutesForTimedJobs and
      // piecesProducedForTimedJobs are accumulated over the SAME subset of
      // jobs as totalProductionTimeMinutes (those with a valid, sane actual
      // duration) — mixing a subset numerator with an all-jobs denominator
      // (or vice versa) silently skews estimatedVsActualRatio and
      // productionVelocity.
      let totalProductionTimeMinutes = 0;
      let estimatedMinutesForTimedJobs = 0;
      let piecesProducedForTimedJobs = 0;
      let jobsWithActualTime = 0;

      operatorJobs.forEach(job => {
        if (job.actual_start_time && job.actual_end_time) {
          const startTime = new Date(job.actual_start_time).getTime();
          const endTime = new Date(job.actual_end_time).getTime();
          const durationMinutes = (endTime - startTime) / (1000 * 60);
          // Allow durations up to 72h for multi-shift jobs; only reject negative or unreasonably long
          if (durationMinutes > 0 && durationMinutes < 4320) {
            totalProductionTimeMinutes += durationMinutes;
            estimatedMinutesForTimedJobs += job.estimated_duration || 0;
            piecesProducedForTimedJobs += job.produced_quantity ?? 0;
            jobsWithActualTime++;
          }
        }
      });

      const averageJobDurationMinutes = jobsWithActualTime > 0
        ? totalProductionTimeMinutes / jobsWithActualTime
        : 0;

      const estimatedVsActualRatio = estimatedMinutesForTimedJobs > 0 && totalProductionTimeMinutes > 0
        ? totalProductionTimeMinutes / estimatedMinutesForTimedJobs
        : 1;

      // Calculate efficiency score (0-100)
      // Based on: loss rate (lower is better), time efficiency (asymmetric: reward speed, penalize slowness)
      const lossScore = Math.max(0, 100 - lossRate * 5); // -5 points per 1% loss
      // Asymmetric time score: faster than estimated gets bonus, slower gets full penalty
      const timeDeviation = 1 - estimatedVsActualRatio; // positive = faster, negative = slower
      const timeScore = estimatedVsActualRatio > 0
        ? Math.max(0, Math.min(100, timeDeviation > 0
            ? 100 - timeDeviation * 25  // Gentle penalty for being faster (only -25 per 100% faster)
            : 100 + timeDeviation * 50   // Full penalty for being slower (-50 per 100% slower)
          ))
        : 100;
      const efficiencyScore = (lossScore * 0.6 + timeScore * 0.4); // 60% weight on quality, 40% on time

      // Production velocity (pieces per hour) — numerator and denominator
      // must be the same job subset (see note above).
      const productionVelocity = totalProductionTimeMinutes > 0
        ? (piecesProducedForTimedJobs / totalProductionTimeMinutes) * 60
        : 0;

      // Get scan activity
      const operatorScans = scanHistory?.filter(s => s.operator_id === operatorId) || [];
      const startActions = operatorScans.filter(s => s.action === 'start').length;
      const finishActions = operatorScans.filter(s => s.action === 'finish').length;
      const pauseActions = operatorScans.filter(s => s.action === 'pause').length;

      return {
        operatorId,
        operatorName: profile?.full_name || 'Sem nome',
        avatarUrl: profile?.avatar_url ?? null,
        isActive: true,

        totalJobsCompleted: operatorJobs.length,
        totalJobsInProgress: inProgressJobs.length,
        totalPiecesProduced,
        totalPiecesLost,
        lossRate,

        totalProductionTimeMinutes,
        averageJobDurationMinutes,
        estimatedVsActualRatio,

        efficiencyScore,
        productionVelocity,

        totalScans: operatorScans.length,
        startActions,
        finishActions,
        pauseActions,

        assignedMachines: machineIds.length,
        machineNames,
      };
    });
  }, [operators, filteredJobs, scanHistory, machineAssignments]);

  // Sort by efficiency score (highest first)
  const sortedMetrics = useMemo(() => {
    return [...operatorMetrics].sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }, [operatorMetrics]);

  // Calculate overall averages
  const overallStats = useMemo(() => {
    const activeOperators = operatorMetrics.filter(o => o.isActive);
    const totalOperators = activeOperators.length;

    if (totalOperators === 0) {
      return {
        averageEfficiency: 0,
        totalJobsCompleted: 0,
        totalPiecesProduced: 0,
        averageLossRate: 0,
        topPerformer: null as OperatorProductivityMetrics | null,
      };
    }

    const totalJobsCompleted = activeOperators.reduce((sum, o) => sum + o.totalJobsCompleted, 0);
    const totalPiecesProduced = activeOperators.reduce((sum, o) => sum + o.totalPiecesProduced, 0);
    const averageEfficiency = activeOperators.reduce((sum, o) => sum + o.efficiencyScore, 0) / totalOperators;
    const averageLossRate = activeOperators.reduce((sum, o) => sum + o.lossRate, 0) / totalOperators;

    const topPerformer = activeOperators.reduce((best, curr) =>
      curr.efficiencyScore > (best?.efficiencyScore || 0) ? curr : best
    , null as OperatorProductivityMetrics | null);

    return {
      averageEfficiency,
      totalJobsCompleted,
      totalPiecesProduced,
      averageLossRate,
      topPerformer,
    };
  }, [operatorMetrics]);

  return {
    operators: sortedMetrics,
    overallStats,
    isLoading: isLoadingOperators || isLoadingScheduling || isLoadingScans || isLoadingAssignments,
  };
}
