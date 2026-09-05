import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  format,
  differenceInMinutes,
  subDays,
  differenceInDays,
  isSameDay
} from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ExecutiveKPIs {
  // Production KPIs
  totalJobsCompleted: number;
  totalJobsInProgress: number;
  totalPiecesProduced: number;
  totalPiecesLost: number;
  productionEfficiency: number;
  averageCycleTime: number;

  // Machine KPIs
  totalMachines: number;
  activeMachines: number;
  machineUtilization: number;

  // Maintenance KPIs
  maintenanceCompleted: number;
  maintenancePending: number;
  averageDowntime: number;

  // Quality KPIs
  qualityRate: number;
  defectRate: number;

  // Trends & Comparisons
  trends: {
    production: number; // % change
    efficiency: number; // % change
    quality: number;    // % change
    utilization: number; // % change
  };

  productionTrend: { date: string; produced: number; target: number; prevProduced?: number }[];
  efficiencyTrend: { date: string; efficiency: number; prevEfficiency?: number }[];
  techniqueDistribution: { technique: string; count: number; color: string }[];
  topOperators: { name: string; produced: number; efficiency: number }[];
  machinePerformance: { machine: string; utilization: number; oee: number }[];
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function useExecutiveDashboard(dateRange: DateRange, filters?: { machineId?: string; techniqueId?: string }) {
  return useQuery({
    queryKey: ['executive-dashboard', dateRange.start.toISOString(), dateRange.end.toISOString(), filters],
    queryFn: async (): Promise<ExecutiveKPIs> => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      // Calculate previous period for comparison
      const duration = differenceInDays(dateRange.end, dateRange.start) + 1;
      const prevStartDate = subDays(dateRange.start, duration).toISOString();
      const prevEndDate = subDays(dateRange.end, duration).toISOString();

      // Fetch current period data
      const currentData = await fetchPeriodData(startDate, endDate, filters);
      // Fetch previous period data for comparison
      const prevData = await fetchPeriodData(prevStartDate, prevEndDate, filters);

      const { jobs, machines, techniques, maintenance, healthMetrics, profiles } = currentData;
      const prevJobs = prevData.jobs;

      // Calculate Current KPIs
      const completedJobs = jobs.filter(j => j.status === 'finished');
      const inProgressJobs = jobs.filter(j => ['production', 'paused'].includes(j.status));
      const totalPiecesProduced = jobs.reduce((sum, j) => sum + (j.produced_quantity || 0), 0);
      const totalPiecesLost = jobs.reduce((sum, j) => sum + (j.lost_pieces || 0), 0);
      const totalQuantityTarget = jobs.reduce((sum, j) => sum + (j.quantity || 0), 0);

      const productionEfficiency = totalQuantityTarget > 0
        ? (totalPiecesProduced / totalQuantityTarget) * 100
        : 0;

      const qualityRate = (totalPiecesProduced + totalPiecesLost) > 0
        ? (totalPiecesProduced / (totalPiecesProduced + totalPiecesLost)) * 100
        : 100;

      const activeMachines = machines.filter(m => m.is_active).length;
      const machinesWithJobs = new Set(jobs.filter(j => j.machine_id).map(j => j.machine_id)).size;
      const machineUtilization = activeMachines > 0
        ? (machinesWithJobs / activeMachines) * 100
        : 0;

      // Calculate Trends (Comparisons)
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const prevTotalPiecesProduced = prevJobs.reduce((sum, j) => sum + (j.produced_quantity || 0), 0);
      const prevTotalQuantityTarget = prevJobs.reduce((sum, j) => sum + (j.quantity || 0), 0);
      const prevProductionEfficiency = prevTotalQuantityTarget > 0 ? (prevTotalPiecesProduced / prevTotalQuantityTarget) * 100 : 0;

      const prevTotalPiecesLost = prevJobs.reduce((sum, j) => sum + (j.lost_pieces || 0), 0);
      const prevQualityRate = (prevTotalPiecesProduced + prevTotalPiecesLost) > 0
        ? (prevTotalPiecesProduced / (prevTotalPiecesProduced + prevTotalPiecesLost)) * 100
        : 100;

      const prevMachinesWithJobs = new Set(prevJobs.filter(j => j.machine_id).map(j => j.machine_id)).size;
      const prevMachineUtilization = activeMachines > 0 ? (prevMachinesWithJobs / activeMachines) * 100 : 0;

      // Trends
      const trends = {
        production: calculateChange(totalPiecesProduced, prevTotalPiecesProduced),
        efficiency: productionEfficiency - prevProductionEfficiency, // Use absolute change for percentages usually
        quality: qualityRate - prevQualityRate,
        utilization: machineUtilization - prevMachineUtilization,
      };

      // Charts and other data
      const productionTrend = calculateDailyTrend(jobs, prevJobs, dateRange);
      const efficiencyTrend = calculateEfficiencyTrend(jobs, prevJobs, dateRange);
      const techniqueDistribution = techniques.map(t => ({
        technique: t.short_name || t.name,
        count: jobs.filter(j => j.technique_id === t.id).length,
        color: t.color || '#8884d8',
      })).filter(t => t.count > 0);

      const topOperators = calculateTopOperators(completedJobs, profiles);
      // Period duration in minutes — denominator for time-based utilization.
      const periodMinutes = differenceInMinutes(dateRange.end, dateRange.start) || 1;
      const machinePerformance = machines
        .filter(m => m.is_active)
        .slice(0, 10)
        .map(m => {
          const machineJobs = jobs.filter(j => j.machine_id === m.id);
          const machineMetrics = healthMetrics.find(h => h.machine_id === m.id);
          // Sum actual run-time for jobs that have both timestamps; fall back to
          // estimated_duration for jobs missing real timestamps.
          const runTimeMinutes = machineJobs.reduce((sum, j) => {
            if (j.actual_start_time && j.actual_end_time) {
              return sum + Math.max(0, differenceInMinutes(new Date(j.actual_end_time), new Date(j.actual_start_time)));
            }
            return sum + (j.estimated_duration || 0);
          }, 0);
          return {
            machine: m.code || m.name,
            utilization: Math.min(100, (runTimeMinutes / periodMinutes) * 100),
            oee: machineMetrics?.oee_score || 0,
          };
        });

      return {
        totalJobsCompleted: completedJobs.length,
        totalJobsInProgress: inProgressJobs.length,
        totalPiecesProduced,
        totalPiecesLost,
        productionEfficiency,
        averageCycleTime: 0, // Placeholder
        totalMachines: machines.length,
        activeMachines,
        machineUtilization,
        maintenanceCompleted: 0, // Placeholder
        maintenancePending: 0, // Placeholder
        averageDowntime: 0, // Placeholder
        qualityRate,
        defectRate: 100 - qualityRate,
        trends,
        productionTrend,
        efficiencyTrend,
        techniqueDistribution,
        topOperators,
        machinePerformance,
      };
    },
    staleTime: 60000,
  });
}

