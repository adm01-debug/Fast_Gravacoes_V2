import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useRealtimeChannel } from '@/lib/realtimeChannel';

import { Notification } from '../types';

const EMPTY_NOTIFICATIONS: Notification[] = [];

export function useNotifications(options?: { limit?: number; unreadOnly?: boolean }) {
  const { limit = 50, unreadOnly = false } = options ?? {};
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', { limit, unreadOnly }],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return EMPTY_NOTIFICATIONS;

        const { data } = await supabase
          .from('push_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!data || data.length === 0) {
          return EMPTY_NOTIFICATIONS;
        }

        return data.map(n => {
          const metadata = (n.data as Record<string, unknown> | null) || {};
          const severity = metadata.severity as string | undefined;
          const notificationType: Notification['type'] =
            severity === 'critical' ? 'urgent' :
            severity === 'warning' ? 'warning' :
            severity === 'success' ? 'success' : 'info';
          return {
            id: `push-${n.id}`,
            title: n.title,
            message: n.body,
            type: notificationType,
            category: (metadata.type as string) || null,
            source_system: (metadata.source as string) || 'push',
            is_read: n.status === 'read',
            read_at: n.status === 'read' ? n.created_at : null,
            action_url: (metadata.route as string) || null,
            action_label: (metadata.action_label as string) || null,
            priority: (metadata.priority as number) || 1,
            group_count: 1,
            is_grouped: false,
            created_at: n.created_at,
          };
        });
      } catch {
        return EMPTY_NOTIFICATIONS;
      }
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count } = await supabase
          .from('push_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'read');

        return count || 0;
      } catch (error) {
        return 0;
      }
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('push_notifications')
        .update({ status: 'read' })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => {
      logger.error('Erro ao marcar notificação como lida', error, 'useNotifications');
      toast.error('Erro ao marcar notificação como lida');
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('push_notifications')
        .update({ status: 'read' })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Todas as notificações marcadas como lidas');
    },
    onError: (error) => {
      logger.error('Erro ao marcar todas as notificações como lidas', error, 'useNotifications');
      toast.error('Erro ao marcar notificações como lidas');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('push_notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => {
      logger.error('Erro ao excluir notificação', error, 'useNotifications');
      toast.error('Erro ao excluir notificação');
    },
  });

  // Realtime via useRealtimeChannel — handles StrictMode double-mount and userId
  // changes correctly. Channel name includes userId so each session is isolated.
  useRealtimeChannel(
    () => userId ? `notifications-realtime-${userId}` : 'notifications-pending',
    userId ? [{ event: 'INSERT', schema: 'public', table: 'push_notifications', filter: `user_id=eq.${userId}` }] : [],
    (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      const notif = payload.new as { title: string; body: string };
      toast.info(notif.title, { description: notif.body });
    },
  );

  return {
    notifications, unreadCount, isLoading,
    markAsRead: markAsRead.mutate, markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
  };
}

// Helper function for status change notifications
export function notifyStatusChange(clientName: string, oldStatus: string, newStatus: string) {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`Status changed for ${clientName}: ${oldStatus} -> ${newStatus}`, { clientName, oldStatus, newStatus }, 'Status Notification');
  }
}
