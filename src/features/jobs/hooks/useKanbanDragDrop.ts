/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useCallback } from 'react';
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { DbJob } from '@/features/jobs';
import { JobStatus, assertTransition } from '@/features/jobs';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type JobUpdate = Database['public']['Tables']['jobs']['Update'];

interface UseKanbanDragDropProps {
  jobs: DbJob[];
  onJobsUpdate: () => void;
}

export function useKanbanDragDrop({ jobs, onJobsUpdate }: UseKanbanDragDropProps) {
  const [activeJob, setActiveJob] = useState<DbJob | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const draggedJob = jobs.find(job => job.id === active.id);
    if (draggedJob) {
      setActiveJob(draggedJob);
    }
  }, [jobs]);

  const handleDragOver = useCallback((_event: DragOverEvent) => {}, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);
    if (!over) return;

    const activeJobId = active.id as string;
    const overId = over.id as string;
    const overData = over.data.current;

    const draggedJob = jobs.find(job => job.id === activeJobId);
    if (!draggedJob) return;

    const isColumn = overData?.type === 'column';
    const isJob = overData?.type === 'job';

    let targetStatus: JobStatus | null = null;
    if (isColumn) {
      targetStatus = overData.status as JobStatus;
    } else if (isJob) {
      const targetJob = jobs.find(job => job.id === overId);
      if (targetJob) {
        targetStatus = targetJob.status as JobStatus;
      }
    }

    if (!targetStatus) return;
    const currentStatus = draggedJob.status as JobStatus;

    if (currentStatus === targetStatus && isJob && activeJobId !== overId) {
      await handleReorderWithinColumn(activeJobId, overId, targetStatus);
      return;
    }

    if (currentStatus !== targetStatus) {
      await handleStatusChange(draggedJob, targetStatus);
    }
  }, [jobs, onJobsUpdate]);

  const handleReorderWithinColumn = async (activeJobId: string, overJobId: string, status: JobStatus) => {
    const columnJobs = jobs
      .filter(j => j.status === status)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const oldIndex = columnJobs.findIndex(j => j.id === activeJobId);
    const newIndex = columnJobs.findIndex(j => j.id === overJobId);

    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(columnJobs, oldIndex, newIndex);

    setIsUpdating(true);
    try {
      const updates: JobUpdate[] = newOrder.map((job, index) => ({
        id: job.id,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('jobs')
        .upsert(updates as Database['public']['Tables']['jobs']['Insert'][], { onConflict: 'id' });

      if (error) throw error;
      toast.success('Ordem atualizada');
      onJobsUpdate();
    } catch (error) {
      toast.error('Erro ao reordenar');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (draggedJob: DbJob, targetStatus: JobStatus) => {
    const currentStatus = draggedJob.status as JobStatus;

    try {
      assertTransition(currentStatus, targetStatus);
    } catch (err) {
      toast.error('Transição não permitida', {
        description: err instanceof Error ? err.message : 'Estado inválido'
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updateData: JobUpdate = {
        status: targetStatus,
        updated_at: new Date().toISOString(),
      };

      if (targetStatus === 'production' && !draggedJob.actual_start_time) {
        updateData.actual_start_time = new Date().toISOString();
      }
      if (targetStatus === 'finished' && !draggedJob.actual_end_time) {
        updateData.actual_end_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', draggedJob.id);

      if (error) throw error;
      toast.success(`Job movido para "${getStatusLabel(targetStatus)}"`);
      onJobsUpdate();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDragCancel = useCallback(() => setActiveJob(null), []);

  return {
    activeJob, isUpdating,
    handleDragStart, handleDragOver, handleDragEnd, handleDragCancel,
  };
}

function getStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    'queue': 'Na Fila',
    'ready': 'No Jeito',
    'scheduled': 'Agendado',
    'production': 'Em Produção',
    'finished': 'Finalizado',
    'paused': 'Pausado',
    'cancelled': 'Cancelado',
    'delayed': 'Atrasado',
    'rework': 'Retrabalho',
    'buffer': 'Buffer',
    'packaging': 'Embalagem',
  };
  return labels[status] || status;
}
