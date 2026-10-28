import { describe, it, expect } from 'vitest';
import { parseDateOnly, formatDateOnly } from '@/lib/dateUtils';

function ensure<T>(value: T | null | undefined): T {
  expect(value).not.toBeNull();
  expect(value).not.toBeUndefined();
  return value as T;
}

describe('parseDateOnly', () => {
  it('parses a date-only string at local midnight (no UTC shift)', () => {
    const d = ensure(parseDateOnly('2026-05-21'));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // May (0-indexed)
    expect(d.getDate()).toBe(21);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('keeps the calendar day stable regardless of timezone offset', () => {
    expect(ensure(parseDateOnly('2026-01-01')).getDate()).toBe(1);
    expect(ensure(parseDateOnly('2026-12-31')).getDate()).toBe(31);
  });

  it('delegates full timestamps to new Date()', () => {
    const iso = '2026-05-21T15:30:00.000Z';
    expect(ensure(parseDateOnly(iso)).getTime()).toBe(new Date(iso).getTime());
  });

  it('returns null for empty or nullish input', () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
    expect(parseDateOnly('')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(parseDateOnly('not-a-date')).toBeNull();
  });
});

describe('formatDateOnly', () => {
  it('formats a Date as yyyy-MM-dd in local time (inverse of parseDateOnly)', () => {
    // Fixa o fuso para o teste distinguir formatação local de UTC mesmo em
    // máquina com TZ=UTC (CI).
    const prevTZ = process.env.TZ;
    process.env.TZ = 'America/Sao_Paulo';
    try {
      // 2026-05-21 23:30 em UTC-3 é 2026-05-22 02:30Z — o dia local ainda é 21.
      const local = new Date(2026, 4, 21, 23, 30, 0);
      expect(local.toISOString().split('T')[0]).toBe('2026-05-22');
      const s = formatDateOnly(local);
      expect(s).toBe('2026-05-21');
      expect(ensure(parseDateOnly(s)).getTime()).toBe(new Date(2026, 4, 21).getTime());
    } finally {
      if (prevTZ === undefined) delete process.env.TZ;
      else process.env.TZ = prevTZ;
    }
  });

  it('round-trips with parseDateOnly', () => {
    expect(formatDateOnly(ensure(parseDateOnly('2026-12-31')))).toBe('2026-12-31');
  });
});
