import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { createAppError } from '@/lib/errorHandling';
import { usePresenceChannel } from '@/lib/realtimeChannel';

const PRESENCE_ERROR_CONTEXT = {
  track: { entity: 'operator_presence', operation: 'track' },
  sync: { entity: 'operator_presence', operation: 'sync' },
};

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export function useOperatorPresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Map<string, Date>>(new Map());
  const [isTracking, setIsTracking] = useState(false);

  // Sync handler: updates the online set from the current presence state.
  const handleSync = useCallback((state: Record<string, unknown>) => {
    const online = new Set<string>();
    Object.values(state).forEach((presences) => {
      (presences as PresenceState[keyof PresenceState]).forEach((presence) => {
        if (presence.user_id) online.add(presence.user_id);
      });
    });
    setOnlineUsers(online);
  }, []);

  const handleJoin = useCallback((newPresences: unknown[]) => {
    setOnlineUsers((prev) => {
      const updated = new Set(prev);
      (newPresences as Array<{ user_id?: string }>).forEach((presence) => {
        if (presence.user_id) updated.add(presence.user_id);
      });
      return updated;
    });
  }, []);

  const handleLeave = useCallback((leftPresences: unknown[]) => {
    const now = new Date();
    setOnlineUsers((prev) => {
      const updated = new Set(prev);
      (leftPresences as Array<{ user_id?: string }>).forEach((presence) => {
        if (presence.user_id) {
          updated.delete(presence.user_id);
          setLastSeen((prevLastSeen) => {
            const newMap = new Map(prevLastSeen);
            newMap.set(presence.user_id ?? '', now);
            return newMap;
          });
        }
      });
      return updated;
    });
  }, []);

  // Shared presence channel via realtimeChannel singleton — handles
  // StrictMode double-mount and multi-consumer scenarios.
  const channel = usePresenceChannel('operators-presence', handleSync, handleJoin, handleLeave);

  // Once the channel exists (singleton pattern), we register our own
  // presence tracking. Runs only when both `channel` and `user.id` are
  // available, so we don't track before login.
  useEffect(() => {
    if (!channel || !user?.id) return;

    let cancelled = false;

    channel.track({
      user_id: user.id,
      online_at: new Date().toISOString(),
    })
      .then(() => {
        if (!cancelled) setIsTracking(true);
      })
      .catch((error) => {
        createAppError(error, PRESENCE_ERROR_CONTEXT.track);
      });

    return () => {
      cancelled = true;
      setIsTracking(false);
    };
  }, [channel, user?.id]);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  const getLastSeen = useCallback((userId: string) => lastSeen.get(userId), [lastSeen]);

  return {
    onlineUsers,
    isOnline,
    isTracking,
    onlineCount: onlineUsers.size,
    lastSeen,
    getLastSeen,
  };
}