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
    const chain = () => chainable;
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
