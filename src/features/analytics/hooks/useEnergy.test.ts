import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEnergy } from './useEnergy';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('@/lib/errorHandling', () => ({ showErrorToast: vi.fn() }));

// Chaves de consulta identificam cada chamada do hook
const KEY_CONSUMPTION = 'consumption';
const KEY_PREV = 'prev';
const KEY_ALERTS = 'alerts';
const KEY_TARGETS = 'targets';

type Resp = { data?: unknown[]; error?: { message: string } } | unknown[];

function setup(responses: Map<string, Resp>) {
  // from() é chamado com a tabela; seleciona qual resposta pelo campo usado
  vi.mocked(supabase.from).mockImplementation((tbl: string) => {
    const b: Record<string, any> = {
      _tbl: tbl,
      select(cols: string) {
        b._cols = cols;
        return b;
      },
      gte() { return b; },
      lte() { return b; },
      eq() { return b; },
      order() { return b; },
      limit() { return b; },
      async then(resolve: (v: any) => void) {
        let key: string;
        if (b._tbl === 'energy_alerts') key = KEY_ALERTS;
        else if (b._tbl === 'energy_targets') key = KEY_TARGETS;
        else key = (b._cols || '').includes('*') ? KEY_CONSUMPTION : KEY_PREV;
        const entry = responses.get(key)!;
        if (Array.isArray(entry)) resolve({ data: entry, error: null });
        else resolve(entry);
      },
    };
    return b;
  });
}

function makeWrapper(queryClient?: QueryClient) {
  const client = queryClient || new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useEnergy (F-007 contrato)', () => {
  it('enabled=false oculta dados ja carregados do cache e nao refaz fetch', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const callCount = { consumption: 0, prev: 0 };
    vi.mocked(supabase.from).mockImplementation((tbl: string) => {
      const b: Record<string, any> = {
        _tbl: tbl,
        select(cols: string) {
          if (tbl === 'energy_consumption' && cols.includes('*')) callCount.consumption += 1;
          return b;
        },
        gte() { return b; },
        lte() { return b; },
        eq() { return b; },
        order() { return b; },
        limit() { return b; },
        async then(resolve: (v: any) => void) {
          resolve({ data: [], error: null });
        },
      };
      return b;
    });

    // Primeiro carrega dados de verdade no cache (enabled=true)
    const first = renderHook(() => useEnergy(), { wrapper: makeWrapper(queryClient) });
    await waitFor(() => expect(callCount.consumption).toBeGreaterThan(0));
    first.unmount();

    // Com enabled=false, dados carregados nao podem vazar para stats/arrays
        callCount.consumption = 0;
    const second = renderHook(() => useEnergy(undefined, { enabled: false }), { wrapper: makeWrapper(queryClient) });
        await waitFor(() => expect(callCount.consumption).toBe(0));
    expect(second.result.current.stats.totalConsumption).toBe(0);
    expect(second.result.current.stats.totalCost).toBe(0);
    expect(second.result.current.stats.consumptionByMachine).toEqual([]);
    expect(second.result.current.stats.dailyConsumption).toEqual([]);
    expect(second.result.current.consumption).toEqual([]);
    expect(second.result.current.alerts).toEqual([]);
    expect(second.result.current.targets).toEqual([]);
    expect(second.result.current.stats.hourlyPattern.every((h) => h.avgConsumption === 0)).toBe(true);
    expect(second.result.current.hasError).toBe(false);
    second.unmount();
  });

  it('falha em alerts/targets nao acende hasError nem esconde o consumo real', async () => {
    const consumptionRow = { id: 'c1', consumption_kwh: 10, total_cost: 5, recorded_at: new Date().toISOString() };
    setup(new Map([
      [KEY_CONSUMPTION, [consumptionRow]],
      [KEY_PREV, [{ total_cost: 20 }]],
      [KEY_ALERTS, { error: { message: 'RLS denied' } }],
      [KEY_TARGETS, { error: { message: 'RLS denied' } }],
    ]));
    const { result } = renderHook(() => useEnergy(undefined, { enabled: true }), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // A falha auxiliar nao acende o erro nem zera o total carregado
    expect(result.current.hasError).toBe(false);
    expect(result.current.stats.totalConsumption).toBe(10);
    expect(result.current.stats.totalCost).toBe(5);
    expect(result.current.alerts).toEqual([]);
    expect(result.current.targets).toEqual([]);
  });

  it('falha na consulta principal de consumo acende hasError', async () => {
    setup(new Map([
      [KEY_CONSUMPTION, { error: { message: 'RLS denied' } }],
      [KEY_PREV, []],
      [KEY_ALERTS, []],
      [KEY_TARGETS, []],
    ]));
    const { result } = renderHook(() => useEnergy(undefined, { enabled: true }), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.hasError).toBe(true));
  });
});


