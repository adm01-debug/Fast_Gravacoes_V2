import { Badge } from '@/components/ui/badge';
import { Calendar, GripVertical } from 'lucide-react';
import { DbJob, DbTechnique, DbMachine } from '@/features/jobs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';

interface DragOverlayCardProps {
  job: DbJob;
  technique: DbTechnique | undefined;
  machine: DbMachine | null;
}

export function DragOverlayCard({ job, technique, machine }: DragOverlayCardProps) {
  return (
    <div
      className="p-3 rounded-lg border cursor-grabbing bg-card border-primary shadow-2xl scale-105 rotate-3 opacity-95"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-primary" />
        </div>
        <Badge
          variant="outline"
          className="text-xs shrink-0"
          style={{
            borderColor: technique?.color,
            color: technique?.color,
            backgroundColor: `${technique?.color}15`
          }}
        >
          {technique?.name || 'N/A'}
        </Badge>
      </div>

      <p className="font-medium text-sm text-foreground truncate mb-1">
        {job.client}
      </p>
      <p className="text-xs text-muted-foreground truncate mb-2">
        {job.product}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">OS {job.order_number}</span>
        <span>{job.quantity.toLocaleString()} pçs</span>
      </div>

      {job.scheduled_date && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(parseDateOnly(job.scheduled_date) ?? new Date(), "dd/MM", { locale: ptBR })}</span>
          {job.start_time && (
            <span className="ml-1">{job.start_time}</span>
          )}
        </div>
      )}

      {machine && (
        <div className="mt-1 text-xs text-muted-foreground truncate">
          📍 {machine.name}
        </div>
      )}
    </div>
  );
}
