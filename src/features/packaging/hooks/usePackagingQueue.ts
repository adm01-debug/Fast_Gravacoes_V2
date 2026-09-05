import { useQuery } from '@tanstack/react-query';
import { packagingService } from '../services/packagingService';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import type { PackagingTaskStatus } from '../types/packaging.schema';

export function usePackagingQueue(status?: PackagingTaskStatus | PackagingTaskStatus[]) {
  const query = useQuery({
    queryKey: ['packaging-tasks', status ?? 'all'],
    queryFn: () => packagingService.listTasks(status ? { status } : undefined),
    staleTime: 30_000,
  });

  useRealtimeChannel('packaging-tasks-changes', [{ table: 'packaging_tasks' }], () => query.refetch());

  return query;
}
