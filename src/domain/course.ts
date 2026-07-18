import { distanceKm, type Coordinates } from "@/domain/geo";
import type { MatchEvaluation } from "@/domain/types";

export type CourseStop = {
  placeId: string;
  name: string;
  category: MatchEvaluation["place"]["category"];
  coordinates: Coordinates;
  distanceFromOriginKm: number;
  proofCount: number;
};

export type CourseResult =
  | { success: true; routeMode: "approximate"; disclosure: string; stops: CourseStop[] }
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
  return { success: true, routeMode: "approximate", disclosure: "좌표 직선거리로 가까운 순서를 제안합니다. 실제 이동 시간이나 길 안내가 아닙니다.", stops };
}
