import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useKPIAlerts } from './useKPIAlerts';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

type Resultado = { data: unknown; error: { message: string } | null; count: number | null };

function consulta(resultado: Resultado) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => Promise.resolve(resultado),
  };
  return builder;
}

const alerta = (id: string, severity: string) => ({
  id,
  machine_id: null,
  metric_name: 'oee',
  metric_value: 61.5,
  threshold: 75,
  severity,
  is_resolved: false,
  created_at: '2026-08-04T10:00:00Z',
});

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useKPIAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista os alertas abertos com o total exato', async () => {
    mocks.from.mockReturnValue(consulta({
      data: [alerta('a1', 'critical'), alerta('a2', 'warning')],
      error: null,
      count: 42,
    }));

    const { result } = renderHook(() => useKPIAlerts(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mocks.from).toHaveBeenCalledWith('kpi_alerts');
    expect(result.current.alertas).toHaveLength(2);
    expect(result.current.total).toBe(42);
    expect(result.current.alertas[0].severity).toBe('critical');
  });

  it('resolve um alerta pela RPC e recarrega a lista', async () => {
    mocks.from.mockReturnValue(consulta({ data: [alerta('a1', 'critical')], error: null, count: 1 }));
    mocks.rpc.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useKPIAlerts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.resolveAlert.mutate('a1');
    });

    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith('resolve_kpi_alert', { p_alert_id: 'a1' }),
    );
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('expoe o erro da consulta', async () => {
    mocks.from.mockReturnValue(consulta({ data: null, error: { message: 'sem permissao' }, count: null }));

    const { result } = renderHook(() => useKPIAlerts(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error?.message).toBe('sem permissao');
    expect(result.current.alertas).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('avisa quando a resolucao falha', async () => {
    mocks.from.mockReturnValue(consulta({ data: [], error: null, count: 0 }));
    mocks.rpc.mockResolvedValue({ error: { message: 'permission denied' } });

    const { result } = renderHook(() => useKPIAlerts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.resolveAlert.mutate('a9');
    });

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1));
    expect(String(mocks.toastError.mock.calls[0][0])).toContain('permission denied');
  });
});
