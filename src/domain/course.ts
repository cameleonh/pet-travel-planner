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

export type RecommendedCandidate = { id: string; name: string; category: string; coordinates: Coordinates };
export type RecommendedCourseResult =
  | { success: true; stops: CourseStop[] }
  | { success: false; code: "NOT_ENOUGH"; message: string };

// Auto-picks a short course from the filtered candidates: nearest to the origin
// first, then a category-diverse set, ordered by nearest-neighbor so the drive is
// short. `rotate` lets "shuffle again" surface a different set deterministically.
export function buildRecommendedCourse(
  candidates: RecommendedCandidate[],
  origin: Coordinates,
  options: { maxStops?: number; rotate?: number } = {},
): RecommendedCourseResult {
  const maxStops = Math.max(1, options.maxStops ?? 3);
  const pool = candidates
    .filter((candidate) => candidate.coordinates)
    .map((candidate) => ({ ...candidate, distance: distanceKm(origin, candidate.coordinates) }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, "ko"));
  if (pool.length === 0) return { success: false, code: "NOT_ENOUGH", message: "조건에 맞는 장소가 없어요." };

  const rotate = ((options.rotate ?? 0) % pool.length + pool.length) % pool.length;
  const rotated = [...pool.slice(rotate), ...pool.slice(0, rotate)];

  // Prefer different categories (a café, a walk, a meal...) before repeating one.
  const picked: typeof pool = [];
  const usedCategories = new Set<string>();
  for (const candidate of rotated) {
    if (picked.length >= maxStops) break;
    if (!usedCategories.has(candidate.category)) { picked.push(candidate); usedCategories.add(candidate.category); }
  }
  for (const candidate of rotated) {
    if (picked.length >= maxStops) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }

  // Nearest-neighbor ordering starting from the stop closest to the origin.
  const remaining = [...picked].sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, "ko"));
  const ordered = [remaining.shift()!];
  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]!;
    remaining.sort((a, b) => distanceKm(current.coordinates, a.coordinates) - distanceKm(current.coordinates, b.coordinates) || a.name.localeCompare(b.name, "ko"));
    ordered.push(remaining.shift()!);
  }

  return {
    success: true,
    stops: ordered.map((stop) => ({
      placeId: stop.id,
      name: stop.name,
      category: stop.category,
      coordinates: stop.coordinates,
      distanceFromOriginKm: Math.round(stop.distance * 100) / 100,
      proofCount: 0,
    })),
  };
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
