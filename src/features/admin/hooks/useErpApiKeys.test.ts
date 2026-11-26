import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { generateErpApiKey, hashErpApiKey, useErpApiKeys } from './useErpApiKeys';

const mocks = vi.hoisted(() => ({
  store: {
    linhas: [] as Array<Record<string, unknown>>,
    inseridos: [] as Array<Record<string, unknown>>,
    atualizados: [] as Array<Record<string, unknown>>,
    idRevogado: null as string | null,
  },
  order: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  getUser: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ order: mocks.order }),
      insert: mocks.insert,
      update: mocks.update,
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useErpApiKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.linhas = [];
    mocks.store.inseridos = [];
    mocks.store.atualizados = [];
    mocks.store.idRevogado = null;
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.order.mockImplementation(() => Promise.resolve({ data: mocks.store.linhas, error: null }));
    mocks.insert.mockImplementation((linha: Record<string, unknown>) => {
      mocks.store.inseridos.push(linha);
      return Promise.resolve({ error: null });
    });
    mocks.update.mockImplementation((patch: Record<string, unknown>) => {
      mocks.store.atualizados.push(patch);
      return {
        eq: (coluna: string, valor: string) => {
          mocks.store.idRevogado = valor;
          return Promise.resolve({ error: null });
        },
      };
    });
  });

  it('gera chave com prefixo e 48 caracteres hexadecimais, sempre diferente', () => {
    const primeira = generateErpApiKey();
    const segunda = generateErpApiKey();
    expect(primeira).toMatch(/^fgv_live_[0-9a-f]{48}$/);
    expect(primeira).not.toBe(segunda);
  });

  it('calcula SHA-256 hexadecimal igual ao hashKey da edge function erp-api', async () => {
    // Vetor publico do SHA-256 de "abc".
    await expect(hashErpApiKey('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('lista as chaves e conta apenas as ativas', async () => {
    mocks.store.linhas = [
      { id: 'k1', name: 'Promo Design', is_active: true, created_at: '2026-11-23T23:42:23Z', last_used_at: null, created_by: null },
      { id: 'k2', name: 'Antiga', is_active: false, created_at: '2026-11-20T10:00:00Z', last_used_at: '2026-11-21T10:00:00Z', created_by: 'user-9' },
    ];

    const { result } = renderHook(() => useErpApiKeys(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.keys).toHaveLength(2);
    expect(result.current.ativas).toBe(1);
  });

  it('grava o hash da chave gerada e devolve a chave crua uma unica vez', async () => {
    const { result } = renderHook(() => useErpApiKeys(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const chaveCrua = await result.current.create.mutateAsync('Promo Design');

    expect(chaveCrua).toMatch(/^fgv_live_[0-9a-f]{48}$/);
    expect(mocks.store.inseridos).toHaveLength(1);
    const inserido = mocks.store.inseridos[0];
    expect(inserido.name).toBe('Promo Design');
    expect(inserido.is_active).toBe(true);
    expect(inserido.created_by).toBe('user-1');
    expect(inserido.key_hash).toBe(await hashErpApiKey(chaveCrua));
    // A chave crua nunca vai para o banco.
    expect(JSON.stringify(inserido)).not.toContain(chaveCrua);
  });

  it('revoga marcando is_active = false na chave escolhida', async () => {
    const { result } = renderHook(() => useErpApiKeys(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.revoke.mutateAsync('k2');

    expect(mocks.store.atualizados).toEqual([{ is_active: false }]);
    expect(mocks.store.idRevogado).toBe('k2');
  });
});