async function fetchPeriodData(startDate: string, endDate: string, filters?: { machineId?: string; techniqueId?: string }) {
  let jobsQuery = supabase.from('jobs').select('*').gte('created_at', startDate).lte('created_at', endDate);
  if (filters?.machineId) jobsQuery = jobsQuery.eq('machine_id', filters.machineId);
  if (filters?.techniqueId) jobsQuery = jobsQuery.eq('technique_id', filters.techniqueId);

  const [
    jobsRes,
    machinesRes,
    techniquesRes,
    maintenanceRes,
    healthMetricsRes,
    profilesRes
  ] = await Promise.all([
    jobsQuery,
    supabase.from('machines').select('*'),
    supabase.from('techniques').select('*'),
    supabase.from('maintenance_records').select('*').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('machine_health_metrics').select('*'),
    supabase.from('profiles').select('*'),
  ]);

  return {
    jobs: jobsRes.data || [],
    machines: machinesRes.data || [],
    techniques: techniquesRes.data || [],
    maintenance: maintenanceRes.data || [],
    healthMetrics: healthMetricsRes.data || [],
    profiles: profilesRes.data || [],
  };
}

function calculateDailyTrend(jobs: Job[], prevJobs: Job[], dateRange: DateRange) {
  const days: Record<string, { produced: number; target: number; prevProduced: number }> = {};

  // Calculate previous period offset in days
  const duration = differenceInDays(dateRange.end, dateRange.start) + 1;

  // Initialize all days in range
  let current = new Date(dateRange.start);
  while (current <= dateRange.end) {
    const dateStr = format(current, 'dd/MM');
    days[dateStr] = { produced: 0, target: 0, prevProduced: 0 };
    current = subDays(current, -1);
  }

  jobs.forEach(job => {
    const date = format(new Date(job.created_at), 'dd/MM');
    if (days[date]) {
      days[date].produced += job.produced_quantity || 0;
      days[date].target += job.quantity || 0;
    }
  });

  prevJobs.forEach(job => {
    // Map previous period date to corresponding current period date string
    const prevDate = new Date(job.created_at);
    const mappedDate = format(subDays(prevDate, -duration), 'dd/MM');
    if (days[mappedDate]) {
      days[mappedDate].prevProduced += job.produced_quantity || 0;
    }
  });

  return Object.entries(days).map(([date, data]) => ({ date, ...data }));
}

