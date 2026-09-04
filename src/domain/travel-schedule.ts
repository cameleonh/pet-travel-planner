import type { RouteSegment } from "@/domain/plan";

export type DepartureCandidate = {
  date: Date;
  label: string;
  providerValue: string;
};

export type ScheduledRoute = {
  route: RouteSegment;
  departureAt: Date | null;
  arrivalAt: Date | null;
  durationMinutes: number | null;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseLocalDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatProviderDeparture(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatClock(date: Date | null): string | null {
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : null;
}

export function buildDepartureCandidates(date: string, preferredTime: string, now = new Date()): DepartureCandidate[] {
  const preferred = parseLocalDateTime(date, preferredTime);
  if (!preferred) return [];
  const minimum = now.getTime() + 5 * 60_000;
  return [-60, 0, 60]
    .map((offset) => new Date(preferred.getTime() + offset * 60_000))
    .filter((candidate) => candidate.getTime() > minimum)
    .map((candidate) => ({
      date: candidate,
      label: formatClock(candidate)!,
      providerValue: formatProviderDeparture(candidate),
    }));
}

export function buildTravelSchedule(
  routes: RouteSegment[],
  date: string,
  startTime: string,
  stayMinutes: number,
  firstLegDurationMinutes?: number | null,
  dwellByPlaceId?: Record<string, number>,
): ScheduledRoute[] {
  let cursor = parseLocalDateTime(date, startTime);
  return routes.map((route, index) => {
    const durationMinutes = index === 0 && firstLegDurationMinutes != null
      ? firstLegDurationMinutes
      : route.durationMinutes;
    const departureAt = cursor;
    const arrivalAt = cursor && durationMinutes != null
      ? new Date(cursor.getTime() + durationMinutes * 60_000)
      : null;
    const stay = dwellByPlaceId?.[route.toPlaceId] ?? stayMinutes;
    cursor = arrivalAt ? new Date(arrivalAt.getTime() + stay * 60_000) : null;
    return { route, departureAt, arrivalAt, durationMinutes };
  });
}
