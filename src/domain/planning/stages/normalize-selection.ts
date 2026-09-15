import type { PlanningItemSnapshot, PlanningRequestV1 } from "@/domain/planning/contracts";
import { createPlanIssue } from "@/domain/planning/issues";
import { planningRequestSchema } from "@/domain/planning/schemas";

export type NormalizedSelection = {
  request: PlanningRequestV1;
  includedItems: PlanningItemSnapshot[];
  orderedItems: PlanningItemSnapshot[];
  unscheduledItems: PlanningItemSnapshot[];
  issues: ReturnType<typeof createPlanIssue>[];
};

function invalidInput(request: PlanningRequestV1, details: string): NormalizedSelection {
  return {
    request,
    includedItems: [],
    orderedItems: [],
    unscheduledItems: [],
    issues: [createPlanIssue("INVALID_INPUT", "blocking", "normalize-selection", { params: { details } })],
  };
}

export function normalizeSelection(request: PlanningRequestV1): NormalizedSelection {
  const parsed = planningRequestSchema.safeParse(request);
  if (!parsed.success) return invalidInput(request, parsed.error.issues.map((issue) => issue.message).join(", "));

  const normalizedRequest = parsed.data as PlanningRequestV1;
  const itemsById = new Map(normalizedRequest.selectedItems.map((item) => [item.id, item]));
  const issues: NormalizedSelection["issues"] = [];
  const includedItems = normalizedRequest.includedItemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is PlanningItemSnapshot => Boolean(item));
  const orderedItems = normalizedRequest.orderedItemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is PlanningItemSnapshot => Boolean(item));
  const includedIds = new Set(normalizedRequest.includedItemIds);
  const orderedIds = new Set(normalizedRequest.orderedItemIds);
  const unscheduledItems = includedItems.filter((item) => !item.coordinates);

  for (const id of normalizedRequest.includedItemIds) {
    if (!itemsById.has(id)) issues.push(createPlanIssue("UNKNOWN_ITEM_ID", "blocking", "normalize-selection", { itemId: id }));
  }
  for (const item of includedItems) {
    if (item.coordinates && !orderedIds.has(item.id)) {
      issues.push(createPlanIssue("INTERNAL_PLAN_INVARIANT", "blocking", "normalize-selection", {
        itemId: item.id,
        params: { details: "coordinate item is included but missing from orderedItemIds" },
      }));
    }
    if (!item.coordinates) {
      issues.push(createPlanIssue("ITEM_WITHOUT_COORDINATES", "warning", "normalize-selection", { itemId: item.id }));
    }
    if (item.role === "core" && item.qualification.queryFingerprint !== normalizedRequest.qualificationContext.queryFingerprint) {
      issues.push(createPlanIssue("QUALIFICATION_CONTEXT_MISMATCH", "blocking", "normalize-selection", {
        itemId: item.id,
        params: { expected: normalizedRequest.qualificationContext.queryFingerprint, actual: item.qualification.queryFingerprint },
      }));
    }
    if (item.role === "core" && item.qualification.hardConstraintKeys.length > 0 && item.qualification.status !== "exact-match") {
      issues.push(createPlanIssue("HARD_CONSTRAINT_MISMATCH", "blocking", "normalize-selection", { itemId: item.id, params: { status: item.qualification.status } }));
    }
    if (item.petAdmission.needsConfirmation) {
      issues.push(createPlanIssue("PET_POLICY_UNVERIFIED", "warning", "normalize-selection", { itemId: item.id }));
    }
  }
  if (includedItems.length === 0) issues.push(createPlanIssue("NO_SELECTED_ITEMS", "blocking", "normalize-selection"));
  if (orderedItems.length < 1) issues.push(createPlanIssue("NOT_ENOUGH_ROUTE_NODES", "blocking", "normalize-selection"));
  if (orderedItems.length > 12) issues.push(createPlanIssue("TOO_MANY_ROUTE_NODES", "blocking", "normalize-selection", { params: { count: orderedItems.length } }));
  if (normalizedRequest.startItemId === null || normalizedRequest.startItemId !== normalizedRequest.orderedItemIds[0]) {
    issues.push(createPlanIssue("INTERNAL_PLAN_INVARIANT", "blocking", "normalize-selection", { params: { details: "startItemId must be the first ordered item" } }));
  }
  for (const id of normalizedRequest.orderedItemIds) {
    if (!includedIds.has(id)) issues.push(createPlanIssue("INTERNAL_PLAN_INVARIANT", "blocking", "normalize-selection", { itemId: id, params: { details: "ordered item is not included" } }));
  }

  return { request: normalizedRequest, includedItems, orderedItems, unscheduledItems, issues };
}

