import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export interface GeoBlockingSettings {
  id: string;
  is_enabled: boolean;
  mode: 'blocklist' | 'allowlist';
  block_unknown_countries: boolean;
  log_blocked_attempts: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface GeoBlockingRule {
  id: string;
  country_code: string;
  country_name: string;
  is_blocked: boolean;
  block_type: string;
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

export interface GeoBlockingLog {
  id: string;
  ip_address: string;
  country_code: string | null;
  country_name: string | null;
  action: string;
  user_id: string | null;
  user_agent: string | null;
  request_path: string | null;
  created_at: string;
}

// Lista de países comuns
export const COMMON_COUNTRIES = [
  { code: 'BR', name: 'Brasil' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Espanha' },
  { code: 'AR', name: 'Argentina' },
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'PY', name: 'Paraguai' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Equador' },
  { code: 'BO', name: 'Bolívia' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'IT', name: 'Itália' },
  { code: 'CA', name: 'Canadá' },
  { code: 'JP', name: 'Japão' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'Índia' },
  { code: 'AU', name: 'Austrália' },
  { code: 'RU', name: 'Rússia' },
  { code: 'ZA', name: 'África do Sul' },
];

export function useGeoBlockingSettings() {
  return useQuery({
    queryKey: ['geo-blocking-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geo_blocking_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        // Se não existir, criar configuração padrão
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('geo_blocking_settings')
            .insert({
              is_enabled: false,
              mode: 'allowlist',
              block_unknown_countries: false,
              log_blocked_attempts: true
            })
            .select()
            .single();

          if (insertError) throw insertError;
          return newSettings as GeoBlockingSettings;
        }
        throw error;
      }
      return data as GeoBlockingSettings;
    },
  });
}

export function useGeoBlockingRules() {
  return useQuery({
    queryKey: ['geo-blocking-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geo_blocking_rules')
        .select('*')
        .order('country_name', { ascending: true });

      if (error) throw error;
      return data as GeoBlockingRule[];
    },
  });
}

export function useGeoBlockingLogs(limit = 50) {
  return useQuery({
    queryKey: ['geo-blocking-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geo_blocking_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as GeoBlockingLog[];
    },
  });
}

export function useUpdateGeoSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<GeoBlockingSettings>) => {
      const { data: existing } = await supabase
        .from('geo_blocking_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('geo_blocking_settings')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('geo_blocking_settings')
          .insert(updates);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-blocking-settings'] });
      toast.success('Configurações atualizadas');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao atualizar configurações');
    },
  });
}

export function useAddCountryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      countryCode,
      countryName,
      isAllowed,
      reason
    }: {
      countryCode: string;
      countryName: string;
      isAllowed: boolean;
      reason?: string;
    }) => {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('geo_blocking_rules')
        .select('id')
        .eq('country_code', countryCode)
        .single();

      if (existing) {
        throw new Error('País já está na lista');
      }

      const { error } = await supabase
        .from('geo_blocking_rules')
        .insert({
          country_code: countryCode,
          country_name: countryName,
          is_blocked: !isAllowed, // No modo allowlist, is_blocked=false significa permitido
          block_type: isAllowed ? 'allow' : 'block',
          reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-blocking-rules'] });
      toast.success('País adicionado à lista');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao adicionar país');
    },
  });
}

export function useRemoveCountryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('geo_blocking_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-blocking-rules'] });
      toast.success('País removido da lista');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao remover país');
    },
  });
}

export function useToggleCountryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, isAllowed }: { ruleId: string; isAllowed: boolean }) => {
      const { error } = await supabase
        .from('geo_blocking_rules')
        .update({
          is_blocked: !isAllowed,
          block_type: isAllowed ? 'allow' : 'block'
        })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-blocking-rules'] });
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao atualizar regra');
    },
  });
}
