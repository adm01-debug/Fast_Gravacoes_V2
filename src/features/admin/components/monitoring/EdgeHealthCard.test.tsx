import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EdgeHealthCard } from "./EdgeHealthCard";
import { useEdgeHealthHistory } from "@/features/admin/hooks/useEdgeHealthHistory";

vi.mock("@/features/admin/hooks/useEdgeHealthHistory", () => ({ useEdgeHealthHistory: vi.fn() }));

type Result = ReturnType<typeof useEdgeHealthHistory>;

const semColeta = { data: undefined, isLoading: false, error: null } as unknown as Result;

describe("EdgeHealthCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEdgeHealthHistory).mockReturnValue(semColeta);
  });

  it("explica a restricao de acesso quando a leitura falha", () => {
    vi.mocked(useEdgeHealthHistory).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("permission denied"),
    } as unknown as Result);
    render(<EdgeHealthCard />);
    expect(screen.getByText(/acesso restrito a\s*coordenadores e gestores/)).toBeTruthy();
  });

  it("nao mostra status quando nunca houve coleta", () => {
    render(<EdgeHealthCard />);
    expect(screen.getByText(/Ainda não há coletas registradas/)).toBeTruthy();
    expect(screen.queryByText("Operacional")).toBeNull();
  });

  it("mostra cada checagem com valor observado, estado e resumo da janela", () => {
    const coleta = {
      id: "1",
      status: "fail",
      checks: {},
      latency_ms: 2355,
      source: "health-monitor",
      captured_at: "2026-11-26T19:15:04Z",
    };
    vi.mocked(useEdgeHealthHistory).mockReturnValue({
      data: {
        rows: [coleta],
        latest: coleta,
        latestStatus: "fail",
        checks: [
          {
            key: "database:read",
            label: "Banco de dados (leitura)",
            status: "pass",
            observed: "360 ms",
            failures: 0,
          },
          {
            key: "queue:tpm_notifications",
            label: "Fila de notificações TPM",
            status: "fail",
            observed: "12 itens na fila",
            failures: 3,
          },
        ],
        passRatePct: 96,
        lastFailAt: null,
      },
      isLoading: false,
      error: null,
    } as unknown as Result);

    const { container } = render(<EdgeHealthCard />);

    expect(screen.getByText("Banco de dados (leitura)")).toBeTruthy();
    expect(screen.getByText("360 ms")).toBeTruthy();
    expect(screen.getByText("Fila de notificações TPM")).toBeTruthy();
    expect(screen.getAllByText("Falha")).toHaveLength(2);
    expect(container.textContent).toContain("96% sem falha");
    expect(container.textContent).toContain("coletas analisadas: 1");
    expect(screen.getByText(/2355 ms/)).toBeTruthy();
  });
});