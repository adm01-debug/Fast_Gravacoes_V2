import { useMemo, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { useSchedulingData } from '@/features/jobs';
import { useOperatorMachines } from './useOperatorMachines';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';

/**
 * Hook that provides dashboard data filtered by user role.
 * Operators see only their assigned machines and related jobs.
 * Coordinators and managers see all data.
 */
export function useOperatorDashboardData(dateRange?: DateRange) {
  const { user, isOperator } = useAuth();
  const schedulingData = useSchedulingData();
  const { assignments, isLoading: isLoadingAssignments } = useOperatorMachines(user?.id);

  // Get assigned machine IDs for the current operator
  const assignedMachineIds = useMemo(() => {
    if (!isOperator || !assignments) return null;
    return assignments.map(a => a.machine_id);
  }, [isOperator, assignments]);

  // Filter machines based on role
  const machines = useMemo(() => {
    if (!isOperator || !assignedMachineIds) {
      return schedulingData.machines;
    }
    return schedulingData.machines.filter(m => assignedMachineIds.includes(m.id));
  }, [isOperator, assignedMachineIds, schedulingData.machines]);

  // Filter jobs based on role and date range
  const jobs = useMemo(() => {
    let filtered = schedulingData.jobs;

    // Filter by machine assignment if operator
    if (isOperator && assignedMachineIds) {
      filtered = filtered.filter(j =>
        j.machine_id && assignedMachineIds.includes(j.machine_id)
      );
    }

    // Filter by date range if provided
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

      filtered = filtered.filter(j => {
        const jobDate = parseDateOnly(j.scheduled_date);
        if (!jobDate) return false;
        try {
          return isWithinInterval(jobDate, { start: from, end: to });
        } catch {
          return false;
        }
      });
    }

    return filtered;
  }, [isOperator, assignedMachineIds, schedulingData.jobs, dateRange]);

  // Filter techniques to only those relevant for assigned machines
  const techniques = useMemo(() => {
    if (!isOperator || !assignedMachineIds) {
      return schedulingData.techniques;
    }
    const relevantTechniqueIds = new Set(machines.map(m => m.technique_id));
    return schedulingData.techniques.filter(t => relevantTechniqueIds.has(t.id));
  }, [isOperator, assignedMachineIds, machines, schedulingData.techniques]);

  // Single-pass stats computation
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
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
      result.totalPieces += j.quantity;
      result.lostPieces += j.lost_pieces || 0;
      if (isToday) result.todayScheduled++;

      switch (j.status) {
        case 'finished':
          result.completed++;
          result.completedPieces += j.quantity;
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
  }, [jobs]);

  // Helper functions that work with filtered data for operators
  const getJobsByStatus = useCallback((status: string) => {
    return jobs.filter(j => j.status === status);
  }, [jobs]);

  const getJobsByMachine = useCallback((machineId: string) => {
    return jobs.filter(j => j.machine_id === machineId);
  }, [jobs]);

  const getJobsByTechnique = useCallback((techniqueId: string) => {
    return jobs.filter(j => j.technique_id === techniqueId);
  }, [jobs]);

  const getMachinesByTechnique = useCallback((techniqueId: string) => {
    return machines.filter(m => m.technique_id === techniqueId);
  }, [machines]);

  return {
    // Filtered data
    jobs,
    machines,
    techniques,
    stats,

    // Loading states
    isLoading: schedulingData.isLoading || (isOperator && isLoadingAssignments),

    // Helper functions using filtered data (consistent for operators)
    getTechniqueById: schedulingData.getTechniqueById,
    getMachineById: schedulingData.getMachineById,
    getMachinesByTechnique,
    getJobsByStatus,
    getJobsByMachine,
    getJobsByTechnique,

    // Role info
    isOperator,
    isCoordinator: !isOperator, // Or more specific logic if needed
    assignedMachineIds,

    // Refetch functions
    refetchAll: schedulingData.refetchAll,
  };
}
