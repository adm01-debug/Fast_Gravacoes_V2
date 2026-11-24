import { describe, it, expect } from 'vitest';
import { parseDateOnly, formatDateOnly } from './dateUtils';

describe('parseDateOnly', () => {
  it('interpreta data pura como meia-noite local', () => {
    const parsed = parseDateOnly('2026-03-10');

    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(2);
    expect(parsed!.getDate()).toBe(10);
    expect(parsed!.getHours()).toBe(0);
  });

  it('devolve null para entrada vazia ou invalida', () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly('nao-e-data')).toBeNull();
  });
});

describe('formatDateOnly', () => {
  it('usa o dia local e nao o dia UTC', () => {
    // 02:00 UTC de 15/07 = 23:00 de 14/07 em Sao Paulo (fuso fixado no vitest.config.ts)
    const date = new Date(Date.UTC(2026, 6, 15, 2, 0));

    expect(date.getTimezoneOffset()).toBeGreaterThan(0);
    expect(date.toISOString().slice(0, 10)).toBe('2026-07-15');
    expect(formatDateOnly(date)).toBe('2026-07-14');
  });

  it('faz o caminho de volta de parseDateOnly', () => {
    expect(formatDateOnly(parseDateOnly('2026-01-05')!)).toBe('2026-01-05');
  });
});