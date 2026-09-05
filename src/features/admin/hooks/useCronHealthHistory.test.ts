import { describe, it, expect } from "vitest";
import { percentile } from "@/features/admin/hooks/useCronHealthHistory";

describe("percentile (R-7)", () => {
  it("retorna null para amostra vazia", () => {
    expect(percentile([], 0.95)).toBeNull();
  });

  it("retorna o único valor quando há uma amostra", () => {
    expect(percentile([120], 0.95)).toBe(120);
  });

  it("interpola linearmente entre posições", () => {
    // rank = (5-1)*0.5 = 2 -> valor exato do índice 2
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    // rank = (4-1)*0.5 = 1.5 -> média entre 2 e 3
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it("p95 fica acima da média quando há cauda lenta", () => {
    const values = [...Array(19).fill(100), 5000];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p95 = percentile(values, 0.95) ?? 0;
    expect(p95).toBeGreaterThan(100);
    expect(p95).toBeLessThan(avg * 2);
  });


  it("não depende da ordem de entrada", () => {
    expect(percentile([9, 1, 5, 3, 7], 0.95)).toBe(percentile([1, 3, 5, 7, 9], 0.95));
  });
});
