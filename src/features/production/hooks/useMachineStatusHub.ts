import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useRealtimeChannel } from '@/lib/realtimeChannel';

export interface MachineStatus {
  machineId: string;
  status: 'idle' | 'production' | 'maintenance' | 'offline';
  activeJobId?: string | null;
  lastUpdate: string;
}

export function useMachineStatusHub() {
  const [statuses, setStatuses] = useState<Record<string, MachineStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<number | null>(null);

  const fetchInitialStatus = useCallback(async () => {
    try {
      const [{ data: machines, error: machinesError }, { data: activeJobs, error: jobsError }] = await Promise.all([
        supabase.from('machines').select('id, is_active'),
        supabase.from('jobs').select('id, machine_id, status').eq('status', 'production'),
      ]);

      if (machinesError) throw machinesError;
      if (jobsError) throw jobsError;

      const newStatuses: Record<string, MachineStatus> = {};
      machines?.forEach(m => {
        const job = activeJobs?.find(j => j.machine_id === m.id);
        newStatuses[m.id] = {
          machineId: m.id,
          status: !m.is_active ? 'offline' : job ? 'production' : 'idle',
          activeJobId: job?.id,
          lastUpdate: new Date().toISOString(),
        };
      });

      setStatuses(newStatuses);
      setIsLoading(false);
    } catch (error) {
      logger.warn('Não foi possível atualizar o status das máquinas', error, 'useMachineStatusHub');
      setIsLoading(false);
    }
  }, []);

  const scheduleStatusRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = window.setTimeout(() => {
      void fetchInitialStatus();
    }, 500);
  }, [fetchInitialStatus]);

  useEffect(() => {
    void fetchInitialStatus();
    return () => {
      if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
    };
  }, [fetchInitialStatus]);

  // Shared channel — see src/lib/realtimeChannel.ts.
  useRealtimeChannel(
    'machine-status-hub',
    [{ table: 'jobs' }, { table: 'machines' }],
    () => scheduleStatusRefresh(),
  );

  return { statuses, isLoading };
}
