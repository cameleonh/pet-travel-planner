import type { PlanActivity, PlanPlace } from "@/domain/plan";
import type { PlanningRequestV1, QualificationContext } from "@/domain/planning/contracts";
import { formatKstInstant } from "@/domain/planning/kst-time";
import { planningItemFromPlanActivity, planningItemFromPlanPlace } from "@/features/search/planning-item-adapter";

export function planningRequestFromLegacy(input: {
  planId: string;
  region: string;
  places: PlanPlace[];
  activities?: PlanActivity[];
  qualificationContext: QualificationContext;
  settings?: Partial<PlanningRequestV1["settings"]>;
  selectedAt?: string;
}): PlanningRequestV1 {
  const selectionTimestamp = input.selectedAt ?? new Date().toISOString();
  const places = input.places.map((place) => planningItemFromPlanPlace(place, input.qualificationContext, { selectedAt: selectionTimestamp }));
  const activities = (input.activities ?? []).map((activity) => planningItemFromPlanActivity(activity, { selectedAt: selectionTimestamp }));
  const selectedItems = [...places, ...activities];
  const orderedItemIds = [...places, ...activities].filter((item) => item.coordinates).map((item) => item.id);
  const includedItemIds = selectedItems.map((item) => item.id);
  return {
    schemaVersion: 1,
    planId: input.planId,
    revision: 0,
    locale: "ko",
    timeZone: "Asia/Seoul",
    region: input.region,
    qualificationContext: input.qualificationContext,
    selectedItems,
    includedItemIds,
    orderedItemIds,
    nearbyAnchorId: places[0]?.id ?? null,
    startItemId: orderedItemIds[0] ?? null,
    endPolicy: "last-item",
    settings: {
      tripDate: input.settings?.tripDate ?? (formatKstInstant(Date.now())?.slice(0, 10) ?? "1970-01-01"),
      startTime: input.settings?.startTime ?? "09:00",
      dayEndTime: input.settings?.dayEndTime ?? "20:00",
      transportMode: "car",
      pace: input.settings?.pace ?? "balanced",
      orderMode: input.settings?.orderMode ?? "saved",
      defaultDwellMinutes: input.settings?.defaultDwellMinutes ?? 90,
      defaultDwellSource: input.settings?.defaultDwellSource ?? "preset",
      budgetKrw: input.settings?.budgetKrw ?? null,
      includeTollsInBudget: input.settings?.includeTollsInBudget ?? true,
    },
  };
}
