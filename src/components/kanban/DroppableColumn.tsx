/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { DbJob, DbTechnique, DbMachine } from '@/features/jobs';
import { JobStatus } from '@/types/scheduling';
import { DraggableJobCard } from './DraggableJobCard';
import { useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Clock, Activity } from 'lucide-react';
import { ViewMode } from './KanbanFiltersBar';
import { useMTBFMTTR } from '@/features/production';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DroppableColumnProps {
  status: JobStatus;
  label: string;
  icon: React.ElementType;
  color: string;
  jobs: DbJob[];
  getTechniqueById: (id: string) => DbTechnique | undefined;
  getMachineById: (id: string) => DbMachine | undefined;
  onJobClick: (job: DbJob) => void;
  wipLimit?: number;
  viewMode?: ViewMode;
  selectedJobs?: Set<string>;
  onSelectJob?: (id: string) => void;
  onQuickAction?: (jobId: string, action: string) => void;
}

const priorityOrder: Record<string, number> = {
  'urgent': 4,
  'high': 3,
  'medium': 2,
  'low': 1,
};

const statusOrder: Record<JobStatus, number> = {
  'rework': 0,
  'delayed': 1,
  'paused': 2,
  'queue': 3,
  'ready': 4,
  'scheduled': 5,
  'production': 6,
  'finished': 7,
  'cancelled': 8,
  'buffer': 9,
  'packaging': 10,
};

const WIP_LIMITS: Record<string, number> = {
  'queue': 25,
  'ready': 12,
  'scheduled': 15,
  'production': 10,
  'finished': 100,
  'paused': 8,
  'delayed': 8,
  'rework': 5,
};

