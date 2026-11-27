import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CspViolationsPanel } from "./CspViolationsPanel";
import {
  useCspViolationReports,
  type CspSummary,
} from "@/features/admin/hooks/useCspViolationReports";

vi.mock("@/features/admin/hooks/useCspViolationReports", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/admin/hooks/useCspViolationReports")>();
  return { ...actual, useCspViolationReports: vi.fn() };
});

const summary = (over: Partial<CspSummary> = {}): CspSummary => ({
  rows: [],
  total: 0,
  reportedOnly: 0,
  enforced: 0,
  directives: [],
  resources: [],
  lastReportAt: null,
  ...over,
});

describe("CspViolationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCspViolationReports).mockReturnValue({
      data: summary(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCspViolationReports>);
  });

  it("explica o modo Report-Only quando nao ha relato", () => {
    render(<CspViolationsPanel />);
    expect(screen.getByText(/Nenhuma violação relatada no período/)).toBeTruthy();
  });

  it("mostra o erro com o motivo do acesso restrito", () => {
    vi.mocked(useCspViolationReports).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "permission denied" },
    } as unknown as ReturnType<typeof useCspViolationReports>);

    render(<CspViolationsPanel />);
    expect(screen.getByText(/permission denied/)).toBeTruthy();
    expect(screen.getByText(/coordenador, gestor e admin/)).toBeTruthy();
  });

  it("resume os relatos e lista as linhas", () => {
    vi.mocked(useCspViolationReports).mockReturnValue({
      data: summary({
        total: 3,
        reportedOnly: 2,
        enforced: 1,
        lastReportAt: "2026-11-23T00:01:54.289502+00:00",
        directives: [{ label: "Scripts", count: 2 }],
        resources: [{ label: "fonts.googleapis.com", count: 2 }],
        rows: [
          {
            id: "r1",
            document_uri: "https://app.example.com/kpis",
            violated_directive: "script-src-elem",
            effective_directive: "script-src",
            blocked_uri: "https://fonts.googleapis.com/css2",
            source_file: "https://app.example.com/assets/index.js",
            line_number: 42,
            disposition: "report",
            created_at: "2026-11-23T00:01:54.289502+00:00",
          },
        ],
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCspViolationReports>);

    const { container } = render(<CspViolationsPanel />);

    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scripts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("fonts.googleapis.com").length).toBeGreaterThan(0);
    expect(screen.getByText("/kpis")).toBeTruthy();
    expect(container.textContent).toContain("script-src");
  });

  it("avisa enquanto carrega", () => {
    vi.mocked(useCspViolationReports).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useCspViolationReports>);

    render(<CspViolationsPanel />);
    expect(screen.getByText(/Carregando relatos/)).toBeTruthy();
  });
});