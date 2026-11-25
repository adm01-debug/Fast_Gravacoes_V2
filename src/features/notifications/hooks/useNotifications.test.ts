import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          { id: '1', title: 'Test Notif', body: 'Test body', status: 'unread', created_at: new Date().toISOString(), data: {} }
        ],
        error: null
      }),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and transform notifications correctly', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe('Test Notif');
    expect(result.current.notifications[0].message).toBe('Test body');
    expect(result.current.notifications[0].id).toBe('push-1');
  });

  it('should handle unread count', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const orSpy = vi.fn().mockReturnThis();
    // Encadeavel e aguardavel ao mesmo tempo, como o builder real: a consulta da
    // lista segue com `.order()`/`.limit()`, e a do contador termina no proprio
    // builder (`head: true`). Uma Promise pura em `.is()` quebrava a lista em
    // silencio (o `catch` do hook devolvia lista vazia).
    type Encadeavel = {
      order: () => Encadeavel;
      limit: () => Promise<{ data: unknown[]; error: null }>;
      then: (onFulfilled: (valor: unknown) => unknown) => Promise<unknown>;
    };
    const isChain: Encadeavel = {
      order: () => isChain,
      limit: () => Promise.resolve({ data: [], error: null }),
      then: (onFulfilled) => Promise.resolve({ data: [], count: 5, error: null }).then(onFulfilled),
    };
    const isSpy = vi.fn((_coluna?: string) => isChain);
    // @ts-expect-error mock override em cliente Supabase tipado
    supabase.from.mockImplementation((table: string) => {
      if (table === 'push_notifications') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          or: orSpy,
          is: isSpy,
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(5));

    // O marcador interno de dedupe do e-mail não é aviso ao usuário e não
    // aparece na Central de Notificações: contá-lo deixava o sino com badge
    // que nenhuma tela mostrava.
    const filtro = String(orSpy.mock.calls[0]?.[0] ?? '');
    expect(filtro).toContain('data->>type.is.null');
    expect(filtro).toContain('data->>type.neq.cron_email_sent');
    // Aviso dispensado fica no banco (dedupe) mas nao pode inflar o sino.
    expect(isSpy.mock.calls[0]?.[0]).toBe('data->>dismissed_at');
  });

  it('nao mostra avisos da conta anterior ao trocar de sessao', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    let authListener: ((evento: string, sessao: unknown) => void) | undefined;

    // @ts-expect-error mock override em cliente Supabase tipado
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'conta-a' } }, error: null });
    // @ts-expect-error mock override em cliente Supabase tipado
    supabase.auth.onAuthStateChange.mockImplementation((cb: (evento: string, sessao: unknown) => void) => {
      authListener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Cada consulta devolve o aviso da conta que foi filtrada no `.eq`.
    // @ts-expect-error mock override em cliente Supabase tipado
    supabase.from.mockImplementation(() => {
      let conta = '';
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (coluna: string, valor: string) => {
          if (coluna === 'user_id') conta = valor;
          return chain;
        },
        neq: () => chain,
        or: () => chain,
        is: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({
          data: [{
            id: conta,
            title: `Aviso de ${conta}`,
            body: 'corpo',
            status: 'unread',
            created_at: new Date().toISOString(),
            data: {},
          }],
          error: null,
        }),
      };
      return chain;
    });

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.notifications[0]?.title).toBe('Aviso de conta-a'));

    act(() => {
      authListener?.('SIGNED_IN', { user: { id: 'conta-b' } });
    });

    // Sem o id na chave do cache o hook continuaria exibindo a lista da conta-a.
    await waitFor(() => expect(result.current.notifications[0]?.title).toBe('Aviso de conta-b'));
    expect(result.current.notifications).toHaveLength(1);
  });

  it('deve dispensar alerta de rotina sem apagar a linha do dedupe', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const eqChain: { eq: () => unknown; then: (onFulfilled: (v: unknown) => unknown) => Promise<unknown> } = {
      eq: () => eqChain,
      then: (onFulfilled) => Promise.resolve({ error: null }).then(onFulfilled),
    };
    const updateSpy = vi.fn((_payload: unknown) => eqChain);

    // @ts-expect-error mock override em cliente Supabase tipado
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: updateSpy,
    }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useNotifications(), { wrapper });

    result.current.dismissNotification({ id: 'push-abc', metadata: { type: 'cron_alert', jobid: 'job-1' } });

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());

    const payload = updateSpy.mock.calls[0]?.[0] as unknown as { status: string; data: Record<string, unknown> };
    expect(payload.status).toBe('read');
    expect(payload.data.dismissed_at).toBeTruthy();
    // O item dispensado é um aviso que a Central realmente mostra
    // (`cron_email_sent` é filtrado dela) e a coleta de saúde usa `jobid`
    // para não reenviar o mesmo alerta: a dispensa preserva os dois campos.
    expect(payload.data.type).toBe('cron_alert');
    expect(payload.data.jobid).toBe('job-1');
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['push-notifications-history'] })
    );
  });

  it('abre um unico pop-up quando varias instancias do hook recebem o mesmo INSERT', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('sonner');
    const listeners: Array<(payload: unknown) => void> = [];

    // @ts-expect-error mock override em cliente Supabase tipado
    supabase.channel.mockImplementation(() => {
      const ch: Record<string, unknown> = {};
      ch.on = vi.fn((_event: string, _config: unknown, cb: (payload: unknown) => void) => {
        listeners.push(cb);
        return ch;
      });
      ch.subscribe = vi.fn(() => ch);
      return ch;
    });

    // Duas instancias montadas em paralelo, como no app (layout + barra lateral).
    const wrapper = createWrapper();
    renderHook(() => useNotifications(), { wrapper });
    renderHook(() => useNotifications(), { wrapper });

    // O canal e' compartilhado por nome: as duas instancias registram listeners
    // no mesmo fanout, e cada INSERT e' repassado a todas elas.
    await waitFor(() => expect(listeners.length).toBe(1));

    await act(async () => {
      const payload = { new: { id: 'dedupe-1', title: 'Falha no alerta', body: 'Widget sem dados' } };
      listeners[0](payload);
      listeners[0](payload);
    });

    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it('nao abre pop-up para o marcador interno de e-mail', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('sonner');
    const listeners: Array<(payload: unknown) => void> = [];

    // @ts-expect-error mock override em cliente Supabase tipado
    supabase.channel.mockImplementation(() => {
      const ch: Record<string, unknown> = {};
      ch.on = vi.fn((_event: string, _config: unknown, cb: (payload: unknown) => void) => {
        listeners.push(cb);
        return ch;
      });
      ch.subscribe = vi.fn(() => ch);
      return ch;
    });

    renderHook(() => useNotifications(), { wrapper: createWrapper() });
    // O canal e' recriado quando o userId chega (nome muda), entao o listener
    // mais recente e' o que o app usa depois da sessao resolvida.
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    const ouvir = listeners[listeners.length - 1];

    await act(async () => {
      ouvir({
        new: { id: 'marcador-1', title: 'Email enviado', body: 'controle', data: { type: 'cron_email_sent' } },
      });
    });
    expect(toast.info).not.toHaveBeenCalled();

    await act(async () => {
      ouvir({
        new: { id: 'aviso-1', title: 'Falha na coleta', body: 'Widget sem dados', data: { type: 'cron_alert' } },
      });
    });
    expect(toast.info).toHaveBeenCalledTimes(1);
  });
});