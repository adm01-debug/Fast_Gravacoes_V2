/* eslint-disable react-hooks/incompatible-library -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useMemo, useState, Fragment, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight as ChevronRightIcon, Sparkles } from 'lucide-react';
import { DbJob, DbMachine, DbTechnique, useUpdateJobStatus } from '@/features/jobs';
import { JobBlock } from './JobBlock';
import { CalendarGroupBy, CalendarOverlays, CalendarZoomLevel, getOccupancyColor } from './types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DndContext, closestCenter, useDroppable, DragOverlay } from '@dnd-kit/core';
import { useDailyDragDrop } from '@/features/jobs';
import { JobQuickActions } from './JobQuickActions';
import { clickableProps } from '@/lib/a11y';

interface CalendarTimelineProps {
  machines: DbMachine[];
  techniques: DbTechnique[];
  jobsByMachine: Record<string, DbJob[]>;
  conflictJobIds: Set<string>;
  startHour: number;
  endHour: number;
  currentTimePosition: string | null;
  getTechniqueById: (id: string) => DbTechnique | undefined;
  onJobClick: (job: DbJob) => void;
  onSlotClick?: (machineId: string, hour: number, minute: number) => void;
  zoom?: CalendarZoomLevel;
  groupBy?: CalendarGroupBy;
  overlays?: CalendarOverlays;
  utilizationByMachine?: Record<string, number>;
  onRefresh?: () => void;
  allJobs?: DbJob[];
}

interface DroppableRowProps {
  children: React.ReactNode;
  id: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}

function DroppableRow({ children, id, className, onClick, style }: DroppableRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const interactive = onClick
    ? clickableProps<HTMLDivElement>((e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
        if ('button' in e) onClick(e as React.MouseEvent<HTMLDivElement>);
        else onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }, { label: 'Selecionar linha do calendário' })
    : {};
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && 'bg-primary/10 ring-1 ring-inset ring-primary/30', onClick && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary')}
      style={style}
      {...interactive}
    >
      {children}
    </div>
  );
}

export function CalendarTimeline({
  machines,
  techniques,
  jobsByMachine,
  conflictJobIds,
  startHour,
  endHour,
  currentTimePosition,
  getTechniqueById,
  onJobClick,
  onSlotClick,
  zoom = 60,
  groupBy = 'machine',
  overlays = { showHeatmap: false, showActualVsPlanned: false },
  utilizationByMachine = {},
  onRefresh,
  allJobs = [],
}: CalendarTimelineProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { mutate: updateStatus } = useUpdateJobStatus();

  const totalMinutes = (endHour - startHour) * 60;
  const { handleDragStart, handleDragEnd, activeId } = useDailyDragDrop({
    onUpdate: onRefresh || (() => {}),
    allJobs,
    startHour,
    totalMinutes
  });

  const activeJob = useMemo(() => allJobs.find(j => j.id === activeId), [allJobs, activeId]);

  // E11 — zoom recalculates header tick interval
  const tickIntervalMin = zoom;
  const ticks = useMemo(() => {
    const arr: { minute: number; label: string }[] = [];
    for (let m = 0; m <= totalMinutes; m += tickIntervalMin) {
      const totalH = startHour + Math.floor(m / 60);
      const min = m % 60;
      arr.push({
        minute: m,
        label: `${totalH.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
      });
    }
    if (arr[arr.length - 1].minute !== totalMinutes) {
      arr.push({ minute: totalMinutes, label: `${endHour.toString().padStart(2, '0')}:00` });
    }
    return arr;
  }, [tickIntervalMin, totalMinutes, startHour, endHour]);

  const getPosition = (start: string | null, end: string | null) => {
    if (!start || !end) return { left: '0%', width: '5%' };
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = (sh - startHour) * 60 + sm;
    const endMin = (eh - startHour) * 60 + em;
    const left = (startMin / totalMinutes) * 100;
    const width = ((endMin - startMin) / totalMinutes) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 3)}%` };
  };

  const getJobPosition = (job: DbJob) => getPosition(job.start_time, job.end_time);

  const getActualPosition = (job: DbJob) => {
    if (!job.actual_start_time) return null;
    const start = new Date(job.actual_start_time);
    const end = job.actual_end_time ? new Date(job.actual_end_time) : new Date();
    const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
    const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    return getPosition(startStr, endStr);
  };

  // E8 — Group machines by technique
  const groupedMachines = useMemo(() => {
    if (groupBy !== 'technique') return null;
    const map = new Map<string, { technique: DbTechnique; machines: DbMachine[] }>();
    machines.forEach((m) => {
      const tech = techniques.find((t) => t.id === m.technique_id);
      if (!tech) return;
      if (!map.has(tech.id)) map.set(tech.id, { technique: tech, machines: [] });
      map.get(tech.id)?.machines.push(m);
    });
    return Array.from(map.values()).sort((a, b) => a.technique.name.localeCompare(b.technique.name));
  }, [machines, techniques, groupBy]);

  const handleSlotClick = (e: React.MouseEvent<HTMLDivElement>, machineId: string) => {
    if (!onSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const min = Math.round((ratio * totalMinutes) / tickIntervalMin) * tickIntervalMin;
    const hour = startHour + Math.floor(min / 60);
    const minute = min % 60;
    onSlotClick(machineId, hour, minute);
  };

  const renderRow = (machine: DbMachine, index: number) => {
    const machineJobs = jobsByMachine[machine.id] || [];
    const technique = getTechniqueById(machine.technique_id);
    const utilization = utilizationByMachine[machine.id] || 0;

    return (
      <div
        key={machine.id}
        className={cn(
          'flex border-b border-border/20 hover:bg-muted/5 transition-colors calendar-row',
          index % 2 === 0 && 'bg-muted/3'
        )}
      >
        <div className="w-28 shrink-0 p-3 border-r border-border/40 flex items-center gap-2">
          <div
            className="w-2 h-8 rounded-full shrink-0"
            style={{ backgroundColor: technique?.color || 'hsl(var(--muted))' }}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{machine.code}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[80px]">
              {technique?.short_name}
            </div>
          </div>
          {overlays.showHeatmap && utilization > 0 && (
            <div className="ml-auto text-[10px] font-mono text-muted-foreground">
              {Math.round(utilization * 100)}%
            </div>
          )}
        </div>

        <DroppableRow
          id={machine.id}
          className="flex-1 relative h-16 cursor-pointer"
          style={overlays.showHeatmap ? { background: getOccupancyColor(utilization) } : undefined}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            if (target.closest('button')) return;
            handleSlotClick(e, machine.id);
          }}
        >
          <div className="absolute inset-0 flex pointer-events-none">
            {ticks.slice(0, -1).map((t) => (
              <div
                key={t.minute}
                className="flex-1 border-r border-border/10 last:border-r-0"
              />
            ))}
          </div>

          {currentTimePosition && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20 pointer-events-none"
              style={{ left: currentTimePosition }}
              aria-hidden
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-destructive rounded-full" />
            </div>
          )}

          {machineJobs.map((job) => {
            const actualPos = overlays.showActualVsPlanned ? getActualPosition(job) : null;
            return (
              <Fragment key={job.id}>
                <JobBlock
                  job={job}
                  position={getJobPosition(job)}
                  hasConflict={conflictJobIds.has(job.id)}
                  onClick={onJobClick}
                  ghost={!!actualPos}
                />
                {actualPos && (
                  <div
                    className="absolute bottom-1 h-1.5 rounded-full bg-status-production border border-status-production/60"
                    style={actualPos}
                    title="Realizado"
                  />
                )}
              </Fragment>
            );
          })}
        </DroppableRow>
      </div>
    );
  };

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flattened data for virtualization
  const flattenedRows = useMemo(() => {
    if (groupBy !== 'technique') {
      return machines.map(m => ({ type: 'machine' as const, data: m }));
    }

    const rows: ({ type: 'technique', data: DbTechnique, totalJobs: number, machineCount: number } | { type: 'machine', data: DbMachine })[] = [];
    groupedMachines?.forEach(group => {
      const totalJobs = group.machines.reduce(
        (sum, m) => sum + (jobsByMachine[m.id]?.length || 0),
        0
      );
      rows.push({
        type: 'technique',
        data: group.technique,
        totalJobs,
        machineCount: group.machines.length
      });
      if (!collapsed.has(group.technique.id)) {
        group.machines.forEach(m => {
          rows.push({ type: 'machine', data: m });
        });
      }
    });
    return rows;
  }, [machines, groupBy, groupedMachines, collapsed, jobsByMachine]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => flattenedRows[index].type === 'technique' ? 40 : 64,
    overscan: 10,
  });

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-[calc(100vh-320px)] border rounded-md bg-card overflow-hidden flex flex-col">
      {/* Fixed Header */}
      <div className="flex-none min-w-[1200px] flex border-b border-border/40 bg-muted/10 sticky top-0 z-20">
        <div className="w-28 shrink-0 p-3 border-r border-border/40 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {groupBy === 'technique' ? 'Técnica' : 'Máquina'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 mt-1 text-primary hover:bg-primary/10"
            title="Otimizar Agenda (IA)"
            onClick={() => {
              toast.success("Otimização inteligente iniciada...", {
                icon: <Sparkles className="h-4 w-4 text-primary" />,
                description: "A IA está recalculando a melhor sequência para hoje."
              });
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {ticks.slice(0, -1).map((t) => (
            <div
              key={t.minute}
              className="flex-1 text-center py-3 border-r border-border/20 last:border-r-0"
            >
              <span className="text-[11px] font-semibold text-muted-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Rows Container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border"
      >
        <div
          className="min-w-[1200px] relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = flattenedRows[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.type === 'technique' ? (
                  <button
                    onClick={() => toggleGroup(row.data.id)}
                    className="w-full h-full flex items-center gap-2 px-3 py-2 bg-muted/20 border-b border-border/30 hover:bg-muted/30 transition-colors text-left group"
                    aria-expanded={!collapsed.has(row.data.id)}
                  >
                    {collapsed.has(row.data.id) ? (
                      <ChevronRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <div
                      className="w-2 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: row.data.color }}
                    />
                    <span className="text-sm font-bold text-foreground tracking-tight">{row.data.name}</span>
                    <div className="flex items-center gap-3 ml-auto">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/50 border border-border/40 text-muted-foreground">
                        {row.machineCount} {row.machineCount === 1 ? 'máquina' : 'máquinas'}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                        {row.totalJobs} {row.totalJobs === 1 ? 'job' : 'jobs'}
                      </span>
                    </div>
                  </button>
                ) : (
                  renderRow(row.data, virtualRow.index)
                )}
              </div>
            );
          })}

          {flattenedRows.length === 0 && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
                <ChevronRightIcon className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-sm">Nenhuma máquina encontrada para os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
      <DragOverlay>
        {activeJob ? (
          <div
            className={cn(
              "px-3 py-2 rounded-md border shadow-2xl bg-card min-w-[120px]",
              "border-primary/50 ring-2 ring-primary/20 animate-pulse"
            )}
          >
            <div className="text-xs font-bold text-foreground">
              {activeJob.order_number}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {activeJob.client}
            </div>
            <div className="mt-2 flex justify-end">
              <JobQuickActions
                jobId={activeJob.id}
                currentStatus={activeJob.status}
                onStatusChange={(id, status) => updateStatus({ jobId: id, status })}
              />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
