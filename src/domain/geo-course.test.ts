import { describe, expect, it } from "vitest";
import type { AuxiliaryPlace, RawPlace } from "@/data/contracts";
import { buildApproximateCourse, buildApproximateCourseFromPlaces } from "@/domain/course";
import { distanceKm, orderNearbyPlaces, splitNearbyByPetStatus } from "@/domain/geo";
import { evaluatePlace } from "@/domain/match";
import { normalizePlace } from "@/domain/normalize";
import type { MatchEvaluation, SelectedConstraint } from "@/domain/types";

const observedAt = "2026-07-15T00:00:00.000Z";
const origin = { latitude: 37.5, longitude: 127 };

function place(id: string, latitude: number, longitude: number): RawPlace {
  return { id, name: id, category: "attraction", address: "예시 주소", coordinates: { latitude, longitude }, petPolicy: { label: "동반 안내", sourceText: "소형견 가능", sourceUrl: `https://example.invalid/${id}`, observedAt }, amenities: [] };
}

function exact(id: string, latitude: number, longitude: number): MatchEvaluation {
  const constraint: SelectedConstraint = { key: "smallDog", label: "소형견", kind: "hard", protectedCategory: "admission" };
  return evaluatePlace(normalizePlace(place(id, latitude, longitude)), [constraint]);
}

function auxiliary(id: string, latitude: number, petStatus: AuxiliaryPlace["petStatus"]): AuxiliaryPlace {
  return { id, name: id, category: id.includes("museum") ? "museum" : "veterinary", address: "예시 주소", coordinates: { latitude, longitude: 127 }, petStatus, evidence: { label: "공공정보", sourceText: "시설 기본정보", sourceUrl: `https://example.invalid/${id}`, observedAt } };
}

describe("nearby distance", () => {
  it("calculates and deterministically orders coordinate distance", () => {
    expect(distanceKm(origin, origin)).toBeCloseTo(0, 8);
    const ordered = orderNearbyPlaces([auxiliary("museum-far", 37.7, "unknown"), auxiliary("vet-near", 37.51, "confirmed")], origin);
    expect(ordered.map((item) => item.id)).toEqual(["vet-near", "museum-far"]);
    expect(ordered[0]?.distanceKm).toBeLessThan(ordered[1]?.distanceKm ?? 0);
  });

  it("separates confirmed and confirmation-needed places", () => {
    const split = splitNearbyByPetStatus(orderNearbyPlaces([auxiliary("museum", 37.6, "unknown"), auxiliary("vet", 37.51, "confirmed")], origin));
    expect(split.confirmed.map((item) => item.id)).toEqual(["vet"]);
    expect(split.confirmationNeeded.map((item) => item.id)).toEqual(["museum"]);
  });
});

describe("constraint-safe course", () => {
  it("orders exact candidates by distance and never returns travel minutes", () => {
    const result = buildApproximateCourse([exact("far", 37.7, 127), exact("near", 37.51, 127)], origin);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.stops.map((stop) => stop.placeId)).toEqual(["near", "far"]);
    expect(result.stops[0]?.coordinates).toEqual({ latitude: 37.51, longitude: 127 });
    expect(result.routeMode).toBe("approximate");
    expect(JSON.stringify(result)).not.toMatch(/minute|분 소요|travelTime/);
  });

  it("fails closed when any candidate is not exact", () => {
    const candidate = exact("unknown", 37.51, 127);
    candidate.exact = false;
    const result = buildApproximateCourse([candidate], origin);
    expect(result).toEqual(expect.objectContaining({ success: false, code: "NON_EXACT_CANDIDATE" }));
  });

  it("explains when no exact result exists", () => {
    expect(buildApproximateCourse([], origin)).toEqual(expect.objectContaining({ success: false, code: "NO_EXACT_RESULTS" }));
  });

  it("builds a course from places the user explicitly saved while browsing", () => {
    const saved = [
      { id: "saved-far", name: "saved-far", address: "예시 주소", category: "attraction", coordinates: { latitude: 37.7, longitude: 127 }, policySourceText: "", exact: false },
      { id: "saved-near", name: "saved-near", address: "예시 주소", category: "cafe", coordinates: { latitude: 37.51, longitude: 127 }, policySourceText: "", exact: false },
    ];
    const result = buildApproximateCourseFromPlaces(saved, origin);
    expect(result.success).toBe(true);
    if (result.success) expect(result.stops.map((stop) => stop.placeId)).toEqual(["saved-near", "saved-far"]);
  });

  it("starts at the chosen place and can preserve the saved order", () => {
    const saved = [
      { id: "saved-far", name: "saved-far", address: "예시 주소", category: "attraction", coordinates: { latitude: 37.7, longitude: 127 }, policySourceText: "", exact: false },
      { id: "saved-near", name: "saved-near", address: "예시 주소", category: "cafe", coordinates: { latitude: 37.51, longitude: 127 }, policySourceText: "", exact: false },
      { id: "saved-last", name: "saved-last", address: "예시 주소", category: "cafe", coordinates: { latitude: 37.6, longitude: 127 }, policySourceText: "", exact: false },
    ];
    const result = buildApproximateCourseFromPlaces(saved, saved[1]!.coordinates, "saved");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orderMode).toBe("saved");
      expect(result.stops.map((stop) => stop.placeId)).toEqual(["saved-near", "saved-far", "saved-last"]);
    }
  });
});
