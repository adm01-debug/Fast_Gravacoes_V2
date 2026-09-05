import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DbJob, type JobUpdate } from '@/features/jobs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { findNextAvailableSlot } from '@/features/jobs';
import { format, parse, isValid } from 'date-fns';

interface UseDailyDragDropProps {
  onUpdate: () => void;
  allJobs: DbJob[];
  startHour: number;
  totalMinutes: number;
}

export function useDailyDragDrop({ onUpdate, allJobs, startHour, totalMinutes }: UseDailyDragDropProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const jobId = active.id as string;
    const overId = over.id as string; // machineId

    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;

    const machineId = overId;
    const date = job.scheduled_date; // Keep same date for daily view

    if (!date) return;

    try {
      const existingJobsOnDest = allJobs.filter(j =>
        j.machine_id === machineId &&
        j.scheduled_date === date &&
        j.id !== jobId &&
        j.status !== 'cancelled'
      );

      const duration = job.estimated_duration || 60;

      // Find next available slot on the target machine
      const nextSlot = findNextAvailableSlot(existingJobsOnDest, duration);

      const updateData: JobUpdate = {
        machine_id: machineId,
        updated_at: new Date().toISOString(),
      };

      if (nextSlot) {
        updateData.start_time = nextSlot.start;
        updateData.end_time = nextSlot.end;
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;

      toast.success('Agendamento movido');
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
