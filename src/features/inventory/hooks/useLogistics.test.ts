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

import { useLogistics, DbShipment } from './useLogistics';
import { supabase } from '@/integrations/supabase/client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

interface FromOptions {
  providers?: unknown[];
  shipments?: unknown[];
  insertResult?: { data?: unknown; error?: unknown };
  jobsUpdateError?: unknown;
  shipmentLookup?: { job_id: string | null } | null;
  updateError?: unknown;
}

function mockSupabaseFrom(opts: FromOptions = {}) {
  // shipping_providers
  const providersOrder = vi.fn().mockResolvedValue({ data: opts.providers ?? [], error: null });
  const providersEq = vi.fn(() => ({ order: providersOrder }));
  const providersSelect = vi.fn(() => ({ eq: providersEq }));

  // shipments (list)
  const shipmentsOrder = vi.fn().mockResolvedValue({ data: opts.shipments ?? [], error: null });
  const shipmentsListSelect = vi.fn(() => ({ order: shipmentsOrder }));

  // shipments insert -> .insert(data).select().single()
  const insertSingle = vi.fn().mockResolvedValue(opts.insertResult ?? { data: { id: 'ship-1' }, error: null });
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const shipmentsInsert = vi.fn(() => ({ select: insertSelect }));

  // shipments update -> .update(data).eq('id', id)
  const shipmentsUpdateEq = vi.fn().mockResolvedValue({ error: opts.updateError ?? null });
  const shipmentsUpdate = vi.fn(() => ({ eq: shipmentsUpdateEq }));

  // shipments lookup by id (inside updateShipment, to sync job status) -> .select('job_id').eq('id', id).single()
  const lookupSingle = vi.fn().mockResolvedValue({ data: opts.shipmentLookup ?? null, error: null });
  const lookupEq = vi.fn(() => ({ single: lookupSingle }));

  const shipmentsSelect = vi.fn((columns?: string) => {
    if (columns === 'job_id') return { eq: lookupEq };
    return { order: shipmentsOrder };
  });

  // jobs update -> .update({...}).eq('id', jobId)
  const jobsUpdateEq = vi.fn().mockResolvedValue({ error: opts.jobsUpdateError ?? null });
  const jobsUpdate = vi.fn(() => ({ eq: jobsUpdateEq }));

  (supabase.from as unknown as Mock).mockImplementation((table: string) => {
    if (table === 'shipping_providers') return { select: providersSelect };
    if (table === 'shipments') return { select: shipmentsSelect, insert: shipmentsInsert, update: shipmentsUpdate };
    if (table === 'jobs') return { update: jobsUpdate };
    throw new Error(`tabela inesperada: ${table}`);
  });

  return {
    providersEq, providersOrder,
    shipmentsOrder, shipmentsInsert, insertSelect, insertSingle,
    shipmentsUpdate, shipmentsUpdateEq, lookupEq, lookupSingle,
    jobsUpdate, jobsUpdateEq,
  };
}

describe('useLogistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca apenas transportadoras ativas, ordenadas por nome', async () => {
    const mocks = mockSupabaseFrom({ providers: [{ id: 'p1', name: 'Correios', is_active: true }] });

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    expect(mocks.providersEq).toHaveBeenCalledWith('is_active', true);
    expect(mocks.providersOrder).toHaveBeenCalledWith('name');
    expect(result.current.providers.data).toEqual([{ id: 'p1', name: 'Correios', is_active: true }]);
  });

  it('busca envios com transportadora e job vinculados, mais recentes primeiro', async () => {
    mockSupabaseFrom({ shipments: [{ id: 's1' }] });

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.shipments.isSuccess).toBe(true));

    expect(result.current.shipments.data).toEqual([{ id: 's1' }]);
  });

  it('cria um envio removendo campos de relação (provider/job) antes de inserir e sincroniza o job vinculado', async () => {
    const mocks = mockSupabaseFrom({ insertResult: { data: { id: 'ship-9' }, error: null } });

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    const input: Partial<DbShipment> = {
      job_id: 'job-1',
      status: 'pending',
      provider: { id: 'p1', name: 'Correios', contact_info: null, is_active: true, created_at: '2024-01-01' },
      job: { id: 'job-1', order_number: 'OS-1', client: 'Cliente X' },
    };

    await act(async () => {
      await result.current.createShipment.mutateAsync(input);
    });

    expect(mocks.shipmentsInsert).toHaveBeenCalledWith({ job_id: 'job-1', status: 'pending' });
    expect(mocks.jobsUpdate).toHaveBeenCalledWith({ shipment_id: 'ship-9', shipping_status: 'pending' });
    expect(mocks.jobsUpdateEq).toHaveBeenCalledWith('id', 'job-1');
  });

  it('cria um envio sem job_id e não sincroniza nenhum job', async () => {
    const mocks = mockSupabaseFrom({});

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    await act(async () => {
      await result.current.createShipment.mutateAsync({ status: 'pending' });
    });

    expect(mocks.jobsUpdate).not.toHaveBeenCalled();
  });

  it('propaga erro do Supabase ao criar um envio', async () => {
    mockSupabaseFrom({ insertResult: { data: null, error: new Error('violação de constraint') } });

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    await expect(result.current.createShipment.mutateAsync({ status: 'pending' })).rejects.toThrow(
      'violação de constraint'
    );
  });

  it('atualiza um envio removendo campos de relação e sincroniza o status do job quando o envio está vinculado', async () => {
    const mocks = mockSupabaseFrom({ shipmentLookup: { job_id: 'job-2' } });

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    const input: Partial<DbShipment> = {
      status: 'delivered',
      provider: { id: 'p1', name: 'Correios', contact_info: null, is_active: true, created_at: '2024-01-01' },
      job: null,
    };

    await act(async () => {
      await result.current.updateShipment.mutateAsync({ id: 'ship-1', data: input });
    });

    expect(mocks.shipmentsUpdate).toHaveBeenCalledWith({ status: 'delivered' });
    expect(mocks.shipmentsUpdateEq).toHaveBeenCalledWith('id', 'ship-1');
    expect(mocks.lookupEq).toHaveBeenCalledWith('id', 'ship-1');
    expect(mocks.jobsUpdate).toHaveBeenCalledWith({ shipping_status: 'delivered' });
    expect(mocks.jobsUpdateEq).toHaveBeenCalledWith('id', 'job-2');
  });

  it('não sincroniza job quando o status não muda na atualização do envio', async () => {
    const mocks = mockSupabaseFrom({});

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    await act(async () => {
      await result.current.updateShipment.mutateAsync({ id: 'ship-1', data: { notes: 'atualização de observação' } });
    });

    expect(mocks.lookupEq).not.toHaveBeenCalled();
    expect(mocks.jobsUpdate).not.toHaveBeenCalled();
  });

  it('não sincroniza job quando o envio vinculado não possui job_id (envio avulso)', async () => {
    const mocks = mockSupabaseFrom({ shipmentLookup: { job_id: null } });

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    await act(async () => {
      await result.current.updateShipment.mutateAsync({ id: 'ship-1', data: { status: 'in_transit' } });
    });

    expect(mocks.jobsUpdate).not.toHaveBeenCalled();
  });

  it('propaga erro do Supabase ao atualizar um envio', async () => {
    mockSupabaseFrom({ updateError: new Error('envio não encontrado') });

    const { result } = renderHook(() => useLogistics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.providers.isSuccess).toBe(true));

    await expect(
      result.current.updateShipment.mutateAsync({ id: 'ship-404', data: { status: 'cancelled' } })
    ).rejects.toThrow('envio não encontrado');
  });
});
