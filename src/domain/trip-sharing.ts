import type { PlanPlace, RouteSegment } from "@/domain/plan";

export type ShareableTripPlace = Pick<PlanPlace, "name" | "address" | "dwellMinutes" | "coordinates" | "operatingHours" | "policySourceText" | "policySourceUrl" | "policyObservedAt" | "plannedVisitAt" | "visitWindowStatus" | "closingDayChecked">;
export type ShareableTripRoute = Pick<RouteSegment, "fromName" | "toName" | "distanceKm" | "durationMinutes" | "routeMode">;

export type ShareableTrip = {
  tripDate: string;
  departure: string;
  arrival: string | null;
  places: ShareableTripPlace[];
  routes: ShareableTripRoute[];
};

export function summarizeTripRoutes(routes: ShareableTripRoute[]): {
  totalRoadDistanceKm: number | null;
  totalRoadDurationMinutes: number | null;
  hasUnverifiedRoute: boolean;
} {
  const hasUnverifiedRoute = routes.some((route) => route.routeMode !== "road" || route.durationMinutes === null);
  if (routes.length === 0 || hasUnverifiedRoute) {
    return { totalRoadDistanceKm: null, totalRoadDurationMinutes: null, hasUnverifiedRoute };
  }

  return {
    totalRoadDistanceKm: Math.round(routes.reduce((total, route) => total + route.distanceKm, 0) * 10) / 10,
    totalRoadDurationMinutes: routes.reduce((total, route) => total + route.durationMinutes!, 0),
    hasUnverifiedRoute: false,
  };
}

export function buildTripShareText(plan: ShareableTrip, shareUrl?: string): string {
  const summary = summarizeTripRoutes(plan.routes);
  const stops = plan.places.flatMap((place, index) => {
    const dwell = place.dwellMinutes == null ? "" : ` · 체류 ${place.dwellMinutes}분`;
    const openingHours = place.operatingHours?.useTime ? `  이용시간: ${place.operatingHours.useTime}` : "  이용시간: 확인 필요";
    const closingDays = place.operatingHours?.restDate ? ` · 휴무: ${place.operatingHours.restDate}` : " · 휴무: 확인 필요";
    const sourceText = place.policySourceText.trim();
    const evidence = place.policySourceUrl
      ? [
          `  반려견 동반 정보: ${sourceText ? `${sourceText.slice(0, 240)}${sourceText.length > 240 ? "…" : ""}` : "원문 확인 필요"}`,
          `  KTO 정보 관측일: ${place.policyObservedAt?.slice(0, 10) ?? "미확인"} · ${place.policySourceUrl}`,
        ]
      : ["  반려견 동반 조건은 방문 전 직접 확인해 주세요."];
    const hoursDate = place.operatingHours?.fetchedAt ? ` · 상세 수집 ${place.operatingHours.fetchedAt.slice(0, 10)}` : "";
    const visitWindow = place.visitWindowStatus === "within-hours"
      ? place.closingDayChecked ? "기재된 이용시간 안 · 당일 확인 권장" : "이용시간 안으로 보이나 휴무 미확인"
      : place.visitWindowStatus === "outside-hours"
        ? "예상 방문시간이 기재된 이용시간 밖"
        : place.visitWindowStatus === "closed-day"
          ? "등록된 정기 휴무일"
          : "운영시간상 방문 가능 여부 미확인";
    return [
      `${index + 1}. ${place.name} (${place.address})${dwell}`,
      `  예상 방문: ${place.plannedVisitAt ?? "시간 미확인"} · ${visitWindow}`,
      ...evidence,
      `${openingHours}${closingDays}${hoursDate}`,
    ];
  });
  const legs = plan.routes.map((route) => {
    if (route.routeMode === "road" && route.durationMinutes !== null) {
      return `- ${route.fromName} → ${route.toName} · ${route.distanceKm.toFixed(1)}km · 약 ${route.durationMinutes}분`;
    }
    return `- ${route.fromName} → ${route.toName} · 직선거리 ${route.distanceKm.toFixed(1)}km · 실제 경로와 이동시간 확인 필요`;
  });
  const routeSummary = summary.totalRoadDistanceKm !== null && summary.totalRoadDurationMinutes !== null
    ? `예상 총 도로 이동 ${summary.totalRoadDistanceKm.toFixed(1)}km · 약 ${Math.round(summary.totalRoadDurationMinutes)}분`
    : plan.routes.length > 0
      ? "실제 도로 경로 또는 이동시간이 확인되지 않은 구간이 있어 총 이동시간은 계산하지 않았어요."
      : "이동 구간 정보가 아직 없어요.";

  return [
    `🐾 [같이갈개] ${plan.tripDate} 반려견 동반 여행 코스`,
    `출발 ${plan.departure}${plan.arrival ? ` · 마지막 장소 도착 예상 ${plan.arrival}` : ""}`,
    "",
    "방문 장소",
    ...stops,
    "",
    "이동 구간",
    ...(legs.length > 0 ? legs : ["- 일정에 추가된 이동 구간이 없어요."]),
    routeSummary,
    "",
    ...(shareUrl ? [`코스 상세 보기: ${shareUrl}`] : ["이 메시지에는 저장된 코스 링크가 없습니다."]),
  ].join("\n");
}
