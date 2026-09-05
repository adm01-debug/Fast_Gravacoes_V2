import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell } from './csvSafety';

describe('sanitizeCsvCell', () => {
  it('prefixes a leading = with a quote (formula injection)', () => {
    expect(sanitizeCsvCell('=HYPERLINK("http://evil.com","click")')).toBe(
      "'=HYPERLINK(\"http://evil.com\",\"click\")"
    );
  });

  it('prefixes a leading + - @ with a quote', () => {
    expect(sanitizeCsvCell('+1234')).toBe("'+1234");
    expect(sanitizeCsvCell('-1234')).toBe("'-1234");
    expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('prefixes a leading tab or carriage return (used to smuggle a formula past naive checks)', () => {
    expect(sanitizeCsvCell('\t=cmd')).toBe("'\t=cmd");
    expect(sanitizeCsvCell('\r=cmd')).toBe("'\r=cmd");
  });

  it('leaves ordinary text untouched', () => {
    expect(sanitizeCsvCell('Cliente ABC Ltda')).toBe('Cliente ABC Ltda');
    expect(sanitizeCsvCell('')).toBe('');
    expect(sanitizeCsvCell('R$ 1.234,56')).toBe('R$ 1.234,56');
  });

  it('does not touch a formula character that is not the first character', () => {
    expect(sanitizeCsvCell('Total = 100')).toBe('Total = 100');
    expect(sanitizeCsvCell('email@example.com')).toBe('email@example.com');
  });
});
