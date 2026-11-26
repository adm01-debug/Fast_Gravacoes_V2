import { describe, it, expect } from "vitest";
import {
  edgeCheckLabel,
  formatObserved,
  summarizeEdgeChecks,
  summarizeEdgeHealth,
  toEdgeStatus,
  type EdgeHealthRow,
} from "@/features/admin/hooks/useEdgeHealthHistory";

function row(over: Partial<EdgeHealthRow> & { id: string; captured_at: string }): EdgeHealthRow {
  return {
    status: "pass",
    checks: {},
    latency_ms: null,
    source: "health-monitor",
    ...over,
  };
}

describe("toEdgeStatus", () => {
  it("aceita os dois vocabularios (banco e health-check)", () => {
    expect(toEdgeStatus("pass")).toBe("pass");
    expect(toEdgeStatus("healthy")).toBe("pass");
    expect(toEdgeStatus("DEGRADED")).toBe("warn");
    expect(toEdgeStatus("unhealthy")).toBe("fail");
  });

  it("trata valor desconhecido como falha em vez de otimismo", () => {
    expect(toEdgeStatus(undefined)).toBe("fail");
    expect(toEdgeStatus("seila")).toBe("fail");
  });
});

describe("formatObserved", () => {
  it("mostra unidade apenas quando ela existe", () => {
    expect(formatObserved("ms", 491)).toBe("491 ms");
    expect(formatObserved("items", 0)).toBe("0 itens na fila");
    expect(formatObserved("items", 1)).toBe("1 item na fila");
    expect(formatObserved(null, 7)).toBe("7");
    expect(formatObserved("ms", null)).toBe("—");
  });

  it("traduz a contagem de segredos ausentes", () => {
    expect(formatObserved("missing", 0)).toBe("nenhum segredo ausente");
    expect(formatObserved("missing", 2)).toBe("2 segredo(s) ausente(s)");
  });
});

describe("summarizeEdgeChecks", () => {
  it("usa o estado da coleta mais recente e conta as falhas da janela", () => {
    const checks = summarizeEdgeChecks([
      row({
        id: "a",
        captured_at: "2026-11-26T18:00:00Z",
        checks: { "database:read": { status: "fail", observedUnit: "ms", observedValue: 900 } },
      }),
      row({
        id: "b",
        captured_at: "2026-11-26T19:00:00Z",
        checks: { "database:read": { status: "pass", observedUnit: "ms", observedValue: 360 } },
      }),
    ]);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({ status: "pass", observed: "360 ms", failures: 1 });
  });

  it("preserva checagem desconhecida com o nome cru e ordena as conhecidas primeiro", () => {
    const checks = summarizeEdgeChecks([
      row({
        id: "a",
        captured_at: "2026-11-26T19:00:00Z",
        checks: {
          "zz:extra": { status: "warn" },
          "database:read": { status: "pass" },
          "auth:session": { status: "pass" },
        },
      }),
    ]);
    expect(checks.map((c) => c.key)).toEqual(["auth:session", "database:read", "zz:extra"]);
    expect(checks[2].label).toBe("zz:extra");
    expect(edgeCheckLabel("zz:extra")).toBe("zz:extra");
  });
});

describe("summarizeEdgeHealth", () => {
  it("nao depende da ordem recebida e resume a janela", () => {
    const summary = summarizeEdgeHealth([
      row({ id: "antigo", captured_at: "2026-11-26T18:00:00Z", status: "fail", checks: {} }),
      row({ id: "novo", captured_at: "2026-11-26T19:15:00Z", status: "pass", checks: {} }),
    ]);
    expect(summary.latest?.id).toBe("novo");
    expect(summary.latestStatus).toBe("pass");
    expect(summary.passRatePct).toBe(50);
    expect(summary.lastFailAt).toBe("2026-11-26T18:00:00Z");
  });

  it("devolve janela vazia sem inventar estado", () => {
    const summary = summarizeEdgeHealth([]);
    expect(summary.latest).toBeNull();
    expect(summary.latestStatus).toBeNull();
    expect(summary.passRatePct).toBeNull();
    expect(summary.lastFailAt).toBeNull();
  });
});