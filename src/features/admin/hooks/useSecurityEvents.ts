import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import type { SecurityEvent, BlockedIP } from './useRateLimitLogs';

export function useRealtimeSecurityEvents() {
  const { isCoordinator, isManager } = useAuth();
  const [newEvents, setNewEvents] = useState<SecurityEvent[]>([]);

  // So INSERT: a publicacao entrega tambem DELETE (limpeza diaria de eventos
    // com mais de 180 dias) e UPDATE. Tratar tudo como evento novo colocava na
    // tela registros sem dados e gerava alerta de exclusao.
    useRealtimeChannel('security-events-realtime', [{ table: 'security_events', event: 'INSERT' }], (payload) => {
    if (!isCoordinator && !isManager) return;
      if (payload.eventType !== 'INSERT') return;
    const event = payload.new as unknown as SecurityEvent;
    setNewEvents(prev => [event, ...prev].slice(0, 50));
    if (event.severity === 'critical' || event.severity === 'error' || event.severity === 'high') {
      toast.error(`Alerta de Segurança: ${event.event_type}`, {
        description: (event.details?.message as string | undefined) || 'Verifique o painel de segurança',
        duration: 10000,
      });
    } else if (event.severity === 'warning' || event.severity === 'medium') {
      toast.warning(`Aviso de Segurança: ${event.event_type}`, {
        description: event.details?.message as string | undefined,
        duration: 5000,
      });
    }
  });

  return { newEvents, clearEvents: () => setNewEvents([]) };
}

export function useRealtimeBlockedIPs() {
  const { isCoordinator, isManager } = useAuth();
  const [newBlocks, setNewBlocks] = useState<BlockedIP[]>([]);

  // INSERT apenas: desbloquear um IP e um UPDATE (unblocked_at) e o monitor
    // recolocava o IP na lista de bloqueios ativos logo depois do desbloqueio.
    useRealtimeChannel('blocked-ips-realtime', [{ table: 'blocked_ips', event: 'INSERT' }], (payload) => {
    if (!isCoordinator && !isManager) return;
      if (payload.eventType !== 'INSERT') return;
    const block = payload.new as unknown as BlockedIP;
      if (block.unblocked_at) return;
    setNewBlocks(prev => [block, ...prev].slice(0, 20));
    toast.warning(`IP Bloqueado: ${block.ip_address}`, {
      description: block.reason,
      duration: 8000,
    });
  });

  return { newBlocks, clearBlocks: () => setNewBlocks([]) };
}

export function logSecurityEvent(
  eventType: string,
  severity: 'info' | 'warning' | 'error' | 'critical',
  details?: Record<string, unknown>
) {
  return supabase.from('security_events').insert([{
    event_type: eventType,
    severity,
    details: (details || {}) as import('@/integrations/supabase/types').Json,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  }]);
}
