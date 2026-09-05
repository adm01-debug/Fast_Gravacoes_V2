import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, GripVertical, AlertCircle, ArrowUp, ArrowDown, Minus, Clock, Play, Pause, CheckCircle2, MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { DbJob, DbTechnique, DbMachine } from '@/features/jobs';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ViewMode } from './KanbanFiltersBar';
import { useJobInventoryCheck } from '@/features/jobs';

interface DraggableJobCardProps {
  job: DbJob;
  technique: DbTechnique | undefined;
  machine: DbMachine | null;
  onClick: () => void;
  viewMode?: ViewMode;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onQuickAction?: (jobId: string, action: string) => void;
}

const priorityConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'urgent': { label: 'Urgente', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: AlertCircle },
  'high': { label: 'Alta', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: ArrowUp },
  'medium': { label: 'Média', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Minus },
  'low': { label: 'Baixa', color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: ArrowDown },
};

function getAgingIndicator(updatedAt: string): { color: string; label: string; dot: string } {
  const hours = differenceInHours(new Date(), new Date(updatedAt));
  if (hours < 24) return { color: 'text-green-400', label: '<1d', dot: 'bg-green-400' };
  if (hours < 72) return { color: 'text-yellow-400', label: `${Math.floor(hours / 24)}d`, dot: 'bg-yellow-400' };
  return { color: 'text-red-400', label: `${Math.floor(hours / 24)}d`, dot: 'bg-red-400' };
}

