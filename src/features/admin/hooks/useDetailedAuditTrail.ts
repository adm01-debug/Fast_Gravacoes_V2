import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JobStatusAudit {
  id: string;
  job_id: string;
  old_status: string;
  new_status: string;
  old_produced_quantity: number | null;
  new_produced_quantity: number | null;
  old_lost_pieces: number | null;
  new_lost_pieces: number | null;
  changed_by: string;
  changed_at: string;
  profiles?: {
    full_name: string | null;
  };
  jobs?: {
    order_number: string | null;
  };
}

export interface MachineEventAudit {
  id: string;
  machine_id: string;
  event_type: string;
  old_value: string;
  new_value: string;
  performed_by: string;
  performed_at: string;
  profiles?: {
    full_name: string | null;
  };
  machines?: {
    name: string;
  };
}

// Narrow-cast to allow querying tables not yet in the generated Database types.
const untypedClient = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

export function useDetailedAuditTrail() {
  const jobAuditQuery = useQuery({
    queryKey: ['job-status-audit'],
    queryFn: async () => {
      const { data, error } = await untypedClient
        .from('job_status_audit')
        .select(`
          *,
          profiles:changed_by(full_name),
          jobs:job_id(order_number)
        `)
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return ((data ?? []) as unknown as JobStatusAudit[]);
    },
    staleTime: 30000,
  });

  const machineAuditQuery = useQuery({
    queryKey: ['machine-event-audit'],
    queryFn: async () => {
      const { data, error } = await untypedClient
        .from('machine_event_audit')
        .select(`
          *,
          profiles:performed_by(full_name),
          machines:machine_id(name)
        `)
        .order('performed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return ((data ?? []) as unknown as MachineEventAudit[]);
    },
    staleTime: 30000,
  });

  return {
    jobAudits: jobAuditQuery.data || [],
    machineAudits: machineAuditQuery.data || [],
    isLoading: jobAuditQuery.isLoading || machineAuditQuery.isLoading,
  };
}
