import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import { useInventory, useInventoryMovements, InventoryMovement } from './useInventory';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const authedUser = { id: 'user-1' };

interface FromOptions {
  items?: unknown[];
  movements?: unknown[];
  movementsError?: unknown;
  stockCheck?: { current_stock: number; name: string } | null;
  stockCheckError?: unknown;
  insertResult?: { data?: unknown; error?: unknown };
  insertBulkError?: unknown;
  deleteError?: unknown;
  updateInError?: unknown;
}

/**
 * Builds a `supabase.from` mock that understands every real query shape used
 * by `useInventory`/`useInventoryMovements`, dispatching on table name and
 * (for `inventory_items`) on the requested columns — mirroring the two
 * distinct `.select()` call sites in the hook (item list vs. stock check).
 */
function mockSupabaseFrom(opts: FromOptions = {}) {
  // inventory_items
  const listOrder = vi.fn().mockResolvedValue({ data: opts.items ?? [], error: null });
  const stockSingle = vi.fn().mockResolvedValue({
    data: opts.stockCheck ?? null,
    error: opts.stockCheckError ?? null,
  });
  const stockEq = vi.fn(() => ({ single: stockSingle }));
  const itemsSelect = vi.fn((columns?: string) => {
    if (typeof columns === 'string' && columns.includes('current_stock')) {
      return { eq: stockEq };
    }
    return { order: listOrder };
  });
  const itemsUpdateIn = vi.fn().mockResolvedValue({ error: opts.updateInError ?? null });
  const itemsUpdate = vi.fn(() => ({ in: itemsUpdateIn }));

  // inventory_movements
  const movementsEq = vi.fn().mockResolvedValue({ data: opts.movements ?? [], error: opts.movementsError ?? null });
  const movementsOrderReturn: Record<string, unknown> & { eq: typeof movementsEq } = {
    data: opts.movements ?? [],
    error: opts.movementsError ?? null,
    eq: movementsEq,
  };
  const movementsOrder = vi.fn(() => movementsOrderReturn);
  const movementsSelect = vi.fn(() => ({ order: movementsOrder }));

  const insertSingle = vi.fn().mockResolvedValue(opts.insertResult ?? { data: { id: 'mv-x' }, error: null });
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const movementsInsert = vi.fn(() => ({
    select: insertSelect,
    error: opts.insertBulkError ?? null,
    data: null,
  }));

  const deleteEq = vi.fn().mockResolvedValue({ error: opts.deleteError ?? null });
  const movementsDelete = vi.fn(() => ({ eq: deleteEq }));

  (supabase.from as unknown as Mock).mockImplementation((table: string) => {
    if (table === 'inventory_items') {
      return { select: itemsSelect, update: itemsUpdate };
    }
    if (table === 'inventory_movements') {
      return { select: movementsSelect, insert: movementsInsert, delete: movementsDelete };
    }
    throw new Error(`tabela inesperada: ${table}`);
  });

  return {
    itemsSelect, listOrder, stockEq, stockSingle, itemsUpdate, itemsUpdateIn,
    movementsSelect, movementsOrder, movementsEq, movementsInsert, insertSelect, insertSingle,
    movementsDelete, deleteEq,
  };
}

function baseMovement(overrides: Partial<Omit<InventoryMovement, 'id' | 'created_at' | 'user_id'>> = {}) {
  return {
    item_id: 'item-1',
    type: 'IN' as const,
    quantity: 1,
    reason: null,
    from_location: null,
    to_location: null,
    job_id: null,
    ...overrides,
  };
}

