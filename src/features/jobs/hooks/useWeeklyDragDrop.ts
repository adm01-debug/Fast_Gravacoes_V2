import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DbJob, type JobUpdate } from '@/features/jobs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { findNextAvailableSlot } from '@/features/jobs';

interface UseWeeklyDragDropProps {
  onUpdate: () => void;
  allJobs: DbJob[];
}

export function useWeeklyDragDrop({ onUpdate, allJobs }: UseWeeklyDragDropProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const jobId = active.id as string;
    const overId = over.id as string; // format: "machineId|date"

    const parts = overId.split('|');
    if (parts.length < 2) return;

    const machineId = parts[0];
    const date = parts[1];

    const job = allJobs.find(j => j.id === jobId);

    if (!job) return;

    // Check if anything actually changed
    if (job.machine_id === machineId && job.scheduled_date === date) return;

    try {
      // Find next available slot for this job on the target machine and date
      const existingJobsOnDest = allJobs.filter(j =>
        j.machine_id === machineId &&
        j.scheduled_date === date &&
        j.id !== jobId &&
        j.status !== 'cancelled'
      );

      const duration = job.estimated_duration || 60;
      const nextSlot = findNextAvailableSlot(existingJobsOnDest, duration);

      const updateData: JobUpdate = {
        machine_id: machineId,
        scheduled_date: date,
        updated_at: new Date().toISOString(),
      };

      if (nextSlot) {
        updateData.start_time = nextSlot.start;
        updateData.end_time = nextSlot.end;
        toast.info(`Horário ajustado para ${nextSlot.start} - ${nextSlot.end}`, {
          description: `Máquina: ${machineId.substring(0, 8)}... | Data: ${date}`,
          duration: 4000
        });
      } else {
        toast.warning('Atenção: Nenhum slot livre encontrado. Conflito detectado.');
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        // Check for the trigger error we just added
        if (error.message?.includes('Conflito de agendamento')) {
          toast.error('Conflito de agendamento: máquina já possui job neste horário.');
          return;
        }
        throw error;
      }

      toast.success('Agendamento movido com sucesso');
      onUpdate();
    } catch (err) {

      toast.error('Erro ao mover agendamento');
    }
  };

  return {
    activeId,
    handleDragStart,
    handleDragEnd,
  };
}
