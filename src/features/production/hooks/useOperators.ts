import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/logger';

const OPERATORS_ERROR_CONTEXT = {
  fetch: { entity: 'operators', operation: 'fetch' },
  remove: { entity: 'operators', operation: 'remove' },
  toggleActive: { entity: 'operators', operation: 'toggle_active' },
};

export interface OperatorWithProfile {
  id: string;
  user_id: string;
  role: 'coordinator' | 'operator' | 'manager';
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  is_active: boolean;
}

export function useOperators() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);

  const query = useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          is_active,
          profiles!inner (
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('role', 'operator');

      if (error) {
        logger.error('Failed to fetch operators', error, 'useOperators');
        throw error;
      }

      // Type-safe mapping with proper profile extraction
      return (data || []).map(item => {
        const profile = item.profiles as unknown as Database['public']['Tables']['profiles']['Row'] | null;
        return {
          id: item.id,
          user_id: item.user_id,
          role: item.role as 'operator',
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          phone: profile?.phone ?? null,
          created_at: item.created_at,
          is_active: item.is_active ?? true,
        };
      }) as OperatorWithProfile[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const removeOperatorMutation = useMutation({
    mutationFn: async ({ operatorId, operatorName, reason }: { operatorId: string; operatorName: string | null; reason?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch profile + delete machine assignments + delete role in parallel
      const [
        { data: performerProfile },
        { error: assignmentsError },
        { error: roleError },
      ] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('operator_machines').delete().eq('operator_id', operatorId),
        supabase.from('user_roles').delete().eq('user_id', operatorId).eq('role', 'operator'),
      ]);

      if (assignmentsError) throw assignmentsError;
      if (roleError) throw roleError;

      // Non-critical audit — warn on failure, don't block the mutation
      const { error: auditError } = await supabase
        .from('operator_status_audit')
        .insert({
          operator_id: operatorId,
          operator_name: operatorName,
          action: 'removed',
          performed_by: user.id,
          performed_by_name: performerProfile?.full_name || null,
          reason: reason || null,
        });

      if (auditError) {
        logger.warn('Failed to log operator removal audit', auditError, 'useOperators');
      }

      return operatorId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      queryClient.invalidateQueries({ queryKey: ['operator-machines'] });
      queryClient.invalidateQueries({ queryKey: ['operator-status-audit'] });
      queryClient.invalidateQueries({ queryKey: ['operators-productivity'] });
      toast.success(t('operators.operatorRemoved', 'Operador removido'), {
        description: t('operators.operatorRemovedDesc', 'O operador foi removido do sistema com sucesso.'),
      });
    },
    onError: (error) => {
      logger.error('Failed to remove operator', error, 'useOperators');
      toast.error('Erro ao remover operador');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ operatorId, operatorName, isActive, reason }: { operatorId: string; operatorName: string | null; isActive: boolean; reason?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch profile + update status in parallel
      const [
        { data: performerProfile },
        { error },
      ] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('user_roles').update({ is_active: isActive }).eq('user_id', operatorId).eq('role', 'operator'),
      ]);

      if (error) throw error;

      // Non-critical audit — warn on failure, don't block the mutation
      const { error: auditError } = await supabase
        .from('operator_status_audit')
        .insert({
          operator_id: operatorId,
          operator_name: operatorName,
          action: isActive ? 'activated' : 'deactivated',
          performed_by: user.id,
          performed_by_name: performerProfile?.full_name || null,
          reason: reason || null,
        });

      if (auditError) {
        logger.warn('Failed to log operator status toggle audit', auditError, 'useOperators');
      }

      return { operatorId, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      queryClient.invalidateQueries({ queryKey: ['operator-status-audit'] });
      queryClient.invalidateQueries({ queryKey: ['operators-productivity'] });
      toast.success(data.isActive ? t('operators.operatorActivated', 'Operador ativado') : t('operators.operatorDeactivated', 'Operador desativado'), {
        description: data.isActive
          ? t('operators.operatorActivatedDesc', 'O operador foi reativado e pode acessar o sistema.')
          : t('operators.operatorDeactivatedDesc', 'O operador foi desativado temporariamente.'),
      });
    },
    onError: (error) => {
      logger.error('Failed to toggle operator status', error, 'useOperators');
      toast.error('Erro ao alterar status do operador');
    },
  });

  return {
    ...query,
    removeOperator: removeOperatorMutation.mutate,
    isRemoving: removeOperatorMutation.isPending,
    toggleActive: toggleActiveMutation.mutate,
    isToggling: toggleActiveMutation.isPending,
  };
}
