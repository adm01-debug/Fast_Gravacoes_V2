import { memo, useMemo, useState, useCallback } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Clock, MapPin, Package, User, ChevronRight, AlertCircle, Play, Pause, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DbJob } from '@/features/jobs';
import { JobStatus } from '@/types/scheduling';
import { HoverLift } from '@/components/ui/micro-interactions';
import { useIsMobile } from '@/hooks/use-device';

import { JobQuickActions } from './JobQuickActions';

interface AgendaViewProps {
  jobs: DbJob[];
  machines: Array<{ id: string; code: string; name: string; technique_id: string }>;
  techniques: Array<{ id: string; name: string; short_name: string; color: string }>;
  selectedDate: Date;
  onJobClick: (job: DbJob) => void;
  onStatusChange?: (jobId: string, newStatus: JobStatus) => void;
}

const statusConfig: Record<JobStatus, { label: string; color: string; bgColor: string }> = {
  queue: { label: 'Na Fila', color: 'text-status-queue', bgColor: 'bg-status-queue/15' },
  ready: { label: 'No Jeito', color: 'text-status-ready', bgColor: 'bg-status-ready/15' },
  scheduled: { label: 'Agendado', color: 'text-status-scheduled', bgColor: 'bg-status-scheduled/15' },
  production: { label: 'Produzindo', color: 'text-status-production', bgColor: 'bg-status-production/15' },
  finished: { label: 'Finalizado', color: 'text-status-finished', bgColor: 'bg-status-finished/15' },
  paused: { label: 'Pausado', color: 'text-status-paused', bgColor: 'bg-status-paused/15' },
  cancelled: { label: 'Cancelado', color: 'text-status-cancelled', bgColor: 'bg-status-cancelled/15' },
  delayed: { label: 'Atrasado', color: 'text-status-delayed', bgColor: 'bg-status-delayed/15' },
  rework: { label: 'Retrabalho', color: 'text-status-rework', bgColor: 'bg-status-rework/15' },
  buffer: { label: 'Buffer', color: 'text-indigo-500', bgColor: 'bg-indigo-500/15' },
  packaging: { label: 'Embalagem', color: 'text-cyan-500', bgColor: 'bg-cyan-500/15' },
};

interface JobCardProps {
  job: DbJob;
  machine?: { id: string; code: string; name: string; technique_id: string };
  technique?: { id: string; name: string; short_name: string; color: string };
  onClick: () => void;
  onStatusChange?: (jobId: string, newStatus: JobStatus) => void;
  index: number;
}

const JobCard = memo(function JobCard({ job, machine, technique, onClick, onStatusChange, index }: JobCardProps) {
  const status = statusConfig[job.status as JobStatus] || statusConfig.scheduled;
  const isCurrentlyProducing = job.status === 'production';
  const isDelayed = job.status === 'delayed';
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const handleStatusChange = useCallback((jobId: string, newStatus: JobStatus) => {
    onStatusChange?.(jobId, newStatus);
  }, [onStatusChange]);

  const cardContent = (
    <Card
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Job ${job.order_number} - ${job.client} - ${status.label}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        "cursor-pointer transition-all duration-fast border-l-4 group relative",
        "hover:shadow-lg active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isCurrentlyProducing && "border-l-status-production animate-pulse-subtle",
        isDelayed && "border-l-status-delayed",
        !isCurrentlyProducing && !isDelayed && "border-l-border/50"
      )}
      style={{
        borderLeftColor: isCurrentlyProducing
          ? undefined
          : isDelayed
            ? undefined
            : technique?.color
      }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with Quick Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {job.order_number.replace('OS-2024-', '#')}
              </h3>
              {isDelayed && (
                <AlertCircle className="w-4 h-4 text-status-delayed shrink-0" aria-label="Job atrasado" />
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{job.client}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Actions - visible on hover (desktop) or always (mobile) */}
            <AnimatePresence>
              {(isHovered || isMobile) && onStatusChange && (
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <JobQuickActions
                    jobId={job.id}
                    currentStatus={job.status as JobStatus}
                    onStatusChange={handleStatusChange}
                    isExpanded={isHovered}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Badge
              variant="outline"
              className={cn("shrink-0 text-xs", status.color, status.bgColor)}
            >
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Product */}
        <p className="text-sm font-medium text-foreground/90 line-clamp-2">
          {job.product}
        </p>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Time */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {job.start_time || '00:00'} - {job.end_time || '00:00'}
            </span>
          </div>

          {/* Machine */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{machine?.code || 'N/A'}</span>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{job.quantity.toLocaleString('pt-BR')} pçs</span>
          </div>

          {/* Technique */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: technique?.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {technique?.short_name || 'N/A'}
            </span>
          </div>
        </div>

        {/* Color badge if present */}
        {job.gravure_color && (
          <div className="flex items-center gap-1.5 text-xs">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground">Cor: {job.gravure_color}</span>
          </div>
        )}

        {/* Tap indicator */}
        <div className="flex items-center justify-end text-xs text-muted-foreground/50 group-hover:text-primary transition-colors">
          <span className="mr-1">Ver detalhes</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <HoverLift lift={3} shadow={!isMobile}>
        {cardContent}
      </HoverLift>
    </motion.div>
  );
});

export const AgendaView = memo(function AgendaView({
  jobs,
  machines,
  techniques,
  selectedDate,
  onJobClick,
  onStatusChange
}: AgendaViewProps) {
  // Sort jobs by start time
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const timeA = a.start_time || '23:59';
      const timeB = b.start_time || '23:59';
      return timeA.localeCompare(timeB);
    });
  }, [jobs]);

  // Group jobs by time period
  const groupedJobs = useMemo(() => {
    const morning: DbJob[] = [];
    const afternoon: DbJob[] = [];
    const evening: DbJob[] = [];

    sortedJobs.forEach(job => {
      const hour = parseInt(job.start_time?.split(':')[0] || '12', 10);
      if (hour < 12) {
        morning.push(job);
      } else if (hour < 18) {
        afternoon.push(job);
      } else {
        evening.push(job);
      }
    });

    return { morning, afternoon, evening };
  }, [sortedJobs]);

  const getMachine = (machineId: string | null) =>
    machines.find(m => m.id === machineId);

  const getTechnique = (techniqueId: string) =>
    techniques.find(t => t.id === techniqueId);

  const renderSection = (title: string, sectionJobs: DbJob[], startIndex: number) => {
    if (sectionJobs.length === 0) return null;

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {title} ({sectionJobs.length})
        </h2>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sectionJobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                machine={getMachine(job.machine_id)}
                technique={getTechnique(job.technique_id)}
                onClick={() => onJobClick(job)}
                onStatusChange={onStatusChange}
                index={startIndex + index}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // Empty state
  if (jobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 px-4 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum agendamento
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Não há jobs agendados para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}.
          {isToday(selectedDate) && ' Que tal criar um novo agendamento?'}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 pb-4" role="list" aria-label="Lista de agendamentos">
      {renderSection('🌅 Manhã', groupedJobs.morning, 0)}
      {renderSection('☀️ Tarde', groupedJobs.afternoon, groupedJobs.morning.length)}
      {renderSection('🌙 Noite', groupedJobs.evening, groupedJobs.morning.length + groupedJobs.afternoon.length)}
    </div>
  );
});
