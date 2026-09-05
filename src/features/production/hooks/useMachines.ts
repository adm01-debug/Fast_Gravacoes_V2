import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createAppError } from '@/lib/errorHandling';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/queryConfig';
import { machinesService } from '../index';
import { useRealtimeChannel } from '@/lib/realtimeChannel';

const MACHINES_ERROR_CONTEXT = { entity: 'machines', operation: 'fetch' };

export function useMachines() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.MACHINES,
    queryFn: async () => {
      try {
        return await machinesService.getActive();
      } catch (error) {
        throw createAppError(error, MACHINES_ERROR_CONTEXT);
      }
    },
    staleTime: STALE_TIMES.STATIC,
  });

  useRealtimeChannel('machines-changes', [{ table: 'machines' }], () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MACHINES });
  });

  return query;
}
