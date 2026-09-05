import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Parse an integer safely with explicit radix 10. Returns `fallback` when the
// input is empty, non-numeric, or NaN. Avoids the classic parseInt-without-radix
// pitfall and silent NaN propagation.
export function safeParseInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : fallback;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed === '') return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// Same as safeParseInt but for floats. Useful for monetary/quantity fields.
export function safeParseFloat(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed === '') return fallback;
  // Locale-aware separator detection:
  //   both separators present → last one is the decimal (e.g. '1.234,56' or '1,234.56')
  //   comma only, 3 digits after → thousands grouping (e.g. '1,234' → 1234)
  //   comma only, other digit count → decimal comma (e.g. '3,14' → 3.14)
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    const afterLastComma = trimmed.slice(lastComma + 1);
    if (lastDot === -1 && /^\d{3}$/.test(afterLastComma)) {
      normalized = trimmed.replace(/,/g, '');             // '1,234' → '1234'
    } else {
      normalized = trimmed.replace(/\./g, '').replace(',', '.');  // '1.234,56' → '1234.56'
    }
  } else {
    normalized = trimmed.replace(/,/g, '');               // '1,234.56' → '1234.56'
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? fallback : parsed;
}
