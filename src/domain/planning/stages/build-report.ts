import type {
  BudgetSummary,
  PlanIssue,
  PlanReportModel,
  PlanningItemSnapshot,
  PlanningRequestV1,
  RouteLeg,
  ScheduleEntry,
  TravelPlanV2,
} from "@/domain/planning/contracts";

function issueCodesFor(itemId: string, issues: PlanIssue[], legIds: string[]) {
  return issues
    .filter((issue) => issue.itemId === itemId || (issue.legId !== null && legIds.includes(issue.legId)))
    .map((issue) => issue.code);
}

export function buildReportModel(input: {
  request: PlanningRequestV1;
  includedItems: PlanningItemSnapshot[];
  scheduledItems: ScheduleEntry[];
  unscheduledItemIds: string[];
  legs: RouteLeg[];
  scheduleSummary: TravelPlanV2["scheduleSummary"];
  issues: PlanIssue[];
  budget: BudgetSummary;
  departureRecommendation: TravelPlanV2["departureRecommendation"];
}): PlanReportModel {
  const roadCount = input.legs.filter((leg) => leg.basis === "provider-road").length;
  const coordinateCount = input.legs.filter((leg) => leg.basis === "coordinate-only").length;
  const distanceBasis: PlanReportModel["overview"]["distanceBasis"] = roadCount > 0 && coordinateCount > 0
    ? "mixed"
    : roadCount > 0 ? "road" : "coordinate-only";
  const totalDistanceKm = Math.round(input.legs.reduce((sum, leg) => sum + leg.distanceKm, 0) * 100) / 100;
  const totalKnownTravelMinutes = input.legs.reduce((sum, leg) => sum + (leg.durationMinutes ?? 0), 0);
  const unknownLegCount = input.legs.filter((leg) => leg.durationMinutes === null).length;
  const legIdsByItem = new Map<string, string[]>();
  for (const leg of input.legs) {
    legIdsByItem.set(leg.fromItemId, [...(legIdsByItem.get(leg.fromItemId) ?? []), leg.id]);
    legIdsByItem.set(leg.toItemId, [...(legIdsByItem.get(leg.toItemId) ?? []), leg.id]);
  }

  const visits = input.scheduledItems.map((entry) => ({
    sequence: entry.sequence,
    itemId: entry.itemId,
    startsAt: entry.startsAt,
    endsAt: entry.endsAt,
    dwellMinutes: entry.dwellMinutes,
    issueCodes: issueCodesFor(entry.itemId, input.issues, legIdsByItem.get(entry.itemId) ?? []),
  }));

  const movements = input.legs.map((leg, index) => {
    const from = input.scheduledItems.find((entry) => entry.itemId === leg.fromItemId);
    const to = input.scheduledItems.find((entry) => entry.itemId === leg.toItemId);
    const isReturnLeg = input.request.endPolicy === "return-to-start" && index === input.legs.length - 1 && leg.toItemId === input.request.startItemId;
    const issueCodes = input.issues.filter((issue) => issue.legId === leg.id).map((issue) => issue.code);
    return {
      sequence: index + 1,
      legId: leg.id,
      fromItemId: leg.fromItemId,
      toItemId: leg.toItemId,
      departureAt: from?.endsAt ?? null,
      arrivalAt: isReturnLeg ? input.scheduleSummary.returnArrivalAt : to?.startsAt ?? null,
      distanceKm: leg.distanceKm,
      durationMinutes: leg.durationMinutes,
      durationBasis: leg.durationBasis,
      trafficDetailsBasis: leg.trafficDetailsBasis,
      fetchedAt: leg.fetchedAt,
      forecastDepartureAt: leg.forecastDepartureAt,
      congestedRoads: leg.congestedRoads,
      mapLink: leg.mapLink,
      naviLink: leg.naviLink,
      issueCodes,
      isReturnLeg,
    };
  });

  return {
    overview: {
      tripDate: input.request.settings.tripDate,
      region: input.request.region,
      startsAt: input.scheduleSummary.startsAt,
      endsAt: input.scheduleSummary.endsAt,
      recommendedFirstMoveAt: input.departureRecommendation?.recommendedDepartureAt ?? null,
      scheduledCount: input.scheduledItems.length,
      unscheduledCount: input.unscheduledItemIds.length,
      totalDistanceKm,
      distanceBasis,
      totalKnownTravelMinutes,
      unknownLegCount,
    },
    visits,
    movements,
    unscheduled: input.unscheduledItemIds.map((itemId) => ({ itemId, reasonCode: "ITEM_WITHOUT_COORDINATES" as const })),
    confirmationItemIds: input.includedItems
      .filter((item) => item.petAdmission.needsConfirmation || item.petAdmission.status === "unverified")
      .map((item) => item.id),
    budget: input.budget,
  };
}
