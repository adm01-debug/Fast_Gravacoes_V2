import { describe, expect, it } from "vitest";
import {
  deriveCronStatus,
  deriveEdgeStatus,
  deriveOverallStatus,
  type SystemStatusSummary,
} from "./useSystemStatusSummary";

const base: SystemStatusSummary = {
  total_jobs: 5,
  healthy_jobs: 5,
  failing_jobs: 0,
  stale_jobs: 0,
  last_capture: new Date().toISOString(),
  edge_status: "operational",
  edge_last_check: new Date().toISOString(),
};

describe("deriveCronStatus", () => {
  it("retorna 'unknown' sem dados", () => {
    expect(deriveCronStatus(null)).toBe("unknown");
  });

  it("retorna 'unknown' quando não há rotinas monitoradas", () => {
    expect(deriveCronStatus({ ...base, total_jobs: 0, healthy_jobs: 0 })).toBe("unknown");
  });

  it("retorna 'operational' quando tudo está saudável", () => {
    expect(deriveCronStatus(base)).toBe("operational");
  });

  it("retorna 'degraded' com rotina silenciosa", () => {
    expect(deriveCronStatus({ ...base, healthy_jobs: 4, stale_jobs: 1 })).toBe("degraded");
  });

  it("prioriza 'outage' sobre 'degraded'", () => {
    expect(deriveCronStatus({ ...base, healthy_jobs: 3, stale_jobs: 1, failing_jobs: 1 })).toBe(
      "outage",
    );
  });
});

describe("deriveEdgeStatus", () => {
  it("retorna 'unknown' sem dados ou sem coleta recente", () => {
    expect(deriveEdgeStatus(null)).toBe("unknown");
    expect(deriveEdgeStatus({ ...base, edge_status: null })).toBe("unknown");
  });

  it("reflete o estado reportado pela última coleta", () => {
    expect(deriveEdgeStatus({ ...base, edge_status: "degraded" })).toBe("degraded");
  });
});

describe("deriveOverallStatus", () => {
  it("combina domínios pelo mais severo", () => {
    expect(deriveOverallStatus({ ...base, edge_status: "outage" })).toBe("outage");
    expect(deriveOverallStatus({ ...base, edge_status: "degraded" })).toBe("degraded");
  });

  it("mantém a falha das rotinas quando as funções estão saudáveis", () => {
    expect(deriveOverallStatus({ ...base, failing_jobs: 1, healthy_jobs: 4 })).toBe("outage");
  });

  it("permanece 'operational' quando ambos estão saudáveis", () => {
    expect(deriveOverallStatus(base)).toBe("operational");
  });

  it("'unknown' das funções não rebaixa para falso alarme", () => {
    expect(deriveOverallStatus({ ...base, edge_status: "unknown" })).toBe("unknown");
  });
});
