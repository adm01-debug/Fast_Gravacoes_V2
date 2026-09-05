import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

export interface PackagingAssignee {
  user_id: string;
  role: 'coordinator' | 'operator' | 'manager';
  full_name: string | null;
}

/**
 * Lists active users eligible to receive packaging tasks
 * (coordinator, operator, manager). Deduplicates by user_id
 * preferring the highest role (manager > coordinator > operator).
 */
export function usePackagingAssignees() {
  return useQuery<PackagingAssignee[]>({
    queryKey: ['packaging-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          is_active,
          profiles!inner ( full_name )
        `)
        .in('role', ['coordinator', 'operator', 'manager'])
        .eq('is_active', true);

      if (error) {
        logger.error('Failed to fetch packaging assignees', error, 'usePackagingAssignees');
        throw error;
      }

      const rank: Record<string, number> = { manager: 3, coordinator: 2, operator: 1 };
      const byUser = new Map<string, PackagingAssignee>();

      for (const row of data ?? []) {
        const profile = row.profiles as unknown as Database['public']['Tables']['profiles']['Row'] | null;
        const candidate: PackagingAssignee = {
          user_id: row.user_id,
          role: row.role as PackagingAssignee['role'],
          full_name: profile?.full_name ?? null,
        };
        const existing = byUser.get(row.user_id);
        if (!existing || rank[candidate.role] > rank[existing.role]) {
          byUser.set(row.user_id, candidate);
        }
      }

      return Array.from(byUser.values()).sort((a, b) =>
        (a.full_name ?? '').localeCompare(b.full_name ?? '', 'pt-BR'),
      );
    },
    staleTime: 5 * 60_000,
  });
}
