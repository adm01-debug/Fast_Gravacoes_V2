import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
}

export function usePackagingAuditTimeline(taskId: string | null) {
  return useQuery({
    queryKey: ['packaging-audit-timeline', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<AuditEntry[]> => {
      if (!taskId) return [];

      const [defectsRes, checklistRes] = await Promise.all([
        supabase.from('packaging_defects').select('id').eq('packaging_task_id', taskId),
        supabase.from('packaging_task_checklist').select('id').eq('packaging_task_id', taskId),
      ]);

      const ids = [
        taskId,
        ...(defectsRes.data ?? []).map((d) => d.id),
        ...(checklistRes.data ?? []).map((c) => c.id),
      ];

      const { data, error } = await supabase
        .from('audit_log')
        .select('id, entity_type, entity_id, action, actor_id, actor_email, old_data, new_data, changed_fields, created_at')
        .in('entity_id', ids)
        .in('entity_type', ['packaging_tasks', 'packaging_defects', 'packaging_task_checklist'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        // Sem permissão (operador) devolve lista vazia sem quebrar UI
        if (error.code === '42501' || error.message?.includes('permission')) return [];
        throw error;
      }
      return (data ?? []) as AuditEntry[];
    },
    staleTime: 30_000,
  });
}
