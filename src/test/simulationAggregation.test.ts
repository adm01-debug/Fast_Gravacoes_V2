/**
 * Gráfico do simulador: os resultados precisam ser agrupados pelo cenário base,
 * porque cada variante recebe um id carimbado com Date.now() (UI-18).
 */
import { describe, it, expect } from 'vitest';
import {
  SCENARIOS,
  generateScenarios,
  aggregateScenarioResults,
  type SimulationResult,
} from '@/lib/simulation';

const mkResult = (scenarioBaseId: string, status: 'pass' | 'fail'): SimulationResult => ({
  scenarioId: `${scenarioBaseId}-0-${Date.now()}`,
  scenarioBaseId,
  status,
  statusCode: status === 'pass' ? 200 : 500,
  message: 'ok',
  latency: 10,
  timestamp: new Date().toISOString(),
});

describe('aggregateScenarioResults', () => {
  it('soma variantes e vetores de fuzz no mesmo cenário base', () => {
    const data = aggregateScenarioResults([
      mkResult('b24-deal-add', 'pass'),
      mkResult('b24-deal-add', 'fail'),
      mkResult('stripe-checkout', 'pass'),
    ]);

    expect(data).toHaveLength(SCENARIOS.length);
    expect(data[0]).toMatchObject({ name: SCENARIOS[0].name, passed: 1, failed: 1 });
    expect(data[2]).toMatchObject({ name: SCENARIOS[2].name, passed: 1, failed: 0 });
    expect(data[1]).toMatchObject({ name: SCENARIOS[1].name, passed: 0, failed: 0 });
  });

  it('não perde resultado: a soma dos grupos é o total de resultados', () => {
    const results = SCENARIOS.map((s) => mkResult(s.id, 'pass')).concat(
      Array.from({ length: 20 }, (_, i) => mkResult(SCENARIOS[i % SCENARIOS.length].id, 'fail'))
    );
    const data = aggregateScenarioResults(results);
    const total = data.reduce((acc, d) => acc + d.passed + d.failed, 0);

    expect(total).toBe(results.length);
  });

  it('devolve as categorias zeradas quando não há resultado', () => {
    const data = aggregateScenarioResults([]);

    expect(data).toHaveLength(SCENARIOS.length);
    expect(data.every((d) => d.passed === 0 && d.failed === 0)).toBe(true);
  });
});

describe('generateScenarios', () => {
  it('carimba o cenário base em cada variante', () => {
    const scenarios = generateScenarios(30);
    const baseIds = new Set(SCENARIOS.map((s) => s.id));

    expect(scenarios).toHaveLength(30);
    for (const s of scenarios) {
      expect(s.id).not.toBe(s.baseId);
      expect(baseIds.has(s.baseId as string)).toBe(true);
    }
  });
});
