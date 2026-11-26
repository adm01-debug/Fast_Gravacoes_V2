import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { systemMetricsSnapshotSchema, useSystemMetrics } from "./useSystemMetrics";

const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: limitMock,
    })),
  },
}));

const criarWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const snapshot = {
  id: "11111111-1111-4111-8111-111111111111",
  collected_at: "2026-11-26T13:00:00.000Z",
  metrics: {
    jobs: { total: 588, active: 1, completedToday: 0 },
    operators: { total: 11, active: 0 },
    machines: { total: 10, running: 1 },
  },
};

describe("useSystemMetrics", () => {
  beforeEach(() => {
    limitMock.mockReset();
    limitMock.mockResolvedValue({ data: [snapshot], error: null });
  });

  it("busca uma vez na montagem, sem refetch extra do primeiro render", async () => {
    const { result } = renderHook(() => useSystemMetrics(20, 0), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it("pede nova consulta ao mudar o refreshKey mesmo com o cache preenchido", async () => {
    const wrapper = criarWrapper();
    const { result, rerender } = renderHook(
      ({ refreshKey }: { refreshKey: number }) => useSystemMetrics(20, refreshKey),
      { wrapper, initialProps: { refreshKey: 0 } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(limitMock).toHaveBeenCalledTimes(1);

    // Cache ja tem dado do mesmo job/key; o clique em "Atualizar" precisa ir ao banco.
    rerender({ refreshKey: 1 });
    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(2));

    rerender({ refreshKey: 2 });
    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(3));
  });

  it("volta para a tela com o cache preenchido e o primeiro clique ainda consulta", async () => {
    // Mesmo QueryClient nos dois mounts: e o cache que o usuario encontra ao voltar.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const primeiraVisita = renderHook(
      ({ refreshKey }: { refreshKey: number }) => useSystemMetrics(20, refreshKey),
      { wrapper, initialProps: { refreshKey: 0 } },
    );
    await waitFor(() => expect(primeiraVisita.result.current.isSuccess).toBe(true));
    expect(limitMock).toHaveBeenCalledTimes(1);

    // Sai da tela: o cache do mesmo key fica preenchido para a volta.
    primeiraVisita.unmount();

    const voltaParaTela = renderHook(
      ({ refreshKey }: { refreshKey: number }) => useSystemMetrics(20, refreshKey),
      { wrapper, initialProps: { refreshKey: 0 } },
    );
    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(2));

    // A chave ja tem dado guardado: o clique nao pode se apoiar no cache.
    expect(queryClient.getQueryData(["system-metrics", 20])).toEqual([snapshot]);

    // Primeiro clique em "Atualizar" depois de voltar tem que ir ao banco — era
    // essa a regressao.
    voltaParaTela.rerender({ refreshKey: 1 });
    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(3));
  });
});


describe("systemMetricsSnapshotSchema", () => {
  it("aceita o snapshot gravado pelo collector", () => {
    const parsed = systemMetricsSnapshotSchema.safeParse({
      id: "snap-1",
      collected_at: "2026-11-26T12:10:04.123+00:00",
      metrics: { jobs: { total: 583 } },
    });

    expect(parsed.success).toBe(true);
  });

  it("assume métricas vazias quando a coluna vem nula", () => {
    const parsed = systemMetricsSnapshotSchema.parse({
      id: "snap-1",
      collected_at: "2026-11-26T12:10:04+00:00",
    });

    expect(parsed.metrics).toEqual({});
  });

  it("recusa snapshot sem collected_at", () => {
    const parsed = systemMetricsSnapshotSchema.safeParse({ id: "snap-1", metrics: {} });

    expect(parsed.success).toBe(false);
  });

  it("recusa metrics que não seja objeto", () => {
    const parsed = systemMetricsSnapshotSchema.safeParse({
      id: "snap-1",
      collected_at: "2026-11-26T12:10:04+00:00",
      metrics: "ops",
    });

    expect(parsed.success).toBe(false);
  });
});