function calculateEfficiencyTrend(jobs: Job[], prevJobs: Job[], dateRange: DateRange) {
  const days: Record<string, { produced: number; target: number; prevProduced: number; prevTarget: number }> = {};
  const duration = differenceInDays(dateRange.end, dateRange.start) + 1;

  let current = new Date(dateRange.start);
  while (current <= dateRange.end) {
    const dateStr = format(current, 'dd/MM');
    days[dateStr] = { produced: 0, target: 0, prevProduced: 0, prevTarget: 0 };
    current = subDays(current, -1);
  }

  jobs.forEach(job => {
    const date = format(new Date(job.created_at), 'dd/MM');
    if (days[date]) {
      days[date].produced += job.produced_quantity || 0;
      days[date].target += job.quantity || 0;
    }
  });

  prevJobs.forEach(job => {
    const prevDate = new Date(job.created_at);
    const mappedDate = format(subDays(prevDate, -duration), 'dd/MM');
    if (days[mappedDate]) {
      days[mappedDate].prevProduced += job.produced_quantity || 0;
      days[mappedDate].prevTarget += job.quantity || 0;
    }
  });

  return Object.entries(days).map(([date, data]) => ({
    date,
    efficiency: data.target > 0 ? (data.produced / data.target) * 100 : 0,
    prevEfficiency: data.prevTarget > 0 ? (data.prevProduced / data.prevTarget) * 100 : 0,
  }));
}

function calculateTopOperators(completedJobs: Job[], profiles: Profile[]) {
  const operatorStats: Record<string, { produced: number; jobs: number }> = {};
  completedJobs.forEach(job => {
    // Group by operator_id; jobs without one (legacy data) cannot be reliably
    // attributed and are skipped to avoid incorrect rankings.
    const key = job.operator_id;
    if (!key) return;
    if (!operatorStats[key]) operatorStats[key] = { produced: 0, jobs: 0 };
    operatorStats[key].produced += job.produced_quantity || 0;
    operatorStats[key].jobs += 1;
  });

  return Object.entries(operatorStats)
    .sort(([, a], [, b]) => b.produced - a.produced)
    .slice(0, 5)
    .map(([userId, stats], index) => {
      const profile = profiles.find(p => p.id === userId);
      return {
        name: profile?.full_name || `Operador ${index + 1}`,
        produced: stats.produced,
        efficiency: stats.jobs > 0 ? Math.min(100, (stats.produced / (stats.jobs * 100)) * 100) : 0,
      };
    });
}

export function getDateRangePresets(): DateRange[] {
  const now = new Date();
  return [
    { label: 'Hoje', start: subDays(now, 0), end: now },
    { label: 'Esta Semana', start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
    { label: 'Este Mês', start: startOfMonth(now), end: endOfMonth(now) },
    { label: 'Mês Passado', start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
  ];
}
