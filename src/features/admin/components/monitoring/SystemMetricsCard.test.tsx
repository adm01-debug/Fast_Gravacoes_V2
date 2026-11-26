import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SystemMetricsCard } from "./SystemMetricsCard";

interface Snapshot {
  id: string;
  collected_at: string;
  metrics: Record<string, unknown>;
}

const estado: { data: Snapshot[]; isLoading: boolean; error: Error | null } = {
  data: [],
  isLoading: false,
  error: null,
};

vi.mock("@/features/admin/hooks/useSystemMetrics", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/admin/hooks/useSystemMetrics")
  >("@/features/admin/hooks/useSystemMetrics");
  return { ...actual, useSystemMetrics: () => ({ ...estado }) };
});

const agora = () => new Date();
const minutosAtras = (minutos: number) =>
  new Date(agora().getTime() - minutos * 60_000).toISOString();

const snapshotCompleto = (): Snapshot => ({
  id: "snap-1",
  collected_at: minutosAtras(1),
  metrics: {
    jobs: { total: 574, active: 12, completedToday: 3 },
    machines: { running: 8, total: 20 },
    operators: { active: 5, total: 40 },
  },
});

describe("SystemMetricsCard", () => {
  beforeEach(() => {
    estado.data = [];
    estado.isLoading = false;
    estado.error = null;
  });

  it("mostra as contagens do coletor quando o snapshot está fresco", () => {
    estado.data = [snapshotCompleto()];

    render(<SystemMetricsCard />);

    expect(screen.getByText("574")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.queryByText("Coleta de métricas parada")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("usa traço em vez de zero quando o coletor não conseguiu contar", () => {
    estado.data = [
      {
        id: "snap-2",
        collected_at: minutosAtras(1),
        metrics: {
          jobs: { total: 574, active: 12, completedToday: 0 },
          machines: { running: null, total: 20 },
          operators: { active: null, total: 40 },
        },
      },
    ];

    render(<SystemMetricsCard />);

    // Duas contagens falharam (máquinas rodando e operadores ativos).
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("574")).toBeInTheDocument();
  });

  it("alerta quando o snapshot mais recente é anterior ao intervalo do coletor", () => {
    estado.data = [{ ...snapshotCompleto(), collected_at: minutosAtras(120) }];

    render(<SystemMetricsCard />);

    expect(screen.getByText("Coleta de métricas parada")).toBeInTheDocument();
    expect(screen.getByText("coleta parada")).toBeInTheDocument();
    expect(screen.getByText("574")).toBeInTheDocument();
  });

  it("escolhe o snapshot mais recente quando a lista vem desordenada", () => {
    estado.data = [
      { ...snapshotCompleto(), id: "antigo", collected_at: minutosAtras(300) },
      {
        id: "novo",
        collected_at: minutosAtras(2),
        metrics: { jobs: { total: 999, active: 1, completedToday: 0 } },
      },
    ];

    render(<SystemMetricsCard />);

    expect(screen.getByText("999")).toBeInTheDocument();
    expect(screen.queryByText("Coleta de métricas parada")).toBeNull();
  });

  it("diz que não houve coleta em vez de mostrar números vazios", () => {
    render(<SystemMetricsCard />);

    expect(screen.getByText("Nenhuma coleta registrada")).toBeInTheDocument();
  });

  it("mostra o motivo quando a leitura é negada pela RLS", () => {
    estado.error = new Error("permission denied for table system_metrics");

    render(<SystemMetricsCard />);

    expect(
      screen.getByText(/A leitura é restrita a gestores e admins/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma coleta registrada")).toBeNull();
  });
});