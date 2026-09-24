import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import {
  useProductionLots,
  useProductionLot,
  useLotComponents,
  useLotMovements,
  useLotInspections,
  useLotGenealogy,
  useTraceabilityMutations,
  useSearchLots,
} from './useTraceability';
import { supabase } from '@/integrations/supabase/client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useProductionLots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca lotes de produção com o job vinculado, mais recentes primeiro', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'lot-1' }], error: null });
    const select = vi.fn(() => ({ order }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useProductionLots(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('production_lots');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual([{ id: 'lot-1' }]);
  });
});

describe('useProductionLot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não consulta o Supabase quando lotId é null', async () => {
    const { result } = renderHook(() => useProductionLot(null), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('busca um lote específico por id', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'lot-1' }, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useProductionLot('lot-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eq).toHaveBeenCalledWith('id', 'lot-1');
    expect(result.current.data).toEqual({ id: 'lot-1' });
  });
});

describe('useLotComponents / useLotMovements / useLotInspections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useLotComponents não consulta quando lotId é null e retorna array vazio', async () => {
    const { result } = renderHook(() => useLotComponents(null), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('useLotComponents busca componentes de um lote existente', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'comp-1' }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLotComponents('lot-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('lot_components');
    expect(result.current.data).toEqual([{ id: 'comp-1' }]);
  });

  it('useLotMovements busca movimentações do lote', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'mv-1' }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLotMovements('lot-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('lot_movements');
    expect(result.current.data).toEqual([{ id: 'mv-1' }]);
  });

  it('useLotInspections busca inspeções de qualidade do lote', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'insp-1' }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLotInspections('lot-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('lot_quality_inspections');
    expect(result.current.data).toEqual([{ id: 'insp-1' }]);
  });
});

