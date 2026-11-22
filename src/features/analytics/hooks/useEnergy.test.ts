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

function createBuilder(responses: Map<string, Resp>) {
  const builder: Record<string, any> = {
    _selectCols: '',
    select(cols: string) {
      builder._selectCols = cols;
      return builder;
    },
    gte() { return builder; },
    lte() { return builder; },
    eq() { return builder; },
    order() { return builder; },
    limit() { return builder; },
    async then(resolve: (v: any) => void) {
      const key = builder._selectCols.includes('*') ? KEY_CONSUMPTION : KEY_PREV;
      const entry = responses.get(key)!;
      if (Array.isArray(entry)) resolve({ data: entry, error: null });
      else resolve(entry);
    },
  };
  return builder;
}

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

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useEnergy (F-007 contrato)', () => {
  it('enabled=false zera stats e arrays, sem fetch, hasError false', async () => {
    // Cache pré-existente nas queries não deve vazar para stats:
    // como enabled=false, o mock nem precisa ser chamado de fato.
    setup(new Map([
      [KEY_CONSUMPTION, [{ id: 'c1', consumption_kwh: 10, total_cost: 5, recorded_at: new Date().toISOString() }]],
      [KEY_PREV, [{ total_cost: 20 }]],
      [KEY_ALERTS, [{ id: 'a1' }]],
      [KEY_TARGETS, [{ id: 't1' }]],
    ]));
    const { result } = renderHook(() => useEnergy(undefined, { enabled: false }), { wrapper: makeWrapper() });

    expect(result.current.stats.totalConsumption).toBe(0);
    expect(result.current.stats.totalCost).toBe(0);
    expect(result.current.stats.consumptionByMachine).toEqual([]);
    expect(result.current.stats.dailyConsumption).toEqual([]);
    expect(result.current.consumption).toEqual([]);
    expect(result.current.alerts).toEqual([]);
    expect(result.current.targets).toEqual([]);
    expect(result.current.stats.hourlyPattern.every((h) => h.avgConsumption === 0)).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('falha apenas em alerts/targets nao acende hasError nem esconde total zero', async () => {
    setup(new Map([
      [KEY_CONSUMPTION, []],
      [KEY_PREV, []],
      [KEY_ALERTS, { error: { message: 'RLS denied' } }],
      [KEY_TARGETS, { error: { message: 'RLS denied' } }],
    ]));
    const { result } = renderHook(() => useEnergy(undefined, { enabled: true }), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasError).toBe(false);
    expect(result.current.stats.totalConsumption).toBe(0);
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


