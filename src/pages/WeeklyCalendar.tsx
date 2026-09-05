import { useState, useMemo, lazy, Suspense } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import { CalendarDays, AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
const CalendarHeader = lazy(() => import('@/components/calendar/CalendarHeader').then(m => ({ default: m.CalendarHeader })));
const UtilizationHeatmap = lazy(() => import('@/components/scheduling/UtilizationHeatmap').then(m => ({ default: m.UtilizationHeatmap })));
const CalendarFilters = lazy(() => import('@/components/calendar/CalendarFilters').then(m => ({ default: m.CalendarFilters })));
const CalendarToolbar = lazy(() => import('@/components/calendar/CalendarToolbar').then(m => ({ default: m.CalendarToolbar })));
import { JobQuickActions } from '@/components/calendar/JobQuickActions';
import { CalendarLegend } from '@/components/calendar/CalendarLegend';
import { CalendarEmptyState } from '@/components/calendar/CalendarEmptyState';
import { MobileFAB } from '@/components/calendar/MobileFAB';
import { statusColorsSolid, statusLabels } from '@/components/calendar/types';
import { cn } from '@/lib/utils';
import { useSchedulingData } from '@/features/jobs';
import { useUpdateJobStatus } from '@/features/jobs';
import { useCalendarFilters } from '@/hooks/useCalendarFilters';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import { useCalendarHotkeys } from '@/hooks/useCalendarHotkeys';
import { useSchedulingConflicts } from '@/features/jobs';
import { DbJob, DbMachine, DbTechnique } from '@/features/jobs';
import { JobStatus } from '@/types/scheduling';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useWeeklyDragDrop } from '@/features/jobs';
import { Fragment } from 'react';
import '@/components/calendar/calendar-print.css';

// Helper components for DnD
interface DraggableJobProps {
  job: DbJob;
  isConflict: boolean;
  onClick: () => void;
  statusColorsSolid: Record<JobStatus, string>;
  statusLabels: Record<JobStatus, string>;
  updateStatus: (args: { jobId: string; status: JobStatus }) => void;
}
function DraggableJob({ job, isConflict, onClick, statusColorsSolid, statusLabels, updateStatus }: DraggableJobProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn(isDragging && "opacity-50")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'w-full px-1.5 py-1 rounded text-xs font-medium truncate cursor-pointer text-left',
              'border transition-all duration-200 hover:scale-[1.02]',
              'focus:outline-none focus:ring-2 focus:ring-primary/40',
              statusColorsSolid[job.status as JobStatus],
              isConflict && 'ring-2 ring-destructive/70 motion-safe:animate-pulse'
            )}
          >
            <span className="text-white/90 inline-flex items-center gap-1">
              {isConflict && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
              {job.order_number.replace('OS-2024-', '')}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-card border-border/40 shadow-xl max-w-xs"
        >
          <div className="space-y-1.5">
            <div className="font-semibold text-foreground">
              {job.order_number}
            </div>
            <div className="text-sm text-muted-foreground">{job.client}</div>
            <div className="text-sm">{job.product}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {job.start_time || '00:00'} - {job.end_time || '00:00'}
              </span>
              <Badge variant="outline" className="text-xs">
                {statusLabels[job.status as JobStatus]}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {job.quantity.toLocaleString()} peças
            </div>
            {isConflict && (
              <div className="flex items-center gap-1 text-xs text-destructive font-medium pt-1 border-t border-border/40">
                <AlertTriangle className="w-3 h-3" />
                Conflito de horário
              </div>
            )}
            <div className="pt-2 border-t border-border/40 mt-2 flex justify-end">
              <JobQuickActions
                jobId={job.id}
                currentStatus={job.status as JobStatus}
                onStatusChange={(id, status) => updateStatus({ jobId: id, status })}
              />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface DroppableCellProps {
  children: React.ReactNode;
  id: string;
  isToday: boolean;
}
function DroppableCell({ children, id, isToday }: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-h-[60px] p-1 border-r border-border/10 last:border-r-0 transition-colors',
        isToday && 'bg-primary/5',
        isOver && 'bg-primary/20 ring-2 ring-primary/40'
      )}
    >
      {children}
    </div>
  );
}


