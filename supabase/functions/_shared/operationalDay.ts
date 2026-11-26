/**
 * Limites do dia no fuso operacional.
 *
 * As edge functions rodam com o relogio em UTC: `setHours(0,0,0,0)` produz
 * meia-noite UTC, que no Brasil (UTC-3) cai as 21h do dia anterior — a janela
 * "hoje" pulava as tres ultimas horas de producao e reiniciava antes da meia
 * noite real. Aqui a meia-noite local e convertida para o instante UTC.
 */
export const OPERATIONAL_TIMEZONE = "America/Sao_Paulo";

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function zonedParts(
  date: Date,
  timeZone: string = OPERATIONAL_TIMEZONE,
): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Meia-noite local de (year, month, day) expressa como instante UTC. */
export function localMidnightToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string = OPERATIONAL_TIMEZONE,
): Date {
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const p = zonedParts(probe, timeZone);
  const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) + (probe.getTime() - localAsUtc));
}

/** Inicio (00:00 local) do dia operacional que contem `date`. */
export function startOfOperationalDayUtc(
  date: Date,
  timeZone: string = OPERATIONAL_TIMEZONE,
): Date {
  const p = zonedParts(date, timeZone);
  return localMidnightToUtc(p.year, p.month, p.day, timeZone);
}