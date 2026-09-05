import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { useAuth } from '@/features/auth';
import type { ShiftHandover, ShiftPendingTask, ShiftOccurrence } from './shiftHandoverTypes';
import { getCurrentShiftType } from './shiftHandoverTypes';

export function useShiftHandoverMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createHandover = useMutation({
    mutationFn: async (data: { shift_type?: 'morning' | 'afternoon' | 'night'; machine_id?: string | null; general_notes?: string; checklist_items?: string[] }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data: handover, error } = await supabase.from('shift_handovers').insert({ shift_type: data.shift_type || getCurrentShiftType(), outgoing_operator_id: user.id, machine_id: data.machine_id || null, general_notes: data.general_notes || null }).select().single();
      if (error) throw error;
      if (data.checklist_items && data.checklist_items.length > 0) {
        const items = data.checklist_items.map((item, index) => ({ handover_id: handover.id, item_description: item, item_order: index }));
        const { error: checklistError } = await supabase.from('shift_handover_checklist').insert(items);
        if (checklistError) throw checklistError;
      }
      return handover;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-handovers'] }); toast.success('Passagem de turno iniciada'); },
    onError: (error) => { showErrorToast(error, 'Erro ao iniciar passagem'); }
  });

  const updateHandover = useMutation({
    mutationFn: async ({ id, machine, outgoing_profile, incoming_profile, ...data }: Partial<ShiftHandover> & { id: string }) => {
      // Strip joined relations — not columns on `shift_handovers`.
      void machine; void outgoing_profile; void incoming_profile;
      const { error } = await supabase.from('shift_handovers').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-handovers'] }); queryClient.invalidateQueries({ queryKey: ['shift-handover'] }); toast.success('Passagem atualizada'); },
    onError: (error) => { showErrorToast(error, 'Erro ao atualizar'); }
  });

  const completeHandover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shift_handovers').update({ status: 'pending_acceptance', completed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-handovers'] }); queryClient.invalidateQueries({ queryKey: ['shift-handover'] }); toast.success('Passagem finalizada, aguardando aceite'); },
    onError: (error) => { showErrorToast(error, 'Erro ao finalizar'); }
  });

  const acceptHandover = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      // Guard: cannot accept your own handover
      const { data: handover, error: fetchErr } = await supabase
        .from('shift_handovers')
        .select('outgoing_operator_id, status')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      if (handover.outgoing_operator_id === user.id) {
        throw new Error('Você não pode aceitar sua própria passagem de turno.');
      }
      if (handover.status !== 'pending_acceptance') {
        throw new Error(`Passagem não está aguardando aceite (status atual: ${handover.status}).`);
      }
      const { error } = await supabase.from('shift_handovers').update({ status: 'completed', incoming_operator_id: user.id, accepted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-handovers'] }); queryClient.invalidateQueries({ queryKey: ['shift-handover'] }); toast.success('Passagem de turno aceita'); },
    onError: (error) => { showErrorToast(error, 'Erro ao aceitar'); }
  });

  const updateChecklistItem = useMutation({
    mutationFn: async ({ id, is_checked, notes }: { id: string; is_checked: boolean; notes?: string }) => {
      const { error } = await supabase.from('shift_handover_checklist').update({ is_checked, checked_at: is_checked ? new Date().toISOString() : null, notes: notes || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-checklist'] }); },
    onError: (error: Error) => { showErrorToast(error, 'Erro ao atualizar checklist'); }
  });

  const addPendingTask = useMutation({
    mutationFn: async (data: Omit<ShiftPendingTask, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'completed_by' | 'machine' | 'job'>) => {
      const { error } = await supabase.from('shift_pending_tasks').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-pending-tasks'] }); toast.success('Pendência adicionada'); },
    onError: (error) => { showErrorToast(error, 'Erro ao adicionar pendência'); }
  });

  const updatePendingTask = useMutation({
    mutationFn: async ({ id, machine, job, ...data }: Partial<ShiftPendingTask> & { id: string }) => {
      // Strip joined relations — not columns on `shift_pending_tasks`.
      void machine; void job;
      const updateData = { ...data } as Partial<Omit<ShiftPendingTask, 'machine' | 'job'>>;
      if (data.status === 'completed' && user) { updateData.completed_at = new Date().toISOString(); updateData.completed_by = user.id; }
      const { error } = await supabase.from('shift_pending_tasks').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-pending-tasks'] }); toast.success('Pendência atualizada'); },
    onError: (error) => { showErrorToast(error, 'Erro ao atualizar'); }
  });

  const addOccurrence = useMutation({
    mutationFn: async (data: Omit<ShiftOccurrence, 'id' | 'created_at' | 'resolved_at' | 'resolved_by' | 'machine'>) => {
      const { error } = await supabase.from('shift_occurrences').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-occurrences'] }); toast.success('Ocorrência registrada'); },
    onError: (error) => { showErrorToast(error, 'Erro ao registrar ocorrência'); }
  });

  const resolveOccurrence = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('shift_occurrences').update({ resolution, resolved_at: new Date().toISOString(), resolved_by: user.id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-occurrences'] }); toast.success('Ocorrência resolvida'); },
    onError: (error) => { showErrorToast(error, 'Erro ao resolver'); }
  });

  return {
    createHandover, updateHandover, completeHandover, acceptHandover,
    updateChecklistItem, addPendingTask, updatePendingTask,
    addOccurrence, resolveOccurrence,
  };
}