export function DroppableColumn({
  status, label, icon: Icon, color, jobs,
  getTechniqueById, getMachineById, onJobClick,
  wipLimit, viewMode = 'expanded',
  selectedJobs, onSelectJob, onQuickAction,
}: DroppableColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [thresholds, setThresholds] = useState({ bottleneckRiskMinutes: 480 });
  const [entityThresholds, setEntityThresholds] = useState<Record<string, number>>({});
  const { metrics: reliabilityMetrics } = useMTBFMTTR(30);

  useEffect(() => {
    const stored = localStorage.getItem('alert-thresholds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.bottleneckRiskMinutes) {
          setThresholds({ bottleneckRiskMinutes: parsed.bottleneckRiskMinutes });
        }
      } catch {
        // Configuração corrompida no localStorage: mantém os limites padrão.
      }
        }
        const entityStored = localStorage.getItem('entity-thresholds');
        if (entityStored) {
          try { setEntityThresholds(JSON.parse(entityStored)); } catch { /* corrupted */ }
        }
  }, []);

  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'column', status }
  });

  const effectiveWipLimit = wipLimit ?? WIP_LIMITS[status] ?? 20;
  const isOverWip = jobs.length > effectiveWipLimit;
  const wipPercentage = Math.min(100, (jobs.length / effectiveWipLimit) * 100);

  const totalEstimatedTime = useMemo(() => {
    return jobs.reduce((acc, job) => acc + (job.estimated_duration || 0), 0);
  }, [jobs]);

  const leadTimeLabel = useMemo(() => {
    if (totalEstimatedTime === 0) return null;
    const hours = Math.floor(totalEstimatedTime / 60);
    const mins = totalEstimatedTime % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [totalEstimatedTime]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      // 1. Status severity (exceptions first if in the same column)
      const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (statusDiff !== 0) return statusDiff;

      // 2. Manual Sort Order (if available)
      if (a.sort_order !== null && b.sort_order !== null) {
        const manualDiff = a.sort_order - b.sort_order;
        if (manualDiff !== 0) return manualDiff;
      }

      // 3. Priority (High to Low) - Fallback if manual order is same or null
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // 4. Date (Ascending - closer first)
      if (a.scheduled_date && b.scheduled_date) {
        const dateDiff = (parseDateOnly(a.scheduled_date)?.getTime() ?? 0) - (parseDateOnly(b.scheduled_date)?.getTime() ?? 0);
        if (dateDiff !== 0) return dateDiff;
      }
      if (a.scheduled_date) return -1;
      if (b.scheduled_date) return 1;

      // 5. Creation (Newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [jobs]);

  const jobIds = sortedJobs.map(job => job.id);

  const criticalMachinesInColumn = useMemo(() => {
    const machineIds = new Set(jobs.map(j => j.machine_id).filter(Boolean));
    return reliabilityMetrics.filter(m =>
      machineIds.has(m.machineId) &&
      (m.reliabilityScore === 'critical' || m.reliabilityScore === 'poor')
    );
  }, [jobs, reliabilityMetrics]);

  // Determine the bottleneck limit for this specific column if applicable
  // For columns that represent a technique or machine, we could look it up.
  // In the general Kanban view, status is the ID.
  const columnLimit = useMemo(() => {
    // Check if any machine in this column has a specific threshold
    const machineWithThreshold = jobs.map(j => j.machine_id).find(id => id && entityThresholds[id]);
    if (machineWithThreshold) return entityThresholds[machineWithThreshold];

    // Check if any technique in this column has a specific threshold
    const techniqueWithThreshold = jobs.map(j => j.technique_id).find(id => id && entityThresholds[id]);
    if (techniqueWithThreshold) return entityThresholds[techniqueWithThreshold];

    return thresholds.bottleneckRiskMinutes;
  }, [jobs, entityThresholds, thresholds.bottleneckRiskMinutes]);

  return (
    <div className={cn(
      "flex flex-col group/column transition-all duration-300",
      viewMode === 'compact' ? 'min-w-[300px] sm:min-w-[400px]' : 'min-w-[240px] sm:min-w-[280px] max-w-[320px]'
    )}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 hover:bg-primary/10"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
        <div className={cn("p-1 rounded-md bg-card border border-border/50 shadow-sm", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-sm tracking-tight">{label}</h3>
        <Badge
          variant={isOverWip ? "destructive" : "secondary"}
          className={cn(
            "ml-auto text-xs font-mono",
            isOverWip && "animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          )}
        >
          {jobs.length}
          {effectiveWipLimit < 50 && <span className="text-[9px] opacity-70 ml-1">/{effectiveWipLimit}</span>}
        </Badge>
        {isOverWip && <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-bounce" />}
        {criticalMachinesInColumn.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center bg-red-500/10 p-1 rounded-full animate-pulse border border-red-500/20 cursor-help">
                  <Activity className="h-3 w-3 text-red-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-red-950 border-red-500 text-red-100">
                <p className="font-bold text-[10px] mb-1">RISCO DE QUEBRA</p>
                <p className="text-[9px]">Máquinas críticas nesta coluna:</p>
                <ul className="list-disc list-inside text-[9px] mt-1">
                  {criticalMachinesInColumn.map(m => (
                    <li key={m.machineId}>{m.machineName} ({m.reliabilityScore})</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {leadTimeLabel && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/50 ml-1" title="Tempo total estimado para processar esta coluna">
            <Clock className="h-3 w-3 text-primary/70" />
            {leadTimeLabel}
          </div>
        )}
      </div>

      {/* Bottleneck Risk Indicator */}
      {totalEstimatedTime > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-1.5 mb-2 px-1 cursor-help group/risk">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <Activity className={cn(
                    "h-3 w-3",
                    totalEstimatedTime > columnLimit ? "text-red-500 animate-pulse" :
                    totalEstimatedTime > columnLimit * 0.7 ? "text-orange-500" : "text-success"
                  )} />
                  <span className={cn(
                    totalEstimatedTime > columnLimit ? "text-red-500" :
                    totalEstimatedTime > columnLimit * 0.7 ? "text-orange-500" : "text-success"
                  )}>
                    Risco de Gargalo: {totalEstimatedTime > columnLimit ? "Crítico" : totalEstimatedTime > columnLimit * 0.7 ? "Moderado" : "Baixo"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-auto text-[8px] h-4 px-1.5 leading-none font-bold border-2",
                      totalEstimatedTime > columnLimit ? "border-red-500 text-red-500 bg-red-500/10 animate-pulse" :
                      totalEstimatedTime > columnLimit * 0.7 ? "border-orange-500 text-orange-500 bg-orange-500/10" :
                      "border-success text-success bg-success/10"
                    )}
                  >
                    {totalEstimatedTime > columnLimit ? "GARGALO" : totalEstimatedTime > columnLimit * 0.7 ? "ATENÇÃO" : "ESTÁVEL"}
                  </Badge>
                </div>
                {totalEstimatedTime > columnLimit && (
                  <div className="text-[9px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1 mt-0.5 animate-in fade-in slide-in-from-top-1 shadow-[0_0_15px_rgba(239,68,68,0.1)] group-hover/risk:bg-red-500/20 transition-colors">
                    CAPACIDADE EXCEDIDA: Recomenda-se balancear carga ou priorizar jobs críticos.
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border-border p-3 shadow-xl">
              <div className="space-y-2">
                <p className="text-xs font-bold flex items-center gap-2">
                  <Activity className="h-3 w-3 text-primary" />
                  Análise de Fluxo da Coluna
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 p-2 rounded-md">
                    <p className="text-[9px] text-muted-foreground uppercase">Carga Total</p>
                    <p className="text-xs font-mono font-bold">{totalEstimatedTime} min</p>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-md">
                    <p className="text-[9px] text-muted-foreground uppercase">Limite Alerta</p>
                    <p className="text-xs font-mono font-bold">{columnLimit} min</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase">Status da Capacidade</p>
                  <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        totalEstimatedTime > columnLimit ? "bg-red-500" :
                        totalEstimatedTime > columnLimit * 0.7 ? "bg-orange-500" : "bg-success"
                      )}
                      style={{ width: `${Math.min(100, (totalEstimatedTime / columnLimit) * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  {totalEstimatedTime > columnLimit
                    ? "Esta coluna representa um gargalo crítico. O tempo de processamento excede a disponibilidade estimada."
                    : totalEstimatedTime > columnLimit * 0.7
                      ? "Capacidade em nível de atenção. Monitore novos agendamentos para evitar saturação."
                      : "Fluxo saudável. A capacidade instalada suporta a carga atual sem riscos imediatos."}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* WIP indicator bar */}
      {effectiveWipLimit < 50 && (
        <div className="h-1 mx-1 mb-2 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              wipPercentage > 100 ? "bg-destructive" :
              wipPercentage > 80 ? "bg-orange-400" : "bg-primary/60"
            )}
            style={{ width: `${Math.min(100, wipPercentage)}%` }}
          />
        </div>
      )}

      {/* Collapsed state */}
      {isCollapsed ? (
        <div
          ref={setNodeRef}
          role="button"
          tabIndex={0}
          aria-label={`Expandir coluna ${label}`}
          className={cn(
            "flex items-center justify-center h-12 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "bg-muted/10 border-border/30 text-xs text-muted-foreground cursor-pointer",
            isOver && "border-primary/50 bg-primary/5"
          )}
          onClick={() => setIsCollapsed(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsCollapsed(false); } }}
        >
          {jobs.length} jobs • Clique para expandir
        </div>
      ) : (
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 p-2 rounded-xl border transition-all duration-300",
            "bg-gradient-to-b from-muted/30 to-card/10 backdrop-blur-md shadow-inner",
            "space-y-1.5 min-h-[400px] max-h-[70vh] overflow-y-auto scrollbar-thin",
            "group-hover/column:border-border/60",
            isOver
              ? "border-primary/50 bg-primary/10 ring-4 ring-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
              : isOverWip
                ? "border-destructive/40 bg-destructive/5"
                : "border-border/30"
          )}
        >
          <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
            {sortedJobs.length === 0 ? (
              <div className={cn(
                "flex items-center justify-center h-20 text-xs text-muted-foreground",
                "border-2 border-dashed rounded-lg transition-colors",
                isOver ? "border-primary/50 bg-primary/10" : "border-transparent"
              )}>
                {isOver ? "Soltar aqui" : "Nenhum job"}
              </div>
            ) : (
              sortedJobs.map((job) => (
                <DraggableJobCard
                  key={job.id}
                  job={job}
                  technique={getTechniqueById(job.technique_id)}
                  machine={job.machine_id ? getMachineById(job.machine_id) ?? null : null}
                  onClick={() => onJobClick(job)}
                  viewMode={viewMode}
                  isSelected={selectedJobs?.has(job.id)}
                  onSelect={onSelectJob}
                  onQuickAction={onQuickAction}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}
