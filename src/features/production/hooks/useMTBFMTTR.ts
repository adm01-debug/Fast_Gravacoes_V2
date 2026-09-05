import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { createAppError } from '@/lib/errorHandling';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';

const MTBF_ERROR_CONTEXT = {
  records: { entity: 'maintenance_records', operation: 'fetch' },
  machines: { entity: 'machines', operation: 'fetch_for_mtbf' },
};

export interface MaintenanceRecord {
  id: string;
  machine_id: string;
  maintenance_type_id: string;
  started_at: string;
  completed_at: string | null;
  downtime_minutes: number | null;
  status: string;
}

export interface MachineReliabilityMetrics {
  machineId: string;
  machineName: string;
  machineCode: string;
  techniqueId: string;
  mtbf: number | null; // Mean Time Between Failures (hours)
  mttr: number | null; // Mean Time To Repair (minutes)
  availability: number; // Percentage
  totalFailures: number;
  totalRepairTime: number; // minutes
  lastFailure: string | null;
  reliabilityScore: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
}

export interface MTBFMTTRSummary {
  averageMTBF: number | null;
  averageMTTR: number | null;
  averageAvailability: number;
  totalFailures: number;
  machinesWithData: number;
  criticalMachines: MachineReliabilityMetrics[];
}

function calculateReliabilityScore(mtbf: number | null, mttr: number | null, availability: number): MachineReliabilityMetrics['reliabilityScore'] {
  if (mtbf === null || mttr === null) return 'moderate';

  // MTBF in hours, MTTR in minutes, Availability in %
  // Weighted score logic for enterprise reliability 5.0
  if (availability >= 98 && mtbf >= 500 && mttr <= 60) return 'excellent';
  if (availability >= 95 && mtbf >= 300 && mttr <= 90) return 'good';
  if (availability >= 90 && mtbf >= 150 && mttr <= 120) return 'moderate';
  if (availability >= 80 && mtbf >= 50 && mttr <= 180) return 'poor';
  return 'critical';
}

export function useMTBFMTTR(periodDays: number = 90) {
  const queryClient = useQueryClient();

  // Fetch maintenance records
  const { data: records, isLoading: isLoadingRecords } = useQuery({
    queryKey: ['maintenance-records', periodDays],
    queryFn: async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        const { data, error } = await supabase
          .from('maintenance_records')
          .select('*')
          .gte('started_at', startDate.toISOString())
          .in('status', ['completed', 'approved'])
          .order('started_at', { ascending: true });

        if (error) throw error;
        return data as MaintenanceRecord[];
      } catch (error) {
        const appError = createAppError(error, MTBF_ERROR_CONTEXT.records);
        throw error;
      }
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Realtime subscription for maintenance records
  useRealtimeChannel('mtbf-maintenance-records-changes', [{ table: 'maintenance_records' }], () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
  });

  // Fetch machines
  const { data: machines, isLoading: isLoadingMachines } = useQuery({
    queryKey: ['machines-for-mtbf'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('machines')
          .select('id, name, code, technique_id')
          .eq('is_active', true);

        if (error) throw error;
        return data;
      } catch (error) {
        const appError = createAppError(error, MTBF_ERROR_CONTEXT.machines);
        throw error;
      }
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  const metrics = useMemo((): MachineReliabilityMetrics[] => {
    if (!records || !machines) return [];

    const periodHours = periodDays * 24;

    // machines already filtered to is_active=true in the query
    return machines.map(machine => {
      // Get corrective maintenance records (failures) for this machine
      const machineRecords = records.filter(r => r.machine_id === machine.id);
      const failures = machineRecords.filter(r => r.maintenance_type_id === 'corrective');

      const totalFailures = failures.length;
      const totalRepairTime = failures.reduce((sum, r) => sum + (r.downtime_minutes || 0), 0);

      // MTBF = Total Operating Time / Number of Failures
      // Operating time = Period hours - Total repair time (converted to hours)
      const operatingHours = periodHours - (totalRepairTime / 60);
      const mtbf = totalFailures > 0 ? operatingHours / totalFailures : null;

      // MTTR = Total Repair Time / Number of Repairs
      const mttr = totalFailures > 0 ? totalRepairTime / totalFailures : null;

      // Availability = (Operating Time / Total Time) * 100
      // Clamp to 0-100 range to handle edge cases
      const availabilityRaw = ((periodHours - (totalRepairTime / 60)) / periodHours) * 100;
      const availability = Math.max(0, Math.min(100, availabilityRaw));

      // Last failure
      const sortedFailures = [...failures].sort((a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      const lastFailure = sortedFailures[0]?.started_at || null;

      return {
        machineId: machine.id,
        machineName: machine.name,
        machineCode: machine.code,
        techniqueId: machine.technique_id,
        mtbf,
        mttr,
        availability,
        totalFailures,
        totalRepairTime,
        lastFailure,
        reliabilityScore: calculateReliabilityScore(mtbf, mttr, availability),
      };
    }).filter(m => m.totalFailures >= 0); // Include machines even without failures for full context
  }, [records, machines, periodDays]);

  const summary = useMemo((): MTBFMTTRSummary => {
    const machinesWithData = metrics.filter(m => m.totalFailures > 0);

    const validMTBFs = machinesWithData.map(m => m.mtbf).filter((v): v is number => v !== null);
    const validMTTRs = machinesWithData.map(m => m.mttr).filter((v): v is number => v !== null);

    const averageMTBF = validMTBFs.length > 0
      ? validMTBFs.reduce((a, b) => a + b, 0) / validMTBFs.length
      : null;

    const averageMTTR = validMTTRs.length > 0
      ? validMTTRs.reduce((a, b) => a + b, 0) / validMTTRs.length
      : null;

    const averageAvailability = machinesWithData.length > 0
      ? machinesWithData.reduce((sum, m) => sum + m.availability, 0) / machinesWithData.length
      : 100;

    const totalFailures = machinesWithData.reduce((sum, m) => sum + m.totalFailures, 0);

    const criticalMachines = metrics
      .filter(m => m.reliabilityScore === 'critical' || m.reliabilityScore === 'poor')
      .sort((a, b) => (a.mtbf || 0) - (b.mtbf || 0));

    return {
      averageMTBF,
      averageMTTR,
      averageAvailability,
      totalFailures,
      machinesWithData: machinesWithData.length,
      criticalMachines,
    };
  }, [metrics]);

  return {
    metrics,
    summary,
    isLoading: isLoadingRecords || isLoadingMachines,
  };
}
