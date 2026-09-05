import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DbJob } from '@/features/jobs';
import { JobStatus } from '@/types/scheduling';
import { statusColors, statusLabels } from './types';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useDraggable } from '@dnd-kit/core';

interface JobBlockProps {
  job: DbJob;
  position: { left: string; width: string };
  hasConflict?: boolean;
  ghost?: boolean;
  onClick: (job: DbJob) => void;
  draggable?: boolean;
}

export function JobBlock({ job, position, hasConflict, ghost, onClick, draggable = true }: JobBlockProps) {
  const { trigger } = useHapticFeedback();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: !draggable,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
    ...position
  } : position;

  const handleJobClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('light');
    onClick(job);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          onClick={handleJobClick}
          aria-label={`Job ${job.order_number} — ${statusLabels[job.status as JobStatus]}`}
          className={cn(
            'absolute top-2 rounded-md border cursor-grab active:cursor-grabbing',
            'flex items-center justify-center overflow-hidden',
            'transition-all duration-200 hover:scale-[1.02] hover:z-10',
            'shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40',
            statusColors[job.status as JobStatus],
            ghost ? 'bottom-5 opacity-70 border-dashed' : 'bottom-2',
            hasConflict && 'ring-2 ring-destructive/70 motion-safe:animate-pulse',
            isDragging && 'opacity-50 grayscale scale-95'
          )}
          style={style}
        >
          {hasConflict && (
            <AlertTriangle className="absolute top-0.5 right-0.5 w-3 h-3 text-destructive" />
          )}
          <div className="px-2 text-xs font-medium truncate pointer-events-none">
            {job.order_number.replace('OS-2024-', '')}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-card border-border/40 shadow-xl max-w-xs">
        <div className="space-y-1.5">
          <div className="font-semibold text-foreground">{job.order_number}</div>
          <div className="text-sm text-muted-foreground">{job.client}</div>
          <div className="text-sm">{job.product}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {job.start_time || '00:00'} - {job.end_time || '00:00'}
            </span>
            <Badge variant="outline" className={cn('text-xs', statusColors[job.status as JobStatus])}>
              {statusLabels[job.status as JobStatus]}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {job.quantity.toLocaleString()} peças • {job.gravure_color || 'Sem cor'}
          </div>
          {hasConflict && (
            <div className="flex items-center gap-1 text-xs text-destructive font-medium pt-1 border-t border-border/40">
              <AlertTriangle className="w-3 h-3" />
              Conflito de horário detectado
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
