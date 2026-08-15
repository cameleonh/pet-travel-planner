import { distanceKm, type Coordinates } from "@/domain/geo";
import type { MatchEvaluation } from "@/domain/types";
import type { PlanPlace } from "@/domain/plan";

export type CourseStop = {
  placeId: string;
  name: string;
  category: string;
  coordinates: Coordinates;
  distanceFromOriginKm: number;
  proofCount: number;
};

export type CourseOrderMode = "nearby" | "saved";

export type CourseResult =
  | { success: true; routeMode: "approximate"; orderMode: CourseOrderMode; disclosure: string; stops: CourseStop[] }
  | { success: false; code: "NO_EXACT_RESULTS" | "NON_EXACT_CANDIDATE"; message: string };

export function buildApproximateCourse(candidates: MatchEvaluation[], origin: Coordinates, maximumStops = 3): CourseResult {
  if (candidates.some((candidate) => !candidate.exact)) {
    return { success: false, code: "NON_EXACT_CANDIDATE", message: "정확한 조건을 통과하지 않은 장소는 코스에 넣을 수 없습니다." };
  }
  if (candidates.length === 0) {
    return { success: false, code: "NO_EXACT_RESULTS", message: "먼저 정확한 조건에 맞는 장소를 찾아주세요." };
  }
  const stops = candidates
    .map((candidate) => ({
      placeId: candidate.place.id,
      name: candidate.place.name,
      category: candidate.place.category,
      coordinates: candidate.place.coordinates,
      distanceFromOriginKm: distanceKm(origin, candidate.place.coordinates),
      proofCount: candidate.proof.length,
    }))
    .sort((a, b) => a.distanceFromOriginKm - b.distanceFromOriginKm || a.name.localeCompare(b.name, "ko"))
    .slice(0, Math.max(1, maximumStops));
  return { success: true, routeMode: "approximate", orderMode: "nearby", disclosure: "좌표 직선거리로 가까운 순서를 제안합니다. 실제 이동 시간이나 길 안내가 아닙니다.", stops };
}

export function buildApproximateCourseFromPlaces(places: PlanPlace[], origin: Coordinates, orderMode: CourseOrderMode = "nearby"): CourseResult {
  if (places.length === 0) {
    return { success: false, code: "NO_EXACT_RESULTS", message: "먼저 여행 보드에 장소를 담아주세요." };
  }

  const mappedStops = places.map((place) => ({
      placeId: place.id,
      name: place.name,
      category: place.category,
      coordinates: place.coordinates,
      distanceFromOriginKm: distanceKm(origin, place.coordinates),
      proofCount: 0,
    }));
  const exactStartIndex = mappedStops.findIndex((stop) => stop.coordinates.latitude === origin.latitude && stop.coordinates.longitude === origin.longitude);
  const nearestStart = [...mappedStops].sort((a, b) => a.distanceFromOriginKm - b.distanceFromOriginKm || a.name.localeCompare(b.name, "ko"))[0]!;
  const start = mappedStops[exactStartIndex >= 0 ? exactStartIndex : mappedStops.indexOf(nearestStart)]!;
  const remaining = mappedStops.filter((stop) => stop.placeId !== start.placeId);

  let ordered: CourseStop[];
  if (orderMode === "saved") {
    ordered = [start, ...remaining];
  } else {
    ordered = [start];
    let current = start;
    while (remaining.length > 0) {
      remaining.sort((a, b) => {
        const distanceDiff = distanceKm(current.coordinates, a.coordinates) - distanceKm(current.coordinates, b.coordinates);
        return distanceDiff || a.name.localeCompare(b.name, "ko");
      });
      current = remaining.shift()!;
      ordered.push(current);
    }
  }

  return {
    success: true,
    routeMode: "approximate",
    orderMode,
    disclosure: orderMode === "nearby"
      ? "선택한 출발 장소부터 좌표상 가까운 다음 장소를 차례로 제안합니다. 실제 이동 시간이나 길 안내가 아닙니다."
      : "선택한 출발 장소를 먼저 두고 여행 보드에 저장한 순서를 유지합니다.",
    stops: ordered,
  };
}
