import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { showErrorToast, createAppError } from '@/lib/errorHandling';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { useAuth } from '@/features/auth';

const OPERATOR_MACHINES_CONTEXT = {
  fetch: { entity: 'operator_machines', operation: 'fetch' },
  assign: { entity: 'operator_machines', operation: 'assign' },
  unassign: { entity: 'operator_machines', operation: 'unassign' },
};

export interface OperatorMachine {
  id: string;
  operator_id: string;
  machine_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export function useOperatorMachines(operatorId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['operator-machines', operatorId],
    queryFn: async () => {
      try {
        const query = supabase
          .from('operator_machines')
          .select('*');

        if (operatorId) {
          query.eq('operator_id', operatorId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as OperatorMachine[];
      } catch (error) {
        const appError = createAppError(error, OPERATOR_MACHINES_CONTEXT.fetch);
        throw error;
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Shared realtime channel via the singleton helper — see
  // src/lib/realtimeChannel.ts. Multiple `useOperatorMachines` consumers and
  // React 18 StrictMode double-mount reuse one channel.
  useRealtimeChannel('operator-machines-changes', [{ table: 'operator_machines' }], () => {
    queryClient.invalidateQueries({ queryKey: ['operator-machines'] });
  });

  const assignMachine = useMutation({
    mutationFn: async ({ operatorId, machineId }: { operatorId: string; machineId: string }) => {
      try {
        if (!user?.id) throw new Error('Usuário não autenticado');

        const { error } = await supabase
          .from('operator_machines')
          .insert({
            operator_id: operatorId,
            machine_id: machineId,
            assigned_by: user.id,
          });

        if (error) throw error;
      } catch (error) {
        const appError = createAppError(error, OPERATOR_MACHINES_CONTEXT.assign);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-machines'] });
      toast.success('Máquina atribuída com sucesso');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao atribuir máquina');
    },
  });

  const unassignMachine = useMutation({
    mutationFn: async ({ operatorId, machineId }: { operatorId: string; machineId: string }) => {
      try {
        const { error } = await supabase
          .from('operator_machines')
          .delete()
          .eq('operator_id', operatorId)
          .eq('machine_id', machineId);

        if (error) throw error;
      } catch (error) {
        const appError = createAppError(error, OPERATOR_MACHINES_CONTEXT.unassign);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-machines'] });
      toast.success('Máquina removida com sucesso');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao remover máquina');
    },
  });

  const getAssignedMachineIds = (opId: string) => {
    return (assignments || [])
      .filter(a => a.operator_id === opId)
      .map(a => a.machine_id);
  };

  return {
    assignments,
    isLoading,
    assignMachine,
    unassignMachine,
    getAssignedMachineIds,
  };
}
