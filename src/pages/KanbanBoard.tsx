import { useState, useMemo, useCallback, useEffect } from 'react';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { Skeleton } from '@/components/ui/skeleton';
import { DroppableColumn } from '@/components/kanban/DroppableColumn';
import { DragOverlayCard } from '@/components/kanban/DragOverlayCard';
import { KanbanMetricsBar } from '@/components/kanban/KanbanMetricsBar';
import { KanbanFiltersBar, ViewMode, SwimlanesMode } from '@/components/kanban/KanbanFiltersBar';
import { KanbanAIAdvisor } from '@/components/kanban/KanbanAIAdvisor';
import { SmartSequencingPanel } from '@/components/planning/SmartSequencingPanel';
import { LoadBalancingPanel } from '@/components/planning/LoadBalancingPanel';
import { PlanningEfficiencyDashboard } from '@/components/planning/PlanningEfficiencyDashboard';
import { StuckJobsPanel } from '@/components/scheduling/StuckJobsPanel';
import { CapacityHealthPanel } from '@/components/scheduling/CapacityHealthPanel';
import { useKanbanDragDrop } from '@/features/jobs';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
// Breadcrumbs removed - handled by MainLayout
import {
  Clock, Package, Calendar, Play, CheckCircle2,
  AlertTriangle, RotateCcw, Pause, Command, Trash2, ArrowRight,
  Sparkles
} from 'lucide-react';
import { useSchedulingData } from '@/features/jobs';
import { DbJob } from '@/features/jobs';
import { JobStatus, assertTransition, canTransition } from '@/features/jobs';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const statusColumns: { status: JobStatus; label: string; icon: React.ElementType; color: string; wipLimit?: number }[] = [
  { status: 'queue', label: 'Na Fila', icon: Clock, color: 'text-indicator-info', wipLimit: 25 },
  { status: 'ready', label: 'No Jeito', icon: Package, color: 'text-indicator-warning', wipLimit: 12 },
  { status: 'scheduled', label: 'Agendado', icon: Calendar, color: 'text-accent-purple', wipLimit: 15 },
  { status: 'production', label: 'Em Produção', icon: Play, color: 'text-accent-cyan', wipLimit: 10 },
  { status: 'finished', label: 'Finalizado', icon: CheckCircle2, color: 'text-indicator-success', wipLimit: 100 },
];

const exceptionStatuses: { status: JobStatus; label: string; icon: React.ElementType; color: string; wipLimit?: number }[] = [
  { status: 'paused', label: 'Pausado', icon: Pause, color: 'text-indicator-warning', wipLimit: 8 },
  { status: 'delayed', label: 'Atrasado', icon: AlertTriangle, color: 'text-indicator-danger', wipLimit: 8 },
  { status: 'rework', label: 'Retrabalho', icon: RotateCcw, color: 'text-accent-pink', wipLimit: 5 },
];

const quickActionMap: Record<string, { status: JobStatus; label: string }> = {
  'start': { status: 'production', label: 'Em Produção' },
  'pause': { status: 'paused', label: 'Pausado' },
  'finish': { status: 'finished', label: 'Finalizado' },
  'resume': { status: 'production', label: 'Em Produção' },
};