export default function WeeklyCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { jobs, techniques, machines, getTechniqueById, refetchJobs } = useSchedulingData();
  const { handleDragStart, handleDragEnd, activeId } = useWeeklyDragDrop({ onUpdate: refetchJobs, allJobs: jobs });
  const activeJob = useMemo(() => jobs.find(j => j.id === activeId), [jobs, activeId]);
  const { mutate: updateStatus } = useUpdateJobStatus();
  const { conflicts } = useSchedulingConflicts();
  const { prefs, setZoom, setGroupBy, toggleOverlay } = useCalendarPreferences('weekly');

  useCalendarHotkeys({ selectedDate, onDateChange: setSelectedDate, scope: 'weekly' });
  const {
    filters,
    updateFilter,
    toggleArrayValue,
    clearFilters,
    activeCount,
    applyFilters,
  } = useCalendarFilters('weekly-calendar-filters-v1');

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekJobs = useMemo(() => {
    const filtered = applyFilters(jobs);
    return filtered.filter((job) => {
      const jobDate = parseDateOnly(job.scheduled_date);
      return !!jobDate && jobDate >= weekStart && jobDate <= weekEnd;
    });
  }, [jobs, weekStart, weekEnd, applyFilters]);

  const filteredMachines = useMemo(() => {
    let m = machines;
    if (filters.techniques.length) m = m.filter((x) => filters.techniques.includes(x.technique_id));
    if (filters.machines.length) m = m.filter((x) => filters.machines.includes(x.id));
    if (!filters.techniques.length && !filters.machines.length) m = m.slice(0, 20);
    return m;
  }, [machines, filters.techniques, filters.machines]);

  const groupedMachines = useMemo(() => {
    if (prefs.groupBy !== 'technique') return null;
    const map = new Map<string, { technique: DbTechnique; machines: DbMachine[] }>();
    filteredMachines.forEach((m) => {
      const tech = techniques.find((t) => t.id === m.technique_id);
      if (!tech) return;
      if (!map.has(tech.id)) map.set(tech.id, { technique: tech, machines: [] });
      map.get(tech.id)?.machines.push(m);
    });
    return Array.from(map.values()).sort((a, b) => a.technique.name.localeCompare(b.technique.name));
  }, [filteredMachines, techniques, prefs.groupBy]);

  const jobsByMachineAndDay = useMemo(() => {
    const grouped: Record<string, Record<string, DbJob[]>> = {};
    weekJobs.forEach((job) => {
      const jobDate = parseDateOnly(job.scheduled_date);
      if (!job.machine_id || !jobDate) return;
      if (!grouped[job.machine_id]) grouped[job.machine_id] = {};
      const dayKey = format(jobDate, 'yyyy-MM-dd');
      if (!grouped[job.machine_id][dayKey]) grouped[job.machine_id][dayKey] = [];
      grouped[job.machine_id][dayKey].push(job);
    });
    return grouped;
  }, [weekJobs]);

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const weekConflicts = useMemo(() => {
    return conflicts.filter((c) => c.date >= weekStart && c.date <= weekEnd);
  }, [conflicts, weekStart, weekEnd]);

  const conflictJobIds = useMemo(() => {
    const set = new Set<string>();
    weekConflicts.forEach((c) => c.jobs.forEach((j) => set.add(j.id)));
    return set;
  }, [weekConflicts]);

  // "AGORA" line position within today's column (visual marker)
  const todayIndex = weekDays.findIndex((d) => isToday(d));
  const nowMinuteRatio = useMemo(() => {
    if (todayIndex === -1) return null;
    const now = new Date();
    const minutes = (now.getHours() - 7) * 60 + now.getMinutes();
    const total = 14 * 60;
    if (minutes < 0 || minutes > total) return null;
    return minutes / total;
  }, [todayIndex]);

  const handleJobClick = (job: DbJob) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const renderRow = (machine: DbMachine, index: number) => {
    const technique = getTechniqueById(machine.technique_id);

    return (
      <div
        key={machine.id}
        className={cn(
          'flex border-b border-border/20 hover:bg-muted/5 transition-colors',
          index % 2 === 0 && 'bg-muted/3'
        )}
      >
        <div className="w-24 shrink-0 p-2 border-r border-border/40 flex items-center gap-2">
          <div
            className="w-1.5 h-10 rounded-full shrink-0"
            style={{ backgroundColor: technique?.color || 'hsl(var(--muted))' }}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{machine.code}</div>
            <div className="text-xs text-muted-foreground truncate">
              {technique?.short_name}
            </div>
          </div>
        </div>

        {weekDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayJobs = jobsByMachineAndDay[machine.id]?.[dayKey] || [];

          return (
            <DroppableCell key={day.toISOString()} id={`${machine.id}|${dayKey}`} isToday={isToday(day)}>
              <div className="flex flex-col gap-1">
                {dayJobs.slice(0, 3).map((job) => (
                  <DraggableJob
                    key={job.id}
                    job={job}
                    isConflict={conflictJobIds.has(job.id)}
                    onClick={() => handleJobClick(job)}
                    statusColorsSolid={statusColorsSolid}
                    statusLabels={statusLabels}
                    updateStatus={updateStatus}
                  />
                ))}
                {dayJobs.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center font-medium">
                    +{dayJobs.length - 3} jobs
                  </div>
                )}
              </div>
            </DroppableCell>
          );
        })}
      </div>
    );
  };

  return (
    <MainLayout>
      <JobDetailsModal job={selectedJob} open={isModalOpen} onOpenChange={setIsModalOpen} />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in-up calendar-print-area">
        <Breadcrumbs />

        <div className="space-y-4">
          <SectionErrorBoundary compact><Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
            <CalendarHeader
              title="Calendário Semanal"
              subtitle="Visualização panorâmica da semana por máquina"
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onPrev={() => setSelectedDate(subWeeks(selectedDate, 1))}
              onNext={() => setSelectedDate(addWeeks(selectedDate, 1))}
              onToday={() => setSelectedDate(new Date())}
              conflictCount={weekConflicts.length}
              jobCount={weekJobs.length}
              rangeLabel={`${format(weekStart, 'dd MMM', { locale: ptBR })} - ${format(weekEnd, 'dd MMM', { locale: ptBR })}`}
              todayLabel="Esta Semana"
              filtersSlot={
                <CalendarFilters
                  filters={filters}
                  jobs={jobs}
                  techniques={techniques}
                  machines={machines}
                  activeCount={activeCount}
                  onToggle={toggleArrayValue}
                  onUpdate={updateFilter}
                  onClear={clearFilters}
                />
              }
            />
          </Suspense></SectionErrorBoundary>

          <SectionErrorBoundary compact><Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-lg" />}>
            <CalendarToolbar
              zoom={prefs.zoom}
              onZoomChange={setZoom}
              groupBy={prefs.groupBy}
              onGroupByChange={setGroupBy}
              overlays={prefs.overlays}
              onToggleOverlay={toggleOverlay}
              onExportPdf={() => {}}
              onExportICal={() => {}}
              onShowOnboarding={() => {}}
            />
          </Suspense></SectionErrorBoundary>

          <SectionErrorBoundary compact><Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
            <Card className="p-3 bg-card/50 border-border/40">
               <UtilizationHeatmap jobs={weekJobs} machines={filteredMachines} />
            </Card>
          </Suspense></SectionErrorBoundary>
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Card className="bg-card border border-border/40 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-lg text-title gradient-text flex items-center gap-2">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="hidden sm:inline">
                  Semana {format(weekStart, 'ww', { locale: ptBR })} de {format(weekStart, 'yyyy')}
                </span>
                <span className="sm:hidden">
                  Sem. {format(weekStart, 'ww', { locale: ptBR })}/{format(weekStart, 'yyyy')}
                </span>
              </CardTitle>
              <Badge variant="outline" className="border-primary/30 text-primary w-fit">
                {weekJobs.length} agendamento{weekJobs.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="w-full h-[calc(100vh-320px)]">
              <div className="min-w-[1000px] relative">
                <div className="flex border-b border-border/40 bg-muted/5 sticky top-0 z-10">
                  <div className="w-24 shrink-0 p-3 border-r border-border/40">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {prefs.groupBy === 'technique' ? 'Técnica' : 'Máquina'}
                    </span>
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'flex-1 text-center py-3 border-r border-border/20 last:border-r-0 relative',
                        isToday(day) && 'bg-primary/5'
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground uppercase">
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div
                        className={cn(
                          'text-lg font-semibold mt-0.5',
                          isToday(day) ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {format(day, 'dd')}
                      </div>
                      {isToday(day) && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-destructive" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Today vertical "now" marker */}
                {todayIndex !== -1 && nowMinuteRatio !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-destructive/50 z-[5] pointer-events-none"
                    style={{
                      left: `calc(6rem + ((100% - 6rem) / 7) * ${todayIndex + nowMinuteRatio})`,
                    }}
                    aria-hidden
                  />
                )}

                {prefs.groupBy === 'technique' && groupedMachines ? (
                  groupedMachines.map((group) => {
                    const isCollapsed = collapsed.has(group.technique.id);
                    return (
                      <Fragment key={group.technique.id}>
                        <button
                          onClick={() => toggleGroup(group.technique.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-muted/10 border-b border-border/30 hover:bg-muted/20 transition-colors text-left"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div
                            className="w-2 h-4 rounded-full"
                            style={{ backgroundColor: group.technique.color }}
                          />
                          <span className="text-sm font-semibold">{group.technique.name}</span>
                        </button>
                        {!isCollapsed && group.machines.map((m, i) => renderRow(m, i))}
                      </Fragment>
                    );
                  })
                ) : (
                  filteredMachines.map((m, i) => renderRow(m, i))
                )}

                {filteredMachines.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    Nenhuma máquina encontrada para os filtros selecionados.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <DragOverlay>
          {activeId && activeJob ? (
            <div className={cn(
              'px-1.5 py-1 rounded text-xs font-medium border shadow-lg w-24',
              statusColorsSolid[activeJob.status as JobStatus]
            )}>
              {activeJob.order_number.replace('OS-2024-', '')}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CalendarLegend />
    </div>
    <MobileFAB />
  </MainLayout>
);
}
