import { describe, it, expect } from 'vitest';
import { cn, safeParseInt, safeParseFloat } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';

// ── cn (class merging) ─────────────────────────────────────

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('foo', 'bar')).toContain('foo');
    expect(cn('foo', 'bar')).toContain('bar');
  });

  it('removes falsy values', () => {
    const condition = false;
    const result = cn('foo', condition && 'bar', undefined, null as unknown as string);
    expect(result).not.toContain('bar');
    expect(result).toContain('foo');
  });

  it('resolves Tailwind conflicts (last class wins)', () => {
    // twMerge should resolve p-2 vs p-4 — the last one wins
    const result = cn('p-2', 'p-4');
    expect(result).toContain('p-4');
    expect(result).not.toContain('p-2');
  });

  it('handles conditional classes via object syntax', () => {
    const result = cn({ 'text-red-500': true, 'text-blue-500': false });
    expect(result).toContain('text-red-500');
    expect(result).not.toContain('text-blue-500');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });
});

// ── safeParseInt ───────────────────────────────────────────

describe('safeParseInt', () => {
  it('parses valid integer strings', () => {
    expect(safeParseInt('42')).toBe(42);
    expect(safeParseInt('0')).toBe(0);
    expect(safeParseInt('-7')).toBe(-7);
    expect(safeParseInt('  100  ')).toBe(100);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(safeParseInt('abc')).toBe(0);
    expect(safeParseInt('12abc')).toBe(12); // parseInt reads leading digits
    expect(safeParseInt('abc12')).toBe(0);
  });

  it('returns fallback for empty string', () => {
    expect(safeParseInt('')).toBe(0);
    expect(safeParseInt('   ')).toBe(0);
  });

  it('returns fallback for null/undefined/boolean/object', () => {
    expect(safeParseInt(null as unknown as string)).toBe(0);
    expect(safeParseInt(undefined as unknown as string)).toBe(0);
    expect(safeParseInt({} as unknown as string)).toBe(0);
  });

  it('accepts a custom fallback value', () => {
    expect(safeParseInt('abc', -1)).toBe(-1);
    expect(safeParseInt('', 99)).toBe(99);
  });

  it('truncates floats (integer only)', () => {
    expect(safeParseInt('3.9')).toBe(3);
    expect(safeParseInt('3.1')).toBe(3);
  });

  it('handles numeric input directly', () => {
    expect(safeParseInt(42 as unknown as string)).toBe(42);
    expect(safeParseInt(3.9 as unknown as string)).toBe(3);
    expect(safeParseInt(Infinity as unknown as string)).toBe(0); // non-finite → fallback
    expect(safeParseInt(NaN as unknown as string)).toBe(0);
  });
});

// ── safeParseFloat ─────────────────────────────────────────

describe('safeParseFloat', () => {
  it('parses valid float strings', () => {
    expect(safeParseFloat('3.14')).toBeCloseTo(3.14);
    expect(safeParseFloat('0')).toBe(0);
    expect(safeParseFloat('-2.5')).toBeCloseTo(-2.5);
    expect(safeParseFloat('  1.0  ')).toBeCloseTo(1.0);
  });

  it('accepts comma as decimal separator (Brazilian format)', () => {
    expect(safeParseFloat('3,14')).toBeCloseTo(3.14);
    expect(safeParseFloat('1.234,56')).toBeCloseTo(1234.56);
    expect(safeParseFloat('1.234.567,89')).toBeCloseTo(1234567.89);
  });

  it('treats comma-grouped integers as thousands separator', () => {
    expect(safeParseFloat('1,234')).toBe(1234);
    expect(safeParseFloat('1,234,567')).toBe(1234567);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(safeParseFloat('abc')).toBe(0);
    expect(safeParseFloat('')).toBe(0);
  });

  it('accepts custom fallback', () => {
    expect(safeParseFloat('bad', -1)).toBe(-1);
  });

  it('handles numeric input directly', () => {
    expect(safeParseFloat(3.14 as unknown as string)).toBeCloseTo(3.14);
    expect(safeParseFloat(Infinity as unknown as string)).toBe(0); // non-finite → fallback
  });
});

// ── parseDateOnly ──────────────────────────────────────────

describe('parseDateOnly', () => {
  it('returns null for empty/null/undefined input', () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
    expect(parseDateOnly('')).toBeNull();
  });

  it('parses ISO date-only strings at LOCAL midnight', () => {
    const date = parseDateOnly('2026-05-31');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(4); // May = 4
    expect(date!.getDate()).toBe(31);
    // Should be local midnight, not UTC midnight
    expect(date!.getHours()).toBe(0);
    expect(date!.getMinutes()).toBe(0);
    expect(date!.getSeconds()).toBe(0);
  });

  it('parses full ISO timestamps via new Date', () => {
    const ts = '2026-05-31T10:30:00Z';
    const date = parseDateOnly(ts);
    expect(date).not.toBeNull();
    expect(date!.toISOString()).toBe(new Date(ts).toISOString());
  });

  it('returns null for truly invalid date strings', () => {
    expect(parseDateOnly('not-a-date')).toBeNull();
  });

  it('rolls over out-of-range day/month components (JS Date behavior)', () => {
    // new Date(2026, 12, 1) = Jan 1, 2027 — JavaScript silently overflows
    // parseDateOnly uses component-wise construction so it inherits this behavior.
    const d = parseDateOnly('2026-13-01');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2027); // month 13 → Jan of next year
  });

  it('preserves correct day boundaries without UTC offset shift', () => {
    // 2026-01-01 should parse as Jan 1, NOT Dec 31 of prev year
    const date = parseDateOnly('2026-01-01');
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(0);
    expect(date!.getDate()).toBe(1);
  });

  it('handles leap year dates', () => {
    const date = parseDateOnly('2024-02-29');
    expect(date).not.toBeNull();
    expect(date!.getDate()).toBe(29);
    expect(date!.getMonth()).toBe(1);
  });

  it('rolls over Feb 29 in non-leap year to Mar 1 (JS Date behavior)', () => {
    // new Date(2025, 1, 29) = March 1, 2025 — JavaScript overflows silently.
    // parseDateOnly uses component-wise construction, so it inherits this behavior.
    const date = parseDateOnly('2025-02-29');
    expect(date).not.toBeNull();
    expect(date!.getMonth()).toBe(2); // March (index 2)
    expect(date!.getDate()).toBe(1);
  });
});
