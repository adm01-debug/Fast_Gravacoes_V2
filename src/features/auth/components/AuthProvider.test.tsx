import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock useDeviceDetection hook
vi.mock('@/hooks/useDeviceDetection', () => ({
  useDeviceDetection: () => ({
    checkDevice: vi.fn().mockResolvedValue({ isNewDevice: false }),
  }),
}));

let queryClient: QueryClient;

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    
    // Default setup for onAuthStateChange
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      // Simula o INITIAL_SESSION disparado pelo Supabase no mount (sem sessão)
      queueMicrotask(() => cb('INITIAL_SESSION', null));
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    
    // Default setup for getSession
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null
    });

    // Default setup for signOut
    (supabase.auth.signOut as any).mockResolvedValue({ data: {}, error: null });

    // Default chainable mock for supabase.from()
    const chainable: Record<string, unknown> = {};
    ['select','insert','update','delete','upsert','eq','neq','gt','lt','gte','lte','in','is','order','limit','single','maybeSingle','range'].forEach(m => {
      chainable[m] = vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }));
      (chainable[m] as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
    });
    (supabase.from as any).mockReturnValue(chainable);
  });

  it('should initialize with loading state', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toBeNull();
  });


  it('should sign in successfully', async () => {
    const mockUser = { id: 'test-user', email: 'test@example.com' };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser } },
      error: null
    });
    
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { locked: false },
      error: null
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const signInResult = await result.current.signIn('test@example.com', 'password123');
      expect(signInResult.error).toBeNull();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should return blocked_by_ip error when allowlist blocks the IP', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { blocked_by_ip: true, block_reason: 'IP não está na lista de IPs permitidos' },
      error: null
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const signInResult = await result.current.signIn('test@example.com', 'password123');
      expect(signInResult.error).not.toBeNull();
      const le = signInResult.error as any;
      expect(le.blockedByIp).toBe(true);
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('should block sign-in when lockout check is rate-limited (429)', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { context: { status: 429 } }
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const signInResult = await result.current.signIn('test@example.com', 'password123');
      expect(signInResult.error).not.toBeNull();
      const le = signInResult.error as any;
      expect(le.blockedByIp).toBe(true);
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('should block sign-in when geo-blocking blocks the country', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        geo_blocked: true,
        country_code: 'RU',
        country_name: 'Russia',
        block_reason: 'País não está na lista de países permitidos',
      },
      error: null
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const signInResult = await result.current.signIn('test@example.com', 'password123');
      expect(signInResult.error).not.toBeNull();
      const le = signInResult.error as any;
      expect(le.geoBlocked).toBe(true);
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('should allow sign-in when geo-blocking allows the country', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        geo_blocked: false,
        country_code: 'BR',
        country_name: 'Brazil',
      },
      error: null
    });

    const mockUser = { id: 'test-user', email: 'test@example.com' };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser } },
      error: null
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const signInResult = await result.current.signIn('test@example.com', 'password123');
      expect(signInResult.error).toBeNull();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should re-check lockout and sign out a restored session blocked by geo/IP', async () => {
    // Sessão restaurada no boot (INITIAL_SESSION) de um país bloqueado.
    // onAuthStateChange re-gatea (não veio do fluxo password) e desloga.
    const mockUser = { id: 'restored-user', email: 'restored@example.com' };
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      queueMicrotask(() => cb('INITIAL_SESSION', { user: mockUser }));
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        geo_blocked: true,
        country_code: 'RU',
        country_name: 'Russia',
        block_reason: 'País não está na lista de países permitidos',
      },
      error: null
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'restored@example.com', action: 'check' },
      });
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  it('should NOT sign out a restored session when lockout is rate-limited (429)', async () => {
    // Cota esgotada (429) não é decisão de bloqueio: sessão existente não é
    // revogada, mesmo com a rede saturada (evita derrubar sessões válidas).
    const mockUser = { id: 'restored-user', email: 'restored@example.com' };
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      queueMicrotask(() => cb('INITIAL_SESSION', { user: mockUser }));
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { context: { status: 429 } }
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'restored@example.com', action: 'check' },
      });
    });

    // Pequena espera para garantir que o promise do gate resolveu
    await new Promise((r) => setTimeout(r, 50));
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('should sign out a NEW OAuth session when lockout is rate-limited (429)', async () => {
    // Sessão OAuth recém-emitida (SIGNED_IN) não passou pelo gate pré-login.
    // Com a cota esgotada o servidor retorna 429 sem avaliar geo/allowlist —
    // a sessão nova não pode entrar: re-gate não é fail-open para SIGNED_IN.
    const mockUser = { id: 'oauth-user', email: 'oauth@example.com' };
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null
    });
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      queueMicrotask(() => cb('SIGNED_IN', { user: mockUser }));
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { context: { status: 429 } }
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'oauth@example.com', action: 'check' },
      });
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  it('should NOT re-sign-out an already admitted session on tab refocus (429)', async () => {
    // XyDD: o SDK re-emite SIGNED_IN no tab refocus (_recoverAndRefresh) para a
    // MESMA sessão já admitida. Re-gatear nesse evento trataria a sessão válida
    // como OAuth novo e um 429 deslogaria a operadora e apagaria o rascunho.
    const mockUser = { id: 'refocus-user', email: 'refocus@example.com' };
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null
    });
    // Primeiro: sessão OAuth nova passa pelo re-gate SEM bloqueio (fica admitida).
    let signOutCalls = 0;
    (supabase.auth.signOut as any).mockImplementation(() => {
      signOutCalls++;
      return Promise.resolve({ data: {}, error: null });
    });
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      // Emite SIGNED_IN para a mesma sessão DUAS vezes (recovery + tab refocus).
      // A segunda emissão chega DEPOIS do gate da primeira resolver (sessão já
      // admitida) — assim o teste valida o cenário real de tab refocus.
      queueMicrotask(() => cb('SIGNED_IN', { user: mockUser, access_token: 'tok-1' }));
      setTimeout(() => cb('SIGNED_IN', { user: mockUser, access_token: 'tok-1' }), 50);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    // Primeira chamada do gate: permitido. A partir daí, 429 (cota esgotada).
    let gateCalls = 0;
    (supabase.functions.invoke as any).mockImplementation(() => {
      gateCalls++;
      if (gateCalls === 1) {
        return Promise.resolve({
          data: { geo_blocked: false, blocked_by_ip: false },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { context: { status: 429 } } });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    renderHook(() => useAuth(), { wrapper });

    // Sessão admitida na primeira emissão; a segunda (refocus) não re-gateia.
    await new Promise((r) => setTimeout(r, 100));
    expect(signOutCalls).toBe(0);
    expect(gateCalls).toBe(1);
  });

  it('should sign out successfully', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
