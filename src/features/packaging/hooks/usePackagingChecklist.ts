import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string | null;
  is_required: boolean;
  item_order: number;
  is_active: boolean;
}

export interface TaskChecklistRow {
  id: string;
  packaging_task_id: string;
  item_id: string;
  is_checked: boolean;
  notes: string | null;
  checked_by: string | null;
  checked_at: string | null;
}

export interface MergedChecklistItem extends ChecklistItem {
  is_checked: boolean;
  notes: string | null;
  checked_at: string | null;
  row_id: string | null;
}

export function usePackagingChecklist(taskId: string | null) {
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ['packaging-checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('item_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistItem[];
    },
    staleTime: 5 * 60_000,
  });

  const taskChecklistQuery = useQuery({
    queryKey: ['packaging-task-checklist', taskId],
    queryFn: async () => {
      if (!taskId) return [] as TaskChecklistRow[];
      const { data, error } = await supabase
        .from('packaging_task_checklist')
        .select('*')
        .eq('packaging_task_id', taskId);
      if (error) throw error;
      return (data ?? []) as TaskChecklistRow[];
    },
    enabled: !!taskId,
    staleTime: 15_000,
  });

  const items: MergedChecklistItem[] = (itemsQuery.data ?? []).map((it) => {
    const row = (taskChecklistQuery.data ?? []).find((r) => r.item_id === it.id);
    return {
      ...it,
      is_checked: row?.is_checked ?? false,
      notes: row?.notes ?? null,
      checked_at: row?.checked_at ?? null,
      row_id: row?.id ?? null,
    };
  });

  const requiredMissing = items.filter((i) => i.is_required && !i.is_checked).length;
  const total = items.length;
  const done = items.filter((i) => i.is_checked).length;

  const toggle = useMutation({
    mutationFn: async (input: { item: MergedChecklistItem; checked: boolean }) => {
      if (!taskId) throw new Error('Tarefa inválida');
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const payload = {
        packaging_task_id: taskId,
        item_id: input.item.id,
        is_checked: input.checked,
        checked_by: input.checked ? userId : null,
        checked_at: input.checked ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from('packaging_task_checklist')
        .upsert(payload, { onConflict: 'packaging_task_id,item_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packaging-task-checklist', taskId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao atualizar checklist'),
  });

  return {
    items,
    isLoading: itemsQuery.isLoading || taskChecklistQuery.isLoading,
    total,
    done,
    requiredMissing,
    canShip: requiredMissing === 0 && total > 0,
    toggle,
  };
}
