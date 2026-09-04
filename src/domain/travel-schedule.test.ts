import { describe, expect, it } from "vitest";
import type { RouteSegment } from "@/domain/plan";
import { buildDepartureCandidates, buildTravelSchedule, formatProviderDeparture } from "@/domain/travel-schedule";

const route = (fromName: string, toName: string, durationMinutes: number | null): RouteSegment => ({
  fromPlaceId: fromName,
  toPlaceId: toName,
  fromName,
  toName,
  distanceKm: 10,
  durationMinutes,
  routeMode: durationMinutes === null ? "approximate" : "road",
  hasCongestion: false,
  congestedRoads: [],
  smoothSegments: 1,
  slowSegments: 0,
  congestedSegments: 0,
  jammedSegments: 0,
  mapLink: "https://example.com/map",
  naviLink: "https://example.com/navi",
});

describe("travel schedule", () => {
  it("compares one hour before and after the preferred departure", () => {
    const candidates = buildDepartureCandidates("2026-08-16", "09:00", new Date("2026-08-15T12:00:00"));
    expect(candidates.map((candidate) => candidate.label)).toEqual(["08:00", "09:00", "10:00"]);
    expect(candidates[1]?.providerValue).toBe("202608160900");
  });

  it("drops departure candidates that are already in the past", () => {
    const candidates = buildDepartureCandidates("2026-08-15", "09:00", new Date("2026-08-15T09:30:00"));
    expect(candidates.map((candidate) => candidate.label)).toEqual(["10:00"]);
  });

  it("builds departure and arrival times with dwell time between stops", () => {
    const schedule = buildTravelSchedule(
      [route("A", "B", 30), route("B", "C", 20)],
      "2026-08-16",
      "08:00",
      90,
      25,
    );
    expect(schedule[0]?.departureAt?.getHours()).toBe(8);
    expect(schedule[0]?.arrivalAt?.getMinutes()).toBe(25);
    expect(schedule[1]?.departureAt?.getHours()).toBe(9);
    expect(schedule[1]?.departureAt?.getMinutes()).toBe(55);
    expect(schedule[1]?.arrivalAt?.getHours()).toBe(10);
    expect(schedule[1]?.arrivalAt?.getMinutes()).toBe(15);
  });

  it("applies a per-place dwell override only at the overridden stop", () => {
    const schedule = buildTravelSchedule(
      [route("A", "B", 30), route("B", "C", 20)],
      "2026-08-16",
      "08:00",
      90,
      null,
      { B: 30 },
    );
    // Stay 30 minutes at B instead of the 90-minute default; C keeps the default.
    expect(schedule[1]?.departureAt?.getHours()).toBe(9);
    expect(schedule[1]?.departureAt?.getMinutes()).toBe(0);
    expect(schedule[1]?.arrivalAt?.getHours()).toBe(9);
    expect(schedule[1]?.arrivalAt?.getMinutes()).toBe(20);
  });

  it("stops assigning times after an approximate segment", () => {
    const schedule = buildTravelSchedule(
      [route("A", "B", null), route("B", "C", 20)],
      "2026-08-16",
      "08:00",
      60,
    );
    expect(schedule[0]?.departureAt).not.toBeNull();
    expect(schedule[0]?.arrivalAt).toBeNull();
    expect(schedule[1]?.departureAt).toBeNull();
  });

  it("formats provider timestamps in local time", () => {
    expect(formatProviderDeparture(new Date("2026-08-16T07:05:00"))).toBe("202608160705");
  });
});
