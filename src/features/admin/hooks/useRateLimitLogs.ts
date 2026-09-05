import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export interface RateLimitLog {
  id: string;
  ip_address: string;
  endpoint: string;
  user_id: string | null;
  user_email: string | null;
  request_count: number;
  window_start: string;
  window_end: string;
  is_blocked: boolean;
  created_at: string;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  blocked_by: string | null;
  unblocked_at: string | null;
  unblocked_by: string | null;
  request_count_at_block: number | null;
  created_at: string;
}

export interface RateLimitSetting {
  id: string;
  endpoint_pattern: string;
  max_requests: number;
  window_seconds: number;
  block_duration_minutes: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export function useRateLimitLogs(limit = 100) {
  return useQuery({
    queryKey: ['rate-limit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_limit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as RateLimitLog[];
    },
  });
}

export function useBlockedIPs() {
  return useQuery({
    queryKey: ['blocked-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .is('unblocked_at', null)
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      return data as BlockedIP[];
    },
  });
}

export function useBlockedIPsHistory(limit = 100) {
  return useQuery({
    queryKey: ['blocked-ips-history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .order('blocked_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as BlockedIP[];
    },
  });
}

export function useRateLimitSettings() {
  return useQuery({
    queryKey: ['rate-limit-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_limit_settings')
        .select('*')
        .order('endpoint_pattern');

      if (error) throw error;
      return data as RateLimitSetting[];
    },
  });
}

export function useSecurityEvents(limit = 100) {
  return useQuery({
    queryKey: ['security-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SecurityEvent[];
    },
  });
}

export function useBlockIP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ipAddress,
      reason,
      isPermanent = false,
      expiresAt
    }: {
      ipAddress: string;
      reason: string;
      isPermanent?: boolean;
      expiresAt?: string;
    }) => {
      const { data, error } = await supabase
        .from('blocked_ips')
        .insert({
          ip_address: ipAddress,
          reason,
          is_permanent: isPermanent,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('IP bloqueado com sucesso');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao bloquear IP');
    },
  });
}

export function useUnblockIP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('blocked_ips')
        .update({
          unblocked_at: new Date().toISOString(),
          unblocked_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('IP desbloqueado com sucesso');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao desbloquear IP');
    },
  });
}

export function useUpdateRateLimitSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<RateLimitSetting> & { id: string }) => {
      const { error } = await supabase
        .from('rate_limit_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-settings'] });
      toast.success('Configuração atualizada');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao atualizar configuração');
    },
  });
}

export function useCreateRateLimitSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setting: Omit<RateLimitSetting, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('rate_limit_settings')
        .insert({
          ...setting,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-settings'] });
      toast.success('Configuração criada');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao criar configuração');
    },
  });
}

export function useDeleteRateLimitSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rate_limit_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-settings'] });
      toast.success('Configuração removida');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao remover configuração');
    },
  });
}
