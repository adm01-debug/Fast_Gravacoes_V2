import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLoginLockouts } from './useLoginLockouts';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));

const futuro = new Date(Date.now() + 3_600_000).toISOString();
const passado = new Date(Date.now() - 3_600_000).toISOString();

const bloqueio = (id: string, lockedUntil: string | null) => ({
  id,
  identifier: id + '@empresa.com',
  identifier_type: 'email',
  failed_attempts: 0,
  last_failed_at: passado,
  locked_until: lockedUntil,
  lockout_count: 2,
});

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useLoginLockouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockImplementation((fn: string) => {
      if (fn === 'list_login_lockouts') {
        return Promise.resolve({
          data: [bloqueio('ativo', futuro), bloqueio('expirado', passado)],
          error: null,
        });
      }
      return Promise.resolve({ data: true, error: null });
    });
  });

  it('lista os bloqueios e conta apenas os que estao valendo', async () => {
    const { result } = renderHook(() => useLoginLockouts(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mocks.rpc).toHaveBeenCalledWith('list_login_lockouts', { p_limit: 50 });
    expect(result.current.lockouts).toHaveLength(2);
    expect(result.current.ativos).toBe(1);
  });

  it('libera o bloqueio pela RPC e recarrega a lista', async () => {
    const { result } = renderHook(() => useLoginLockouts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.release.mutate({ identifier: 'a@empresa.com', identifier_type: 'email' });
    });

    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith('release_login_lockout', {
        p_identifier: 'a@empresa.com',
        p_identifier_type: 'email',
      }),
    );
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith('list_login_lockouts', { p_limit: 50 }),
    );
    expect(mocks.rpc.mock.calls.filter((c) => c[0] === 'list_login_lockouts')).toHaveLength(2);
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it('avisa quando a liberacao falha', async () => {
    mocks.rpc.mockImplementation((fn: string) => {
      if (fn === 'list_login_lockouts') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: { message: 'permission denied' } });
    });

    const { result } = renderHook(() => useLoginLockouts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.release.mutate({ identifier: 'a@empresa.com', identifier_type: 'email' });
    });

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1));
    expect(String(mocks.toastError.mock.calls[0][0])).toContain('permission denied');
  });

  it('expoe o erro da listagem', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'sem permissao' } });

    const { result } = renderHook(() => useLoginLockouts(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error?.message).toBe('sem permissao');
    expect(result.current.lockouts).toEqual([]);
  });
});
