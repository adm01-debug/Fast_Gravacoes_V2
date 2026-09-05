import { Skeleton } from '@/components/ui/skeleton';
import { PackagingTaskCard } from './PackagingTaskCard';
import type { PackagingTaskWithJob } from '../services/packagingService';
import { Package as PackageIcon } from 'lucide-react';

interface Props {
  tasks: PackagingTaskWithJob[] | undefined;
  isLoading: boolean;
  emptyLabel?: string;
  onOpen: (taskId: string) => void;
}

export function PackagingQueueList({ tasks, isLoading, emptyLabel = 'Nenhuma tarefa nesta lista.', onOpen }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <PackageIcon className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <PackagingTaskCard key={task.id} task={task} onOpen={onOpen} />
      ))}
    </div>
  );
}