export default function KanbanBoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters (initialized from localStorage)
  const [searchTerm, setSearchTerm] = useState('');
  const safeGetItem = (key: string, fallback: string): string => {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  };
  const [selectedTechnique, setSelectedTechnique] = useState(() => safeGetItem('kanban-filter-technique', 'all'));
  const [selectedPriority, setSelectedPriority] = useState(() => safeGetItem('kanban-filter-priority', 'all'));
  const [selectedMachine, setSelectedMachine] = useState(() => safeGetItem('kanban-filter-machine', 'all'));
  const [viewMode, setViewMode] = useState<ViewMode>(() => safeGetItem('kanban-view-mode', 'expanded') as ViewMode);
  const [swimlanesMode, setSwimlanesMode] = useState<SwimlanesMode>(() => safeGetItem('kanban-swimlanes-mode', 'none') as SwimlanesMode);

  // Persist filters on change
  useEffect(() => {
    try {
      localStorage.setItem('kanban-filter-technique', selectedTechnique);
      localStorage.setItem('kanban-filter-priority', selectedPriority);
      localStorage.setItem('kanban-filter-machine', selectedMachine);
      localStorage.setItem('kanban-view-mode', viewMode);
      localStorage.setItem('kanban-swimlanes-mode', swimlanesMode);
    } catch { /* quota exceeded or private browsing */ }
  }, [selectedTechnique, selectedPriority, selectedMachine, viewMode, swimlanesMode]);

  // Selection
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Modal
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    jobs, techniques, machines,
    isLoading: isLoadingJobs, isLoadingTechniques,
    getTechniqueById, getMachineById
  } = useSchedulingData();

  const handleJobsUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  }, [queryClient]);

  const { activeJob, isUpdating, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } =
    useKanbanDragDrop({ jobs, onJobsUpdate: handleJobsUpdate });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fuzzy search
  const fuseSearchedJobs = useFuseSearch(jobs, searchTerm, {
    keys: ['client', 'product', 'order_number'],
    threshold: 0.3,
  });

  // Apply all filters
  const filteredJobs = useMemo(() => {
    return fuseSearchedJobs.filter(job => {
      if (selectedTechnique !== 'all' && job.technique_id !== selectedTechnique) return false;
      if (selectedPriority !== 'all' && job.priority !== selectedPriority) return false;
      if (selectedMachine !== 'all' && job.machine_id !== selectedMachine) return false;
      return true;
    });
  }, [fuseSearchedJobs, selectedTechnique, selectedPriority, selectedMachine]);

  const activeFiltersCount = [selectedTechnique, selectedPriority, selectedMachine]
    .filter(v => v !== 'all').length;

  const getJobsByStatus = useCallback((status: JobStatus) => {
    return filteredJobs.filter(job => job.status === status);
  }, [filteredJobs]);

  const handleJobClick = (dbJob: DbJob) => {
    setSelectedJob(dbJob);
    setIsModalOpen(true);
  };

  const handleSelectJob = useCallback((id: string) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearFilters = () => {
    setSelectedTechnique('all');
    setSelectedPriority('all');
    setSelectedMachine('all');
    setSearchTerm('');
  };

  // Quick actions
  const handleQuickAction = useCallback(async (jobId: string, action: string) => {
    const mapping = quickActionMap[action];
    if (!mapping) return;

    const updateData: TablesUpdate<'jobs'> = {
      status: mapping.status,
      updated_at: new Date().toISOString(),
    };

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    try {
      assertTransition(job.status as JobStatus, mapping.status);
    } catch (err) {
      toast.error('Transição não permitida', {
        description: err instanceof Error ? err.message : 'Estado inválido'
      });
      return;
    }

    if (mapping.status === 'production' && !job.actual_start_time) {
      updateData.actual_start_time = new Date().toISOString();
    }
    if (mapping.status === 'finished' && !job.actual_end_time) {
      updateData.actual_end_time = new Date().toISOString();
    }

    const { error } = await supabase.from('jobs').update(updateData).eq('id', jobId);
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(`Job movido para "${mapping.label}"`, {
        action: {
          label: 'Desfazer',
          onClick: async () => {
            if (job) {
              await supabase.from('jobs').update({
                status: job.status,
                updated_at: new Date().toISOString()
              }).eq('id', jobId);
              handleJobsUpdate();
            }
          }
        }
      });
      handleJobsUpdate();
    }
  }, [jobs, handleJobsUpdate]);

  // Bulk actions
  const handleBulkAction = useCallback(async (action: 'delete' | 'move' | 'rework' | 'pause', targetStatus?: JobStatus) => {
    if (selectedJobs.size === 0) return;

    const selectedJobsList = jobs.filter(j => selectedJobs.has(j.id));

    if (action === 'move' && targetStatus) {
      // Validate all transitions before updating any
      const invalid = selectedJobsList.filter(j => !canTransition(j.status as JobStatus, targetStatus as JobStatus));
      if (invalid.length > 0) {
        toast.error(`${invalid.length} job(s) não podem ser movidos para "${targetStatus}" a partir do estado atual`);
        return;
      }

      const updateData: TablesUpdate<'jobs'> = {
        status: targetStatus,
        updated_at: new Date().toISOString()
      };
      if (targetStatus === 'production') updateData.actual_start_time = new Date().toISOString();
      if (targetStatus === 'finished') updateData.actual_end_time = new Date().toISOString();

      const updates = selectedJobsList.map(j =>
        supabase.from('jobs').update(updateData).eq('id', j.id)
      );
      const settled = await Promise.allSettled(updates);
      const errors = settled.flatMap(r =>
        r.status === 'fulfilled' ? (r.value.error ? [r.value.error] : []) : [r.reason]
      );
      if (errors.length > 0) {
        toast.error(`Erro ao mover jobs: ${errors.map((e: unknown) => (e as { message?: string } | null)?.message ?? String(e)).join('; ')}`);
        return;
      }
      const allColumns = [...statusColumns, ...exceptionStatuses];
      const statusLabel = allColumns.find(c => c.status === targetStatus)?.label ?? targetStatus;
      toast.success(`${selectedJobs.size} jobs movidos para "${statusLabel}"`);
      setSelectedJobs(new Set());
      handleJobsUpdate();
    } else if (action === 'rework') {
      const invalid = selectedJobsList.filter(j => !canTransition(j.status as JobStatus, 'rework' as JobStatus));
      if (invalid.length > 0) {
        toast.error(`${invalid.length} job(s) não podem ser enviados para Retrabalho a partir do estado atual`);
        return;
      }
      const updates = selectedJobsList.map(j =>
        supabase.from('jobs').update({ status: 'rework', updated_at: new Date().toISOString() }).eq('id', j.id)
      );
      const settled = await Promise.allSettled(updates);
      const errors = settled.flatMap(r =>
        r.status === 'fulfilled' ? (r.value.error ? [r.value.error] : []) : [r.reason]
      );
      if (errors.length > 0) {
        toast.error(`Erro ao marcar retrabalho: ${errors.map((e: unknown) => (e as { message?: string } | null)?.message ?? String(e)).join('; ')}`);
        return;
      }
      toast.success(`${selectedJobs.size} jobs marcados como Retrabalho`);
      setSelectedJobs(new Set());
      handleJobsUpdate();
    } else if (action === 'delete') {
      const updates = Array.from(selectedJobs).map(id =>
        supabase.from('jobs').delete().eq('id', id)
      );
      const settled = await Promise.allSettled(updates);
      const errors = settled.flatMap(r =>
        r.status === 'fulfilled' ? (r.value.error ? [r.value.error] : []) : [r.reason]
      );
      if (errors.length > 0) {
        toast.error(`Erro ao excluir jobs: ${errors.map((e: unknown) => (e as { message?: string } | null)?.message ?? String(e)).join('; ')}`);
        return;
      }
      toast.success(`${selectedJobs.size} jobs excluídos permanentemente`);
      setSelectedJobs(new Set());
      handleJobsUpdate();
    }
  }, [selectedJobs, jobs, handleJobsUpdate]);

  // Swimlane grouping
  const swimlaneGroups = useMemo(() => {
    if (swimlanesMode === 'none') return null;

    if (swimlanesMode === 'technique') {
      const groups = new Map<string, { label: string; color: string; jobs: DbJob[] }>();
      techniques.forEach(t => groups.set(t.id, { label: t.name, color: t.color, jobs: [] }));
      groups.set('unknown', { label: 'Sem técnica', color: '#888', jobs: [] });

      filteredJobs.forEach(job => {
        const group = groups.get(job.technique_id) || (groups.get('unknown') ?? { label: '', color: '', jobs: [] });
        group.jobs.push(job);
      });

      return Array.from(groups.entries())
        .filter(([_, g]) => g.jobs.length > 0)
        .map(([id, g]) => ({ id, ...g }));
    }

    if (swimlanesMode === 'machine') {
      const groups = new Map<string, { label: string; color: string; jobs: DbJob[] }>();
      (machines || []).forEach(m => groups.set(m.id, { label: m.name, color: '#888', jobs: [] }));
      groups.set('unassigned', { label: 'Sem máquina', color: '#888', jobs: [] });

      filteredJobs.forEach(job => {
        const key = job.machine_id || 'unassigned';
        const group = groups.get(key) || (groups.get('unassigned') ?? { label: '', color: '', jobs: [] });
        group.jobs.push(job);
      });

      return Array.from(groups.entries())
        .filter(([_, g]) => g.jobs.length > 0)
        .map(([id, g]) => ({ id, ...g }));
    }

    return null;
  }, [swimlanesMode, filteredJobs, techniques, machines]);

  if (isLoadingJobs || isLoadingTechniques) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-6 gap-2">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
          <div className="flex gap-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[400px] w-[280px]" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  const renderColumns = (jobsForColumns: DbJob[], getJobsByStatusFn: (s: JobStatus) => DbJob[]) => (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
      {[...statusColumns, ...exceptionStatuses].map((column) => (
        <DroppableColumn
          key={column.status}
          {...column}
          jobs={getJobsByStatusFn(column.status)}
          getTechniqueById={getTechniqueById}
          getMachineById={getMachineById}
          onJobClick={handleJobClick}
          viewMode={viewMode}
          selectedJobs={selectedJobs}
          onSelectJob={handleSelectJob}
          onQuickAction={handleQuickAction}
        />
      ))}
    </div>
  );

  return (
    <MainLayout>
      <JobDetailsModal job={selectedJob} open={isModalOpen} onOpenChange={setIsModalOpen} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 animate-fade-in-up">
          {/* Breadcrumbs removed - handled by MainLayout */}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl text-title font-bold">
                  <span className="gradient-text">Kanban</span>
                </h1>
                <FavoriteButton path="/kanban" name="Kanban" />
              </div>
              <p className="text-muted-foreground text-sm">
                Arraste cards para alterar status {isUpdating && '• Atualizando...'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FavoritesDropdown onNavigate={(path) => navigate(path)} />
              <Badge variant="outline" className="hidden md:flex gap-1.5 cursor-pointer hover:bg-muted transition-colors">
                <Command className="h-3 w-3" /><span className="text-xs">⌘K</span>
              </Badge>
            </div>
          </div>

          {/* Planning Efficiency Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PlanningEfficiencyDashboard />
          </motion.div>

          <CapacityHealthPanel />

          {/* Smart Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SmartSequencingPanel />
            <LoadBalancingPanel />
            <StuckJobsPanel />
          </div>

          {/* AI Advisor */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <KanbanAIAdvisor />
          </motion.div>

          {/* Metrics Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <KanbanMetricsBar jobs={jobs} />
          </motion.div>

          {/* Filters Bar */}
          <KanbanFiltersBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedTechnique={selectedTechnique}
            onTechniqueChange={setSelectedTechnique}
            selectedPriority={selectedPriority}
            onPriorityChange={setSelectedPriority}
            selectedMachine={selectedMachine}
            onMachineChange={setSelectedMachine}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            swimlanesMode={swimlanesMode}
            onSwimlanesChange={setSwimlanesMode}
            techniques={techniques}
            machines={machines || []}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
          />

          {/* Bulk actions bar */}
          {selectedJobs.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 sticky top-2 z-30 backdrop-blur-md shadow-lg animate-in slide-in-from-top-4 duration-300">
              <Badge variant="secondary" className="font-bold">{selectedJobs.size} selecionados</Badge>
              <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />
              <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-wider gap-1 border-indicator-info/30 text-indicator-info hover:bg-indicator-info/10" onClick={() => handleBulkAction('move', 'production')}>
                <Play className="h-3 w-3" /> Iniciar Produção
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-wider gap-1 border-indicator-success/30 text-indicator-success hover:bg-indicator-success/10" onClick={() => handleBulkAction('move', 'finished')}>
                <CheckCircle2 className="h-3 w-3" /> Finalizar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-wider gap-1 border-accent-pink/30 text-accent-pink hover:bg-accent-pink/10" onClick={() => handleBulkAction('rework')}>
                <RotateCcw className="h-3 w-3" /> Retrabalho
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-wider gap-1 border-indicator-danger/30 text-indicator-danger hover:bg-indicator-danger/10" onClick={() => {
                if (window.confirm('Excluir permanentemente estes jobs?')) handleBulkAction('delete');
              }}>
                <Trash2 className="h-3 w-3" /> Excluir
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase font-bold tracking-wider ml-auto text-muted-foreground" onClick={() => setSelectedJobs(new Set())}>
                Limpar seleção
              </Button>
            </div>
          )}

          {/* Main Kanban Board */}
          {swimlanesMode !== 'none' && swimlaneGroups ? (
            // Swimlanes view
            <div className="space-y-4">
              {swimlaneGroups.map(group => (
                <Card key={group.id} className="glass-card">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                      {group.label}
                      <Badge variant="secondary" className="text-xs ml-1">{group.jobs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {statusColumns.map((column) => {
                        const columnJobs = group.jobs.filter(j => j.status === column.status);
                        return (
                          <DroppableColumn
                            key={`${group.id}-${column.status}`}
                            {...column}
                            jobs={columnJobs}
                            getTechniqueById={getTechniqueById}
                            getMachineById={getMachineById}
                            onJobClick={handleJobClick}
                            viewMode={viewMode}
                            selectedJobs={selectedJobs}
                            onSelectJob={handleSelectJob}
                            onQuickAction={handleQuickAction}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Standard view
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Fluxo Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderColumns(filteredJobs, getJobsByStatus)}
              </CardContent>
            </Card>
          )}

          {/* Exception Statuses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glass-card border-orange-500/20">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    Status de Exceção
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-orange-400 border-orange-500/30">
                    Ação Requerida
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                  {exceptionStatuses.map((column) => (
                    <DroppableColumn
                      key={column.status}
                      {...column}
                      jobs={getJobsByStatus(column.status)}
                      getTechniqueById={getTechniqueById}
                      getMachineById={getMachineById}
                      onJobClick={handleJobClick}
                      viewMode={viewMode}
                      wipLimit={column.wipLimit}
                      selectedJobs={selectedJobs}
                      onSelectJob={handleSelectJob}
                      onQuickAction={handleQuickAction}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <DragOverlay>
          {activeJob ? (
            <DragOverlayCard
              job={activeJob}
              technique={getTechniqueById(activeJob.technique_id)}
              machine={activeJob.machine_id ? getMachineById(activeJob.machine_id) ?? null : null}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </MainLayout>
  );
}
