const KST_OFFSET_MINUTES = 9 * 60;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_PATTERN = /^(\d{2}):(\d{2})$/;
const INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?\+09:00$/;

export type KstDateParts = { year: number; month: number; day: number; hour: number; minute: number };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day;
}

export function parseKstDate(date: string): { year: number; month: number; day: number } | null {
  const match = DATE_PATTERN.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return validCalendarDate(year, month, day) ? { year, month, day } : null;
}

export function parseClock(time: string): { hour: number; minute: number } | null {
  const match = CLOCK_PATTERN.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export function parseKstDateTime(date: string, time: string): number | null {
  const dateParts = parseKstDate(date);
  const clock = parseClock(time);
  if (!dateParts || !clock) return null;
  return Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, clock.hour, clock.minute) - KST_OFFSET_MINUTES * 60_000;
}

export function formatKstInstant(epochMs: number | null): string | null {
  if (epochMs === null || !Number.isFinite(epochMs)) return null;
  const date = new Date(epochMs + KST_OFFSET_MINUTES * 60_000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}+09:00`;
}

export function parseKstInstant(value: string): number | null {
  const match = INSTANT_PATTERN.exec(value);
  if (!match) return null;
  return parseKstDateTime(`${match[1]}-${match[2]}-${match[3]}`, `${match[4]}:${match[5]}`);
}

export function addKstMinutes(epochMs: number | null, minutes: number): number | null {
  return epochMs === null ? null : epochMs + minutes * 60_000;
}

export function formatProviderDeparture(epochMs: number | null): string | null {
  if (epochMs === null) return null;
  const instant = formatKstInstant(epochMs);
  if (!instant) return null;
  return instant.slice(0, 4) + instant.slice(5, 7) + instant.slice(8, 10) + instant.slice(11, 13) + instant.slice(14, 16);
}

export function dateTimeFromEpoch(epochMs: number | null): KstDateParts | null {
  if (epochMs === null || !Number.isFinite(epochMs)) return null;
  const date = new Date(epochMs + KST_OFFSET_MINUTES * 60_000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

