import { describe, expect, it } from "vitest";
import { computeDrift, median } from "./useCronP95Daily";

describe("median", () => {
  it("retorna null para amostra vazia", () => {
    expect(median([])).toBeNull();
  });

  it("calcula mediana ímpar e par", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe("computeDrift", () => {
  it("retorna null com menos de 4 pontos válidos", () => {
    expect(computeDrift([100, 100, 100])).toBeNull();
  });

  it("ignora pontos nulos na contagem mínima", () => {
    expect(computeDrift([100, null, 100, 100])).toBeNull();
  });

  it("detecta degradação percentual sobre a mediana anterior", () => {
    expect(computeDrift([100, 100, 100, 200])).toBe(100);
  });

  it("detecta melhora como valor negativo", () => {
    expect(computeDrift([200, 200, 200, 100])).toBe(-50);
  });

  it("retorna null quando a linha de base é zero", () => {
    expect(computeDrift([0, 0, 0, 50])).toBeNull();
  });
});
