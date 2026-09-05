import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { useAuth } from '@/features/auth';

export type BusinessConfigValue = string | number | boolean | null | BusinessConfigValue[] | { [key: string]: BusinessConfigValue };

export interface BusinessConfig {
  key: string;
  value: BusinessConfigValue;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export function useBusinessConfig() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isAuthenticated = Boolean(user?.id) && !authLoading;

  const configQuery = useQuery({
    queryKey: ['business-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_config')
        .select('*');
      
      if (error) throw error;
      
      // Transform to Map for easier access
      const configMap = new Map<string, BusinessConfigValue>();
      data?.forEach(item => configMap.set(item.key, item.value as BusinessConfigValue));
      return { raw: data as BusinessConfig[], map: configMap };
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: BusinessConfigValue }) => {
      if (!user?.id) throw new Error('Sessão expirada. Faça login novamente.');
      const { data, error } = await supabase
        .from('business_config')
        .update({ value, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('key', key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-config'] });
      toast.success('Configuração atualizada com sucesso');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao atualizar configuração');
    }
  });

  const getConfig = useCallback(<T = BusinessConfigValue>(key: string, defaultValue: T): T => {
    if (!configQuery.data) return defaultValue;
    return (configQuery.data.map.get(key) as T | undefined) ?? defaultValue;
  }, [configQuery.data]);

  return {
    configs: configQuery.data?.raw || [],
    isLoading: configQuery.isLoading,
    getConfig,
    updateConfig: updateConfigMutation.mutateAsync,
    isUpdating: updateConfigMutation.isPending
  };
}
