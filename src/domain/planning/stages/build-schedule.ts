import type { PlanningItemSnapshot, PlanningRequestV1, RouteLeg, ScheduleEntry } from "@/domain/planning/contracts";
import { createPlanIssue } from "@/domain/planning/issues";
import { addKstMinutes, formatKstInstant, parseClock, parseKstDate, parseKstDateTime } from "@/domain/planning/kst-time";

export type ScheduleResult = {
  scheduledItems: ScheduleEntry[];
  startsAt: string;
  endsAt: string | null;
  returnArrivalAt: string | null;
  issues: ReturnType<typeof createPlanIssue>[];
};

function dwellFor(item: PlanningItemSnapshot, request: PlanningRequestV1): { minutes: number; source: ScheduleEntry["dwellSource"] } {
  if (item.userDwellMinutes !== null) return { minutes: item.userDwellMinutes, source: "user" };
  if (item.activityWindow?.officialDurationMinutes !== null && item.activityWindow?.officialDurationMinutes !== undefined) {
    return { minutes: item.activityWindow.officialDurationMinutes, source: "official" };
  }
  return { minutes: request.settings.defaultDwellMinutes, source: "default" };
}

function isOutsideDate(item: PlanningItemSnapshot, tripDate: string): boolean {
  const window = item.activityWindow;
  if (!window) return false;
  if (window.startsOn && tripDate < window.startsOn) return true;
  if (window.endsOn && tripDate > window.endsOn) return true;
  return false;
}

function isOutsideOpeningWindow(item: PlanningItemSnapshot, epochMs: number | null): boolean {
  const window = item.activityWindow;
  const parts = epochMs === null ? null : new Date(epochMs + 9 * 60 * 60_000);
  if (!window || !parts || (!window.opensAt && !window.closesAt)) return false;
  const minuteOfDay = parts.getUTCHours() * 60 + parts.getUTCMinutes();
  const open = window.opensAt ? parseClock(window.opensAt) : null;
  const close = window.closesAt ? parseClock(window.closesAt) : null;
  if (!open && !close) return false;
  const openMinute = open ? open.hour * 60 + open.minute : 0;
  const closeMinute = close ? close.hour * 60 + close.minute : 24 * 60 - 1;
  return minuteOfDay < openMinute || minuteOfDay > closeMinute;
}

export function buildSchedule(input: {
  request: PlanningRequestV1;
  orderedItems: PlanningItemSnapshot[];
  legs: RouteLeg[];
}): ScheduleResult {
  const { request, orderedItems, legs } = input;
  const issues: ScheduleResult["issues"] = [];
  const startEpoch = parseKstDateTime(request.settings.tripDate, request.settings.startTime);
  const startsAt = formatKstInstant(startEpoch) ?? `${request.settings.tripDate}T${request.settings.startTime}+09:00`;
  const entries: ScheduleEntry[] = [];
  let cursor = startEpoch;

  for (let index = 0; index < orderedItems.length; index += 1) {
    const item = orderedItems[index]!;
    const dwell = dwellFor(item, request);
    const entryStart = cursor;
    const entryEnd = addKstMinutes(entryStart, dwell.minutes);
    const incomingLeg = index > 0 ? legs[index - 1] ?? null : null;
    const outgoingLeg = index < orderedItems.length - 1
      ? legs[index] ?? null
      : request.endPolicy === "return-to-start" ? legs[orderedItems.length - 1] ?? null : null;
    entries.push({
      itemId: item.id,
      sequence: index + 1,
      date: request.settings.tripDate,
      startsAt: formatKstInstant(entryStart),
      endsAt: formatKstInstant(entryEnd),
      dwellMinutes: dwell.minutes,
      dwellSource: dwell.source,
      incomingLegId: incomingLeg?.id ?? null,
      outgoingLegId: outgoingLeg?.id ?? null,
    });

    if (isOutsideDate(item, request.settings.tripDate)) {
      issues.push(createPlanIssue("ACTIVITY_OUTSIDE_DATE", "warning", "build-final-schedule", { itemId: item.id }));
    }
    if (isOutsideOpeningWindow(item, entryStart)) {
      issues.push(createPlanIssue("OUTSIDE_OPENING_WINDOW", "warning", "build-final-schedule", { itemId: item.id }));
    }
    if (request.settings.dayEndTime && entryEnd !== null) {
      const dayEnd = parseKstDateTime(request.settings.tripDate, request.settings.dayEndTime);
      if (dayEnd !== null && entryEnd > dayEnd) issues.push(createPlanIssue("DAY_OVERFLOW", "warning", "build-final-schedule", { itemId: item.id }));
    }

    if (index < orderedItems.length - 1) {
      const leg = legs[index];
      if (!leg || leg.durationMinutes === null || entryEnd === null) {
        cursor = null;
        if (leg) issues.push(createPlanIssue("SCHEDULE_UNKNOWN_AFTER_LEG", "warning", "build-final-schedule", { legId: leg.id }));
      } else {
        cursor = addKstMinutes(entryEnd, leg.durationMinutes);
      }
    } else if (request.endPolicy === "return-to-start") {
      const returnLeg = legs[orderedItems.length - 1];
      cursor = returnLeg && entryEnd !== null && returnLeg.durationMinutes !== null
        ? addKstMinutes(entryEnd, returnLeg.durationMinutes)
        : null;
      if (returnLeg && (returnLeg.durationMinutes === null || entryEnd === null)) {
        issues.push(createPlanIssue("SCHEDULE_UNKNOWN_AFTER_LEG", "warning", "build-final-schedule", { legId: returnLeg.id }));
      }
    }
  }

  const finalEntry = entries.at(-1);
  const returnArrivalAt = request.endPolicy === "return-to-start" ? formatKstInstant(cursor) : null;
  const endsAt = returnArrivalAt ?? finalEntry?.endsAt ?? null;
  return { scheduledItems: entries, startsAt, endsAt, returnArrivalAt, issues };
}

export function isKstDate(value: string): boolean {
  return parseKstDate(value) !== null;
}