describe('useLotGenealogy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não consulta o Supabase quando lotId é null', async () => {
    const { result } = renderHook(() => useLotGenealogy(null), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('monta pais e filhos a partir de lot_components (genealogia de lote)', async () => {
    const parentEq = vi.fn().mockResolvedValue({ data: [{ id: 'rel-parent' }], error: null });
    const childEq = vi.fn().mockResolvedValue({ data: [{ id: 'rel-child' }], error: null });
    let selectCallCount = 0;
    const select = vi.fn(() => {
      selectCallCount += 1;
      return { eq: selectCallCount === 1 ? parentEq : childEq };
    });
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLotGenealogy('lot-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(parentEq).toHaveBeenCalledWith('lot_id', 'lot-1');
    expect(childEq).toHaveBeenCalledWith('component_lot_id', 'lot-1');
    expect(result.current.data).toEqual({ parents: [{ id: 'rel-parent' }], children: [{ id: 'rel-child' }] });
  });

  it('retorna listas vazias (não null) quando o lote não é usado nem tem componentes', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ eq }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLotGenealogy('lot-isolado'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ parents: [], children: [] });
  });

  it('propaga erro ao buscar os componentes (pais)', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: new Error('falha ao buscar genealogia') });
    const select = vi.fn(() => ({ eq }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useLotGenealogy('lot-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useTraceabilityMutations', () => {
  beforeEach(() => vi.clearAllMocks());

  function mockInsert(errorResult: unknown = null) {
    const insert = vi.fn().mockResolvedValue({ error: errorResult });
    (supabase.from as unknown as Mock).mockReturnValue({ insert });
    return insert;
  }

  it('createLot insere um novo lote', async () => {
    const insert = mockInsert();
    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    const payload = { lot_number: 'LT-001', product_name: 'Camiseta P', quantity: 100 };
    await act(async () => {
      await result.current.createLot.mutateAsync(payload);
    });

    expect(supabase.from).toHaveBeenCalledWith('production_lots');
    expect(insert).toHaveBeenCalledWith(payload);
  });

  it('createLot propaga erro do Supabase (ex.: lot_number duplicado)', async () => {
    mockInsert(new Error('lote duplicado: LT-001 já existe'));
    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    await expect(
      result.current.createLot.mutateAsync({ lot_number: 'LT-001', product_name: 'Camiseta P', quantity: 100 })
    ).rejects.toThrow('lote duplicado');
  });

  it('updateLot remove o campo `job` (relação) antes de atualizar', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    (supabase.from as unknown as Mock).mockReturnValue({ update });

    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.updateLot.mutateAsync({
        id: 'lot-1',
        status: 'completed',
        job: { order_number: 'OS-1', client: 'Cliente', product: 'Camiseta' },
      });
    });

    expect(update).toHaveBeenCalledWith({ status: 'completed' });
    expect(eq).toHaveBeenCalledWith('id', 'lot-1');
  });

  it('addComponent adiciona um componente sem lote de origem (matéria-prima sem rastreabilidade de lote)', async () => {
    const insert = mockInsert();
    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    const payload = { lot_id: 'lot-1', component_name: 'Tinta genérica', quantity_used: 2 };
    await act(async () => {
      await result.current.addComponent.mutateAsync(payload);
    });

    expect(insert).toHaveBeenCalledWith(payload);
    expect((payload as { component_lot_id?: string }).component_lot_id).toBeUndefined();
  });

  it('addComponent adiciona um componente rastreado a partir de outro lote', async () => {
    const insert = mockInsert();
    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    const payload = {
      lot_id: 'lot-2',
      component_name: 'Tecido lote A',
      quantity_used: 5,
      component_lot_id: 'lot-A',
    };
    await act(async () => {
      await result.current.addComponent.mutateAsync(payload);
    });

    expect(insert).toHaveBeenCalledWith(payload);
  });

  it('addMovement registra uma movimentação de lote com quantidade zero (ajuste sem deslocamento físico)', async () => {
    const insert = mockInsert();
    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    const payload = { lot_id: 'lot-1', movement_type: 'ADJUST', quantity: 0 };
    await act(async () => {
      await result.current.addMovement.mutateAsync(payload);
    });

    expect(insert).toHaveBeenCalledWith(payload);
  });

  it('addMovement propaga erro do Supabase', async () => {
    mockInsert(new Error('lote não encontrado'));
    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    await expect(
      result.current.addMovement.mutateAsync({ lot_id: 'lot-404', movement_type: 'OUT', quantity: 10 })
    ).rejects.toThrow('lote não encontrado');
  });

  it('addInspection registra uma inspeção de qualidade', async () => {
    const insert = mockInsert();
    const { result } = renderHook(() => useTraceabilityMutations(), { wrapper: createWrapper() });

    const payload = { lot_id: 'lot-1', inspection_type: 'visual', result: 'approved' };
    await act(async () => {
      await result.current.addInspection.mutateAsync(payload);
    });

    expect(insert).toHaveBeenCalledWith(payload);
  });
});

describe('useSearchLots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não consulta o Supabase quando o termo tem menos de 2 caracteres', async () => {
    const { result } = renderHook(() => useSearchLots('a'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('busca lotes com termo simples usando o padrão ilike sem aspas', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'lot-1' }], error: null });
    const or = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ or }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useSearchLots('camiseta'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(or).toHaveBeenCalledWith('lot_number.ilike.%camiseta%,product_name.ilike.%camiseta%');
    expect(limit).toHaveBeenCalledWith(10);
    expect(result.current.data).toEqual([{ id: 'lot-1' }]);
  });

  it('escapa (quota) termos com caracteres estruturais do PostgREST para prevenir injeção de filtro', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const or = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ or }));
    (supabase.from as unknown as Mock).mockReturnValue({ select });

    // Termo contém vírgula e parênteses — caracteres que quebrariam a sintaxe do filtro `.or()`.
    const { result } = renderHook(() => useSearchLots('LT-001,(teste)'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(or).toHaveBeenCalledWith(
      'lot_number.ilike."%LT-001,(teste)%",product_name.ilike."%LT-001,(teste)%"'
    );
  });

  it('ignora espaços nas bordas do termo de busca ao decidir se consulta (trim)', async () => {
    const { result } = renderHook(() => useSearchLots('  a  '), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
