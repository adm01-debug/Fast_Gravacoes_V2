import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';

export interface UserDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  ip_address: string | null;
  user_agent: string | null;
  browser_name: string | null;
  os_name: string | null;
  device_type: string | null;
  city: string | null;
  country: string | null;
  is_trusted: boolean;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}

export function useUserDevices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ['user-devices', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as UserDevice[];
    },
    enabled: !!user?.id,
  });

  const trustDevice = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_trusted: true })
        .eq('id', deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-devices'] });
      toast.success('Dispositivo marcado como confiável');
    },
    onError: () => {
      toast.error('Erro ao marcar dispositivo como confiável');
    },
  });

  const untrustDevice = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_trusted: false })
        .eq('id', deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-devices'] });
      toast.success('Dispositivo removido da lista de confiáveis');
    },
    onError: () => {
      toast.error('Erro ao atualizar dispositivo');
    },
  });

  const removeDevice = useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-devices'] });
      toast.success('Dispositivo removido com sucesso');
    },
    onError: () => {
      toast.error('Erro ao remover dispositivo');
    },
  });

  return {
    devices,
    isLoading,
    refetch,
    trustDevice: trustDevice.mutate,
    untrustDevice: untrustDevice.mutate,
    removeDevice: removeDevice.mutate,
    isTrusting: trustDevice.isPending,
    isRemoving: removeDevice.isPending,
  };
}