function getDeadlineInfo(job: DbJob): { label: string; isOverdue: boolean; color: string } | null {
  if (!job.scheduled_date) return null;
  const scheduled = parseDateOnly(job.scheduled_date);
  if (!scheduled) return null;
  const now = new Date();
  const diffDays = differenceInDays(scheduled, now);

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasado`, isOverdue: true, color: 'text-red-400 bg-red-400/10' };
  if (diffDays === 0) return { label: 'Hoje', isOverdue: false, color: 'text-orange-400 bg-orange-400/10' };
  if (diffDays <= 2) return { label: `${diffDays}d restante`, isOverdue: false, color: 'text-yellow-400 bg-yellow-400/10' };
  return null;
}

export function DraggableJobCard({ job, technique, machine, onClick, viewMode = 'expanded', isSelected, onSelect, onQuickAction }: DraggableJobCardProps) {
  const { isAvailable, lowStockItems, outOfStockItems } = useJobInventoryCheck(job.technique_id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: job.id,
    data: { type: 'job', job }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[job.priority] || priorityConfig['medium'];
  const PriorityIcon = priority.icon;
  const aging = getAgingIndicator(job.updated_at);
  const deadline = getDeadlineInfo(job);
  const progress = job.produced_quantity && job.quantity
    ? Math.min(100, Math.round((job.produced_quantity / job.quantity) * 100))
    : 0;

  // Compact view
  if (viewMode === 'compact') {
    return (
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        aria-label={`Abrir job ${job.order_number} - ${job.client}`}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md border border-l-2 cursor-pointer transition-all",
          "bg-card/50 border-border/30 hover:bg-card hover:border-border",
          "group touch-none text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isDragging && "opacity-50 shadow-xl scale-105 z-50 ring-2 ring-primary",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        style={{
          ...(style as React.CSSProperties),
          borderLeftColor: technique?.color || 'transparent',
        }}
        onClick={onClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={-1}
          aria-label="Arrastar job"
          className="cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(job.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-3 w-3 rounded border-border accent-primary"
          />
        )}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${aging.dot}`} title={`Há ${aging.label} neste status`} />
        <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4 gap-0.5 shrink-0", priority.color)}>
          <PriorityIcon className="h-2.5 w-2.5" />
        </Badge>
        <span className="font-medium truncate">{job.client}</span>
        <span className="text-muted-foreground truncate">{job.product}</span>
        <span className="font-mono text-muted-foreground shrink-0 ml-auto">OS {job.order_number}</span>
        {deadline && (
          <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4 shrink-0", deadline.color)}>
            {deadline.label}
          </Badge>
        )}
        {progress > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0">{progress}%</span>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      aria-label={`Abrir job ${job.order_number} - ${job.client}`}
      style={{
        ...style,
        borderLeftColor: technique?.color || undefined,
      }}
      className={cn(
        "p-3 rounded-lg border border-l-[3px] cursor-pointer transition-all duration-300",
        "bg-card/40 backdrop-blur-md border-border/40 shadow-sm",
        "hover:bg-card/70 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-1",
        "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "relative overflow-hidden group",
        isDragging && "opacity-50 shadow-2xl scale-105 z-50 ring-2 ring-primary",
        isSorting && "cursor-grabbing",
        isSelected && "ring-2 ring-primary bg-primary/10"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Background Glow Effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${technique?.color || 'var(--primary)'}, transparent 70%)` }}
      />
      {/* Top row: grip + priority + aging + technique */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(job.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
          )}
          <div
            {...attributes}
            {...listeners}
            role="button"
            tabIndex={-1}
            aria-label="Arrastar job"
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </div>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 gap-0.5 font-black uppercase tracking-widest", priority.color)}>
            <PriorityIcon className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">{priority.label}</span>
          </Badge>
          {/* Aging dot */}
          <div className="flex items-center gap-1" title={`Há ${aging.label} neste status`}>
            <div className={`w-2 h-2 rounded-full ${aging.dot}`} />
            <span className={`text-[10px] ${aging.color}`}>{aging.label}</span>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-black tracking-tighter shrink-0 border-2"
          style={{
            borderColor: technique?.color,
            color: technique?.color,
            backgroundColor: `${technique?.color}10`
          }}
        >
          {technique?.name || 'N/A'}
        </Badge>
      </div>

      {/* Client + Product */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-black text-sm text-foreground truncate group-hover:text-primary transition-colors tracking-tight uppercase">{job.client}</p>
        <p className="text-[10px] leading-relaxed font-medium text-muted-foreground line-clamp-2 h-7 italic opacity-80">{job.product}</p>
      </div>

      {/* Progress bar */}
      {job.produced_quantity != null && job.quantity > 0 && job.status !== 'finished' && (
        <div className="mb-3 bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="font-black text-primary/80 tracking-widest uppercase">{job.produced_quantity?.toLocaleString()} / {job.quantity.toLocaleString()} PCS</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 leading-none font-black border-primary/40 bg-primary/10 text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">{progress}%</Badge>
          </div>
          <Progress value={progress} className="h-1.5 bg-black/40 rounded-full overflow-hidden" />
        </div>
      )}

      {/* OS + qty */}
      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground bg-muted/20 px-2 py-1 rounded border border-border/10">
        <span className="font-mono text-primary/80">OS {job.order_number}</span>
        {!job.produced_quantity && <span>{job.quantity.toLocaleString()} pçs</span>}
      </div>

      {/* Date + machine */}
      {(job.scheduled_date || machine) && (
        <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {job.scheduled_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseDateOnly(job.scheduled_date) ?? new Date(), "dd/MM", { locale: ptBR })}
              {job.start_time && <span>{job.start_time}</span>}
            </span>
          )}
          {machine && (
            <span className="truncate">📍 {machine.name}</span>
          )}
        </div>
      )}

      {/* Stock warning */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0) && job.status !== 'finished' && (
        <div className="mt-2 flex flex-wrap gap-1">
          {outOfStockItems.map(item => (
            <Badge key={item} variant="destructive" className="text-[8px] px-1 py-0 h-4 font-black uppercase">
              SEM {item}
            </Badge>
          ))}
          {outOfStockItems.length === 0 && lowStockItems.map(item => (
            <Badge key={item} variant="outline" className="text-[8px] px-1 py-0 h-4 font-black uppercase bg-warning/10 text-warning border-warning/30">
              BAIXO {item}
            </Badge>
          ))}
        </div>
      )}

      {/* Quick actions on hover */}
      {onQuickAction && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          {job.status === 'scheduled' && (
            <Button
              size="icon" variant="ghost"
              className="h-6 w-6"
              title="Iniciar produção"
              onClick={(e) => { e.stopPropagation(); onQuickAction(job.id, 'start'); }}
            >
              <Play className="h-3 w-3 text-green-400" />
            </Button>
          )}
          {job.status === 'production' && (
            <>
              <Button
                size="icon" variant="ghost"
                className="h-6 w-6"
                title="Pausar"
                onClick={(e) => { e.stopPropagation(); onQuickAction(job.id, 'pause'); }}
              >
                <Pause className="h-3 w-3 text-orange-400" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-6 w-6"
                title="Finalizar"
                onClick={(e) => { e.stopPropagation(); onQuickAction(job.id, 'finish'); }}
              >
                <CheckCircle2 className="h-3 w-3 text-green-400" />
              </Button>
            </>
          )}
          {job.status === 'paused' && (
            <Button
              size="icon" variant="ghost"
              className="h-6 w-6"
              title="Retomar"
              onClick={(e) => { e.stopPropagation(); onQuickAction(job.id, 'resume'); }}
            >
              <Play className="h-3 w-3 text-cyan-400" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
