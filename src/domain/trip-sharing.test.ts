import { describe, expect, it } from "vitest";
import { buildTripShareText, summarizeTripRoutes, type ShareableTrip } from "@/domain/trip-sharing";

describe("trip sharing summaries", () => {
  it("totals only complete road-route legs", () => {
    expect(summarizeTripRoutes([
      { fromName: "A", toName: "B", distanceKm: 3.2, durationMinutes: 8, routeMode: "road" },
      { fromName: "B", toName: "C", distanceKm: 4.1, durationMinutes: 11, routeMode: "road" },
    ])).toEqual({ totalRoadDistanceKm: 7.3, totalRoadDurationMinutes: 19, hasUnverifiedRoute: false });
  });

  it("does not turn unavailable route time into a zero-minute total or a fake share URL", () => {
    const plan: ShareableTrip = {
      tripDate: "2026-10-03",
      departure: "09:00",
      arrival: null,
      places: [{ name: "해운대 블루라인파크", address: "부산 해운대구", dwellMinutes: null, coordinates: { latitude: 35.161, longitude: 129.191 }, policySourceText: "이동장 사용 시 전 견종 동반 가능", policySourceUrl: "https://www.data.go.kr/data/15135102/openapi.do", policyObservedAt: "2026-07-30T15:21:45.885Z", operatingHours: null, plannedVisitAt: "10:00", visitWindowStatus: "unknown", closingDayChecked: false }],
      routes: [{ fromName: "A", toName: "B", distanceKm: 2.4, durationMinutes: null, routeMode: "approximate" }],
    };

    const summary = summarizeTripRoutes(plan.routes);
    const text = buildTripShareText(plan);

    expect(summary).toEqual({ totalRoadDistanceKm: null, totalRoadDurationMinutes: null, hasUnverifiedRoute: true });
    expect(text).toContain("직선거리 2.4km");
    expect(text).toContain("이동장 사용 시 전 견종 동반 가능");
    expect(text).toContain("예상 방문: 10:00");
    expect(text).toContain("운영시간상 방문 가능 여부 미확인");
    expect(text).toContain("https://www.data.go.kr/data/15135102/openapi.do");
    expect(text).toContain("총 이동시간은 계산하지 않았어요");
    expect(text).not.toContain("약 0분");
    expect(text).not.toContain("https://gggo.blog");
  });
});
