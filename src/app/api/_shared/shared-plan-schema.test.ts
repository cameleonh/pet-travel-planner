import { describe, expect, it } from "vitest";
import { sharedPlanRequestSchema } from "@/app/api/_shared/shared-plan-schema";

describe("shared plan request schema", () => {
  it("accepts a route with source collection details and approximate legs", () => {
    const parsed = sharedPlanRequestSchema.safeParse({
      plan: {
        tripDate: "2026-10-03",
        departure: "09:00",
        arrival: null,
        places: [{
          name: "해운대 블루라인파크",
          address: "부산 해운대구",
          dwell: null,
          coordinates: { latitude: 35.161, longitude: 129.191 },
          plannedVisitAt: "10:00",
          visitWindowStatus: "within-hours",
          closingDayChecked: true,
          operatingHours: { useTime: "09:00~18:00", restDate: null, fetchedAt: "2026-08-05T15:10:40.323Z" },
        }],
        routes: [{ fromName: "A", toName: "B", distanceKm: 2.4, durationMinutes: null, routeMode: "approximate" }],
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects more stops than the planner supports", () => {
    const basePlace = { name: "장소", address: "부산", coordinates: { latitude: 35.1, longitude: 129.1 } };
    const parsed = sharedPlanRequestSchema.safeParse({
      plan: {
        tripDate: "2026-10-03",
        departure: "09:00",
        arrival: null,
        places: Array.from({ length: 13 }, (_, index) => ({ ...basePlace, name: `장소 ${index}` })),
        routes: [],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects coordinates outside the valid geographic range", () => {
    const parsed = sharedPlanRequestSchema.safeParse({
      plan: {
        tripDate: "2026-10-03",
        departure: "09:00",
        places: [{ name: "장소", address: "부산", coordinates: { latitude: 91, longitude: 129.1 } }],
        routes: [],
      },
    });

    expect(parsed.success).toBe(false);
  });
});
