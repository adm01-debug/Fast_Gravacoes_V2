import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, eachDayOfInterval, startOfDay, parseISO, isAfter, isBefore } from 'date-fns';
import { useAuth } from '@/features/auth';

export interface DailyEfficiencyData {
  date: string;
  dateLabel: string;
  jobsCompleted: number;
  piecesProduced: number;
  piecesLost: number;
  lossRate: number;
  efficiencyScore: number;
  productionTimeMinutes: number;
}

export interface OperatorEvolutionData {
  operatorId: string;
  operatorName: string;
  dailyData: DailyEfficiencyData[];
}

interface FinishedJob {
  id: string;
  machine_id: string | null;
  operator_id: string | null;
  quantity: number;
  produced_quantity: number | null;
  lost_pieces: number | null;
  estimated_duration: number;
  actual_start_time: string | null;
  actual_end_time: string | null;
}

interface OperatorMachineAssignment {
  operator_id: string;
  machine_id: string;
}

interface OperatorProfile {
  user_id: string;
  full_name: string | null;
}

export function useOperatorEvolution(days: number = 30) {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);
  const startDate = useMemo(() => subDays(new Date(), days), [days]);
  const dateRange = useMemo(() =>
    eachDayOfInterval({ start: startDate, end: new Date() }),
    [startDate]
  );

  // Fetch finished jobs within the period
  const { data: finishedJobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['finished-jobs-evolution', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, machine_id, operator_id, quantity, produced_quantity, lost_pieces, estimated_duration, actual_start_time, actual_end_time')
        .eq('status', 'finished')
        .gte('actual_end_time', startDate.toISOString());

      if (error) throw error;
      return (data || []) as FinishedJob[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch operator machine assignments
  const { data: machineAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['operator-machines-evolution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operator_machines')
        .select('operator_id, machine_id');

      if (error) throw error;
      return (data || []) as OperatorMachineAssignment[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch operator profiles
  const { data: operators, isLoading: isLoadingOperators } = useQuery({
    queryKey: ['operators-evolution'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'operator');

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      return (profiles || []).map(p => ({
        user_id: p.id,
        full_name: p.full_name,
      })) as OperatorProfile[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Calculate daily evolution for each operator
  const evolutionData = useMemo((): OperatorEvolutionData[] => {
    if (!operators || !finishedJobs || !machineAssignments) return [];

    return operators.map(operator => {
      // Get machines assigned to this operator
      const operatorMachineIds = machineAssignments
        .filter(ma => ma.operator_id === operator.user_id)
        .map(ma => ma.machine_id);

      // Attribute by operator_id when recorded; fall back to machine assignment
      // only for legacy jobs where operator_id was never set. Machine-only
      // attribution double-counts jobs on shared machines.
      const operatorJobs = finishedJobs.filter(j => {
        if (j.operator_id) return j.operator_id === operator.user_id;
        return j.machine_id !== null && operatorMachineIds.includes(j.machine_id);
      });

      // Calculate daily metrics
      const dailyData: DailyEfficiencyData[] = dateRange.map(date => {
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        // Jobs finished on this day
        const dayJobs = operatorJobs.filter(j => {
          if (!j.actual_end_time) return false;
          const endTime = parseISO(j.actual_end_time);
          return isAfter(endTime, dayStart) && isBefore(endTime, dayEnd);
        });

        const jobsCompleted = dayJobs.length;
        // Null produced_quantity means "not recorded" — not "fully produced".
        const piecesProduced = dayJobs.reduce((sum, j) => sum + (j.produced_quantity ?? 0), 0);
        const piecesLost = dayJobs.reduce((sum, j) => sum + (j.lost_pieces || 0), 0);
        const totalPieces = piecesProduced + piecesLost;
        const lossRate = totalPieces > 0 ? (piecesLost / totalPieces) * 100 : 0;

        // Calculate time metrics
        let productionTimeMinutes = 0;
        let totalEstimated = 0;
        dayJobs.forEach(job => {
          if (job.actual_start_time && job.actual_end_time) {
            const duration = (new Date(job.actual_end_time).getTime() - new Date(job.actual_start_time).getTime()) / (1000 * 60);
            if (duration > 0 && duration < 1440) {
              productionTimeMinutes += duration;
            }
          }
          totalEstimated += job.estimated_duration || 0;
        });

        // Calculate efficiency score for the day
        const lossScore = Math.max(0, 100 - lossRate * 5);
        const timeRatio = totalEstimated > 0 && productionTimeMinutes > 0
          ? productionTimeMinutes / totalEstimated
          : 1;
        const timeScore = Math.max(0, Math.min(100, 100 - Math.abs(1 - timeRatio) * 50));
        const efficiencyScore = jobsCompleted > 0 ? (lossScore * 0.6 + timeScore * 0.4) : 0;

        return {
          date: format(date, 'yyyy-MM-dd'),
          dateLabel: format(date, 'dd/MM'),
          jobsCompleted,
          piecesProduced,
          piecesLost,
          lossRate,
          efficiencyScore,
          productionTimeMinutes,
        };
      });

      return {
        operatorId: operator.user_id,
        operatorName: operator.full_name || 'Sem nome',
        dailyData,
      };
    });
  }, [operators, finishedJobs, machineAssignments, dateRange]);

  // Calculate overall daily averages
  const overallDailyData = useMemo((): DailyEfficiencyData[] => {
    if (evolutionData.length === 0) return [];

    return dateRange.map((date, index) => {
      const dayMetrics = evolutionData
        .map(op => op.dailyData[index])
        .filter(d => d && d.jobsCompleted > 0);

      if (dayMetrics.length === 0) {
        return {
          date: format(date, 'yyyy-MM-dd'),
          dateLabel: format(date, 'dd/MM'),
          jobsCompleted: 0,
          piecesProduced: 0,
          piecesLost: 0,
          lossRate: 0,
          efficiencyScore: 0,
          productionTimeMinutes: 0,
        };
      }

      const totalJobs = dayMetrics.reduce((sum, d) => sum + d.jobsCompleted, 0);
      const totalPiecesProduced = dayMetrics.reduce((sum, d) => sum + d.piecesProduced, 0);
      const totalPiecesLost = dayMetrics.reduce((sum, d) => sum + d.piecesLost, 0);
      const avgEfficiency = dayMetrics.reduce((sum, d) => sum + d.efficiencyScore, 0) / dayMetrics.length;
      const totalTime = dayMetrics.reduce((sum, d) => sum + d.productionTimeMinutes, 0);
      const totalPieces = totalPiecesProduced + totalPiecesLost;

      return {
        date: format(date, 'yyyy-MM-dd'),
        dateLabel: format(date, 'dd/MM'),
        jobsCompleted: totalJobs,
        piecesProduced: totalPiecesProduced,
        piecesLost: totalPiecesLost,
        lossRate: totalPieces > 0 ? (totalPiecesLost / totalPieces) * 100 : 0,
        efficiencyScore: avgEfficiency,
        productionTimeMinutes: totalTime,
      };
    });
  }, [evolutionData, dateRange]);

  return {
    evolutionData,
    overallDailyData,
    isLoading: isLoadingJobs || isLoadingAssignments || isLoadingOperators,
  };
}
