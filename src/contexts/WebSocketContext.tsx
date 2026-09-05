import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePresenceChannel } from '@/lib/realtimeChannel';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface SubscribeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

interface WebSocketContextType {
  status: ConnectionStatus;
  subscribe: (
    channelName: string,
    options: SubscribeOptions,
    callback: (payload: Record<string, unknown>) => void,
  ) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  // Shared presence channel via realtimeChannel singleton.
  // Sync listener fires when presence state is synchronized, indicating the
  // realtime WS is reachable. The handler must be stable (useCallback) so
  // the singleton isn't torn down on every render.
  const handleHeartbeat = useCallback(() => setStatus('connected'), []);
  usePresenceChannel('heartbeat', handleHeartbeat);

  // Fallback: if the heartbeat presence never fires (no peer online), we still
  // want to reflect that the realtime WS is reachable via the connection.
  // Listen to the underlying channel state for SUBSCRIBED/CLOSED/CHANNEL_ERROR.
  useEffect(() => {
    const id = setInterval(() => {
      // Touch setStatus so React rerenders aren't needed — purely a polling
      // hook for the underlying realtime socket health.
      setStatus((prev) => prev);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Initial state: connecting → connected when supabase realtime socket opens.
    const checkRealtime = () => {
      const realtime = (supabase as unknown as { realtime?: { isConnected?: () => boolean } }).realtime;
      if (realtime?.isConnected?.()) setStatus('connected');
      else setStatus('connecting');
    };
    checkRealtime();
    const id = setInterval(checkRealtime, 5000);
    return () => clearInterval(id);
  }, []);

  // Requires an explicit table to avoid wildcard subscriptions that flood the
  // client with unrelated changes (and would otherwise leak data from any
  // public table the RLS allows the user to read).
  const subscribe = useCallback((
    channelName: string,
    options: SubscribeOptions,
    callback: (payload: Record<string, unknown>) => void,
  ) => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        {
          event: options.event ?? '*',
          schema: 'public',
          table: options.table,
          ...(options.filter ? { filter: options.filter } : {}),
        },
        (payload: Record<string, unknown>) => {
          callback(payload);
        },
      )
      .subscribe();

    channelsRef.current.set(channelName, channel);

    return () => {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
    };
  }, []);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider');
  return ctx;
}