describe('useInventoryMovements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as unknown as Mock).mockReturnValue({ user: authedUser });
  });

  it('não consulta quando não há usuário autenticado', async () => {
    (useAuth as unknown as Mock).mockReturnValue({ user: null });
    const { result } = renderHook(() => useInventoryMovements(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('busca todas as movimentações ordenadas por data quando nenhum item é informado', async () => {
    const mocks = mockSupabaseFrom({ movements: [{ id: 'm1' }] });

    const { result } = renderHook(() => useInventoryMovements(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('inventory_movements');
    expect(mocks.movementsOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mocks.movementsEq).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([{ id: 'm1' }]);
  });

  it('filtra movimentações por item_id quando um itemId é informado', async () => {
    const mocks = mockSupabaseFrom({ movements: [] });

    const { result } = renderHook(() => useInventoryMovements('item-9'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mocks.movementsEq).toHaveBeenCalledWith('item_id', 'item-9');
  });

  it('propaga o erro do Supabase', async () => {
    mockSupabaseFrom({ movementsError: new Error('falha de rede') });

    const { result } = renderHook(() => useInventoryMovements(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as unknown as Mock).mockReturnValue({ user: authedUser });
  });

  it('calcula stats (valor do estoque e movimentações nas últimas 24h)', async () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1h atrás
    const old = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 2 dias atrás

    mockSupabaseFrom({
      items: [
        { id: '1', current_stock: 10, price_per_unit: 5 },
        { id: '2', current_stock: 2, price_per_unit: 3 },
      ],
      movements: [
        { id: 'm1', created_at: recent },
        { id: 'm2', created_at: old },
      ],
    });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.stats.movementsCount24h).toBe(1));

    expect(result.current.stats.inventoryValue).toBe(10 * 5 + 2 * 3);
  });

  it('trata item sem price_per_unit (falsy) como zero no cálculo do valor total', async () => {
    mockSupabaseFrom({ items: [{ id: '1', current_stock: 10, price_per_unit: null }] });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats.inventoryValue).toBe(0);
  });

  it('rejeita uma saída (OUT) quando a quantidade excede o estoque atual (estoque não pode ficar negativo)', async () => {
    const mocks = mockSupabaseFrom({ stockCheck: { current_stock: 3, name: 'Tinta Azul' } });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const movement = baseMovement({ type: 'OUT', quantity: 5 });

    await expect(result.current.recordMovement(movement)).rejects.toThrow('Estoque insuficiente de Tinta Azul');
    expect(mocks.movementsInsert).not.toHaveBeenCalled();
  });

  it('permite uma saída (OUT) exatamente no limite do estoque', async () => {
    const mocks = mockSupabaseFrom({ stockCheck: { current_stock: 5, name: 'Solvente' } });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const movement = baseMovement({ type: 'OUT', quantity: 5, reason: 'consumo total' });

    await act(async () => {
      await result.current.recordMovement(movement);
    });

    expect(mocks.movementsInsert).toHaveBeenCalledWith([{ ...movement, user_id: authedUser.id }]);
  });

  it('aceita uma movimentação de entrada (IN) com quantidade zero sem checar estoque', async () => {
    const mocks = mockSupabaseFrom({});

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const movement = baseMovement({ type: 'IN', quantity: 0, reason: 'ajuste de inventário' });

    await act(async () => {
      await result.current.recordMovement(movement);
    });

    // IN não passa pela validação de estoque insuficiente (só OUT passa) — eq() de checagem nunca é chamado.
    expect(mocks.stockEq).not.toHaveBeenCalled();
    expect(mocks.movementsInsert).toHaveBeenCalledWith([{ ...movement, user_id: authedUser.id }]);
  });

  it('rejeita registrar movimentação sem sessão de usuário ativa', async () => {
    (useAuth as unknown as Mock).mockReturnValue({ user: null });
    mockSupabaseFrom({});

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.recordMovement(baseMovement())).rejects.toThrow('Sessão expirada');
  });

  it('processa duas movimentações concorrentes no mesmo item de forma independente (sem deduplicar)', async () => {
    const mocks = mockSupabaseFrom({ stockCheck: { current_stock: 100, name: 'Cola' } });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const movementA = baseMovement({ type: 'OUT', quantity: 10, reason: 'a' });
    const movementB = baseMovement({ type: 'OUT', quantity: 20, reason: 'b' });

    await act(async () => {
      await Promise.all([
        result.current.recordMovement(movementA),
        result.current.recordMovement(movementB),
      ]);
    });

    // Cada chamada concorrente dispara sua própria checagem de estoque e seu próprio insert —
    // o hook não serializa nem deduplica movimentações do mesmo item.
    expect(mocks.stockEq).toHaveBeenCalledTimes(2);
    expect(mocks.movementsInsert).toHaveBeenCalledTimes(2);
  });

  it('desfaz (deleta) uma movimentação existente', async () => {
    const mocks = mockSupabaseFrom({});

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteMovement('mov-123');
    });

    expect(mocks.deleteEq).toHaveBeenCalledWith('id', 'mov-123');
  });

  it('propaga o erro ao tentar desfazer uma movimentação inexistente/duplicada', async () => {
    mockSupabaseFrom({ deleteError: new Error('movimentação não encontrada') });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.deleteMovement('mov-404')).rejects.toThrow('movimentação não encontrada');
  });

  it('transferItems retorna lista vazia e não chama o Supabase quando itemIds está vazio', async () => {
    const mocks = mockSupabaseFrom({});

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let value: string[] | undefined;
    await act(async () => {
      value = await result.current.transferItems({ fromLocation: 'A', toLocation: 'B', itemIds: [] });
    });

    expect(value).toEqual([]);
    expect(mocks.itemsUpdate).not.toHaveBeenCalled();
    expect(mocks.movementsInsert).not.toHaveBeenCalled();
  });

  it('transferItems atualiza os itens em lote e registra uma movimentação TRANSFER (quantidade 0) por item', async () => {
    const mocks = mockSupabaseFrom({});

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.transferItems({ fromLocation: 'A', toLocation: 'B', itemIds: ['i1', 'i2'] });
    });

    expect(mocks.itemsUpdate).toHaveBeenCalledWith({ location: 'B' });
    expect(mocks.itemsUpdateIn).toHaveBeenCalledWith('id', ['i1', 'i2']);
    expect(mocks.movementsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ item_id: 'i1', type: 'TRANSFER', quantity: 0, user_id: authedUser.id }),
      expect.objectContaining({ item_id: 'i2', type: 'TRANSFER', quantity: 0, user_id: authedUser.id }),
    ]);
  });

  it('transferItems rejeita quando não há usuário autenticado', async () => {
    (useAuth as unknown as Mock).mockReturnValue({ user: null });
    mockSupabaseFrom({});

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.transferItems({ fromLocation: 'A', toLocation: 'B', itemIds: ['i1'] })
    ).rejects.toThrow('Sessão expirada');
  });
});
