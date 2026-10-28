/**
 * Date helpers for Postgres `DATE` columns.
 *
 * Columns like `scheduled_date`, `production_date`, `expiration_date` and
 * `shift_date` are stored as date-only strings ('yyyy-MM-dd'). Passing such a
 * string to `new Date(...)` parses it as UTC midnight, which renders/compares
 * as the previous day in negative-offset timezones (e.g. Brazil, UTC-3).
 * `parseDateOnly` parses date-only strings at LOCAL midnight to avoid that shift.
 */

/**
 * Parse a value coming from a `DATE` column as a LOCAL-midnight Date.
 * Date-only strings ('yyyy-MM-dd') are built component-wise (local time).
 * Full timestamps (containing 'T' or a time portion) are delegated to `new Date`.
 * Returns `null` for empty/invalid input.
 */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const dt = new Date(value);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Format a Date as a 'yyyy-MM-dd' string in LOCAL time — the inverse of
 * `parseDateOnly`, for comparing a Date against `DATE` column values.
 * `toISOString().split('T')[0]` yields the UTC date, which is already "tomorrow"
 * between 21h and 24h in Brazil (UTC-3).
 */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
