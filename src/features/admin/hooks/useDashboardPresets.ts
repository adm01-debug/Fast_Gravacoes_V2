import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createAppError, showErrorToast } from '@/lib/errorHandling';

export interface DashboardPreset {
  id: string;
  user_id: string;
  name: string;
  dashboard_id: string;
  filters: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
}

export function useDashboardPresets(dashboardId: string) {
  const queryClient = useQueryClient();

  const { data: presets, isLoading } = useQuery({
    queryKey: ['dashboard-presets', dashboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_presets')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DashboardPreset[];
    },
  });

  const savePreset = useMutation({
    mutationFn: async ({ name, filters, isDefault = false }: { name: string; filters: Record<string, unknown>; isDefault?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dashboard_presets')
        .insert({
          name,
          dashboard_id: dashboardId,
          filters: filters as never,
          user_id: user.id,
          is_default: isDefault
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-presets', dashboardId] });
      toast.success('Filtro salvo com sucesso');
    },
    onError: (error: unknown) => {
      const appError = createAppError(error, { dashboardId, operation: 'savePreset' });
      showErrorToast(appError, 'Erro ao salvar filtro');
    }
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboard_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-presets', dashboardId] });
      toast.success('Filtro excluído');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao excluir filtro');
    }
  });

  return {
    presets,
    isLoading,
    savePreset: savePreset.mutate,
    isSaving: savePreset.isPending,
    deletePreset: deletePreset.mutate
  };
}
