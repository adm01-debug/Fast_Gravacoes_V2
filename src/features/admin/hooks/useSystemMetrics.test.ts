import { describe, it, expect } from "vitest";
import { systemMetricsSnapshotSchema } from "./useSystemMetrics";

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
