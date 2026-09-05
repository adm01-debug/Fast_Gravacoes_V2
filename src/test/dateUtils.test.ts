import { describe, it, expect } from 'vitest';
import { parseDateOnly } from '@/lib/dateUtils';

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
