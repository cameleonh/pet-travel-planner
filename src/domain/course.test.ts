import { describe, expect, it } from "vitest";
import { buildRecommendedCourse, type RecommendedCandidate } from "@/domain/course";

const origin = { latitude: 37.5, longitude: 127.0 };
const candidates: RecommendedCandidate[] = [
  { id: "cafe-a", name: "카페 A", category: "cafe", coordinates: { latitude: 37.5, longitude: 127.0 } },
  { id: "cafe-d", name: "카페 D", category: "cafe", coordinates: { latitude: 37.505, longitude: 127.0 } },
  { id: "walk-b", name: "산책 B", category: "attraction", coordinates: { latitude: 37.51, longitude: 127.0 } },
  { id: "food-c", name: "식당 C", category: "restaurant", coordinates: { latitude: 37.52, longitude: 127.0 } },
];

describe("buildRecommendedCourse", () => {
  it("fails when there are no candidates", () => {
    const result = buildRecommendedCourse([], origin);
    expect(result.success).toBe(false);
  });

  it("picks a category-diverse, nearest-first set and orders it by nearest neighbor", () => {
    const result = buildRecommendedCourse(candidates, origin, { maxStops: 3 });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.stops.map((stop) => stop.placeId)).toEqual(["cafe-a", "walk-b", "food-c"]);
    expect(result.stops[0]?.distanceFromOriginKm).toBe(0);
  });

  it("rotates the candidate pool so 'shuffle again' yields a different set", () => {
    const first = buildRecommendedCourse(candidates, origin, { maxStops: 3, rotate: 0 });
    const second = buildRecommendedCourse(candidates, origin, { maxStops: 3, rotate: 1 });
    expect(first.success && second.success).toBe(true);
    if (!first.success || !second.success) return;
    expect(second.stops.map((stop) => stop.placeId)).toContain("cafe-d");
    expect(second.stops.map((stop) => stop.placeId)).not.toEqual(first.stops.map((stop) => stop.placeId));
  });

  it("respects the stop cap when fewer candidates exist", () => {
    const result = buildRecommendedCourse(candidates.slice(0, 2), origin, { maxStops: 3 });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.stops).toHaveLength(2);
  });
});
