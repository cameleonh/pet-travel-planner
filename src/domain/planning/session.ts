import type {
  GenerationEnvelope,
  PersistedPlanningSessionV1,
  PlannerOrderMode,
  PlanningPhase,
  PlanningRequestV1,
  PlanningSessionV1,
} from "@/domain/planning/contracts";
import { createSessionNotice, hasBlockingIssue } from "@/domain/planning/issues";
import { planningRequestSchema } from "@/domain/planning/schemas";

export type PlannerCommand =
  | { type: "SET_QUALIFICATION_CONTEXT"; context: PlanningRequestV1["qualificationContext"] }
  | { type: "SET_ITEM_INCLUDED"; itemId: string; included: boolean }
  | { type: "REORDER_ITEMS"; orderedItemIds: string[] }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "SET_ITEM_DWELL"; itemId: string; minutes: number | null }
  | { type: "SET_DEFAULT_DWELL"; minutes: number }
  | { type: "RESET_DEFAULT_DWELL_TO_PACE" }
  | { type: "SET_TRIP_DATE"; date: string }
  | { type: "SET_START_TIME"; time: string }
  | { type: "SET_DAY_END_TIME"; time: string | null }
  | { type: "SET_PACE"; pace: PlanningRequestV1["settings"]["pace"] }
  | { type: "SET_ORDER_MODE"; mode: PlannerOrderMode }
  | { type: "SET_START_ITEM"; itemId: string }
  | { type: "APPLY_DEPARTURE_RECOMMENDATION"; legId: string; recommendedDepartureAt: string; sourceRevision: number }
  | { type: "SET_END_POLICY"; policy: PlanningRequestV1["endPolicy"] }
  | { type: "SET_BUDGET"; amountKrw: number | null }
  | { type: "SET_ITEM_COST"; itemId: string; amountKrw: number | null }
  | { type: "SET_INCLUDE_TOLLS"; included: boolean };

export type PlanningSessionEvent =
  | { type: "COMPLETE_SELECTION" }
  | { type: "SET_NEARBY_ANCHOR"; itemId: string | null }
  | { type: "COMPLETE_REGIONAL_REVIEW"; region: string }
  | { type: "INVALIDATE_REGIONAL_REVIEW"; region: string }
  | { type: "COMPLETE_NEARBY_REVIEW"; anchorItemId: string }
  | { type: "INVALIDATE_NEARBY_REVIEW"; anchorItemId: string }
  | { type: "CONFIRM_COURSE" }
  | { type: "GENERATION_STARTED"; generationId: string; inputRevision: number; inputFingerprint: string }
  | { type: "COMMIT_GENERATION"; envelope: GenerationEnvelope }
  | { type: "GENERATION_ABORTED"; generationId: string }
  | { type: "RETRY_LEG"; legId: string }
  | { type: "RESET_PLANNING_SESSION" };

const paceDwell: Record<PlanningRequestV1["settings"]["pace"], number> = { relaxed: 120, balanced: 90, packed: 60 };

function reviewRequired(request: PlanningRequestV1) {
  return { regional: request.region.trim().length > 0, nearby: request.nearbyAnchorId !== null };
}

function allReviewsComplete(session: PlanningSessionV1) {
  const required = reviewRequired(session.request);
  return (!required.regional || session.regionalReview?.region === session.request.region && session.regionalReview.completed)
    && (!required.nearby || session.nearbyReview?.anchorItemId === session.request.nearbyAnchorId && session.nearbyReview.completed);
}

function phaseAfterSelection(session: PlanningSessionV1): PlanningPhase {
  if (session.request.includedItemIds.length === 0) return "selecting";
  return allReviewsComplete(session) ? "course-config" : "supplemental-review";
}

function reconcileRequest(request: PlanningRequestV1): PlanningRequestV1 {
  const selected = new Map(request.selectedItems.map((item) => [item.id, item]));
  const included = request.includedItemIds.filter((id, index, ids) => selected.has(id) && ids.indexOf(id) === index);
  const includedSet = new Set(included);
  const routeable = new Set(included.filter((id) => selected.get(id)?.coordinates));
  const ordered = request.orderedItemIds.filter((id, index, ids) => routeable.has(id) && ids.indexOf(id) === index);
  for (const id of included) if (routeable.has(id) && !ordered.includes(id)) ordered.push(id);
  const start = request.startItemId && ordered.includes(request.startItemId) ? request.startItemId : ordered[0] ?? null;
  const anchor = request.nearbyAnchorId && includedSet.has(request.nearbyAnchorId) ? request.nearbyAnchorId : null;
  return { ...request, includedItemIds: included, orderedItemIds: ordered, startItemId: start, nearbyAnchorId: anchor };
}

function mutateRequest(session: PlanningSessionV1, mutate: (request: PlanningRequestV1) => PlanningRequestV1, invalidateReviews = true): PlanningSessionV1 {
  const request = reconcileRequest(mutate({ ...session.request, revision: session.request.revision + 1 }));
  const next: PlanningSessionV1 = {
    ...session,
    request,
    draft: null,
    dirtyStages: ["normalize-selection", "build-route-legs", "build-final-schedule", "calculate-budget", "build-report", "validate-plan"],
    activeGeneration: null,
  };
  if (!invalidateReviews) return { ...next, phase: phaseAfterSelection(next) };
  return { ...next, phase: phaseAfterSelection({ ...next, regionalReview: null, nearbyReview: null }), regionalReview: null, nearbyReview: null };
}

export function createPlanningSession(request: PlanningRequestV1): PlanningSessionV1 {
  const normalized = reconcileRequest(request);
  const base: PlanningSessionV1 = {
    schemaVersion: 1,
    phase: "selecting",
    request: normalized,
    draft: null,
    lastValidDraft: null,
    generationIssues: [],
    notices: [],
    activeGeneration: null,
    dirtyStages: ["normalize-selection"],
    regionalReview: null,
    nearbyReview: null,
  };
  return { ...base, phase: phaseAfterSelection(base) };
}

export function applyPlannerCommand(session: PlanningSessionV1, command: PlannerCommand): PlanningSessionV1 {
  switch (command.type) {
    case "SET_QUALIFICATION_CONTEXT":
      return mutateRequest(session, (request) => ({ ...request, qualificationContext: command.context }));
    case "SET_ITEM_INCLUDED":
      return mutateRequest(session, (request) => ({
        ...request,
        includedItemIds: command.included
          ? [...request.includedItemIds, ...(request.includedItemIds.includes(command.itemId) ? [] : [command.itemId])]
          : request.includedItemIds.filter((id) => id !== command.itemId),
      }));
    case "REMOVE_ITEM":
      return mutateRequest(session, (request) => ({
        ...request,
        selectedItems: request.selectedItems.filter((item) => item.id !== command.itemId),
        includedItemIds: request.includedItemIds.filter((id) => id !== command.itemId),
        orderedItemIds: request.orderedItemIds.filter((id) => id !== command.itemId),
      }));
    case "REORDER_ITEMS": {
      const routeable = new Set(session.request.includedItemIds.filter((id) => session.request.selectedItems.find((item) => item.id === id)?.coordinates));
      if (command.orderedItemIds.length !== routeable.size || new Set(command.orderedItemIds).size !== routeable.size || command.orderedItemIds.some((id) => !routeable.has(id))) return session;
      return mutateRequest(session, (request) => ({ ...request, orderedItemIds: command.orderedItemIds, startItemId: command.orderedItemIds[0] ?? null }), false);
    }
    case "SET_ITEM_DWELL":
      if (command.minutes !== null && (!Number.isInteger(command.minutes) || command.minutes < 0 || command.minutes > 1440)) return session;
      return mutateRequest(session, (request) => ({ ...request, selectedItems: request.selectedItems.map((item) => item.id === command.itemId ? { ...item, userDwellMinutes: command.minutes } : item) }), false);
    case "SET_DEFAULT_DWELL":
      if (!Number.isInteger(command.minutes) || command.minutes < 15 || command.minutes > 480) return session;
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, defaultDwellMinutes: command.minutes, defaultDwellSource: "user" } }), false);
    case "RESET_DEFAULT_DWELL_TO_PACE":
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, defaultDwellMinutes: paceDwell[request.settings.pace], defaultDwellSource: "preset" } }), false);
    case "SET_TRIP_DATE":
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, tripDate: command.date } }), false);
    case "SET_START_TIME":
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, startTime: command.time } }), false);
    case "SET_DAY_END_TIME":
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, dayEndTime: command.time } }), false);
    case "SET_PACE":
      return mutateRequest(session, (request) => ({
        ...request,
        settings: { ...request.settings, pace: command.pace, defaultDwellMinutes: request.settings.defaultDwellSource === "preset" ? paceDwell[command.pace] : request.settings.defaultDwellMinutes },
      }), false);
    case "SET_ORDER_MODE":
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, orderMode: command.mode } }), false);
    case "SET_START_ITEM": {
      if (!session.request.orderedItemIds.includes(command.itemId)) return session;
      const ordered = [command.itemId, ...session.request.orderedItemIds.filter((id) => id !== command.itemId)];
      return mutateRequest(session, (request) => ({ ...request, orderedItemIds: ordered, startItemId: command.itemId }), false);
    }
    case "APPLY_DEPARTURE_RECOMMENDATION":
      if (command.sourceRevision !== session.request.revision || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d\+09:00$/.test(command.recommendedDepartureAt)) return session;
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, tripDate: command.recommendedDepartureAt.slice(0, 10), startTime: command.recommendedDepartureAt.slice(11, 16) } }), false);
    case "SET_END_POLICY":
      return mutateRequest(session, (request) => ({ ...request, endPolicy: command.policy }), false);
    case "SET_BUDGET":
      if (command.amountKrw !== null && (!Number.isInteger(command.amountKrw) || command.amountKrw < 0)) return session;
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, budgetKrw: command.amountKrw } }), false);
    case "SET_ITEM_COST":
      if (command.amountKrw !== null && (!Number.isInteger(command.amountKrw) || command.amountKrw < 0)) return session;
      return mutateRequest(session, (request) => ({ ...request, selectedItems: request.selectedItems.map((item) => item.id === command.itemId ? { ...item, userCostKrw: command.amountKrw } : item) }), false);
    case "SET_INCLUDE_TOLLS":
      return mutateRequest(session, (request) => ({ ...request, settings: { ...request.settings, includeTollsInBudget: command.included } }), false);
  }
}

export function applyPlanningEvent(session: PlanningSessionV1, event: PlanningSessionEvent): PlanningSessionV1 {
  switch (event.type) {
    case "COMPLETE_SELECTION":
      return session.request.includedItemIds.length === 0 ? session : { ...session, phase: allReviewsComplete(session) ? "course-config" : "supplemental-review" };
    case "SET_NEARBY_ANCHOR":
      return mutateRequest(session, (request) => ({ ...request, nearbyAnchorId: event.itemId }), true);
    case "COMPLETE_REGIONAL_REVIEW":
      if (event.region !== session.request.region) return session;
      return { ...session, regionalReview: { region: event.region, completed: true }, phase: phaseAfterSelection({ ...session, regionalReview: { region: event.region, completed: true } }) };
    case "INVALIDATE_REGIONAL_REVIEW":
      return { ...session, regionalReview: null, phase: "supplemental-review" };
    case "COMPLETE_NEARBY_REVIEW":
      if (event.anchorItemId !== session.request.nearbyAnchorId) return session;
      return { ...session, nearbyReview: { anchorItemId: event.anchorItemId, completed: true }, phase: phaseAfterSelection({ ...session, nearbyReview: { anchorItemId: event.anchorItemId, completed: true } }) };
    case "INVALIDATE_NEARBY_REVIEW":
      return { ...session, nearbyReview: null, phase: "supplemental-review" };
    case "CONFIRM_COURSE":
      if (!allReviewsComplete(session) || session.request.orderedItemIds.length < 2 || session.request.orderedItemIds.length > 12 || session.request.startItemId !== session.request.orderedItemIds[0]) return session;
      return { ...session, phase: "plan-setup", draft: null };
    case "GENERATION_STARTED":
      if (!["plan-setup", "ready", "partial", "blocked"].includes(session.phase)) return session;
      return { ...session, phase: "generating", generationIssues: [], activeGeneration: { generationId: event.generationId, inputRevision: event.inputRevision, inputFingerprint: event.inputFingerprint, previousPhase: session.phase === "generating" ? "plan-setup" : session.phase } };
    case "COMMIT_GENERATION": {
      const active = session.activeGeneration;
      const envelope = event.envelope;
      if (!active || active.generationId !== envelope.generationId || active.inputRevision !== envelope.inputRevision || active.inputFingerprint !== envelope.inputFingerprint) {
        return { ...session, notices: [...session.notices, createSessionNotice("STALE_GENERATION", { generationId: envelope.generationId })] };
      }
      if (envelope.outcome.kind === "rejected") return { ...session, phase: "blocked", generationIssues: envelope.outcome.issues, activeGeneration: null };
      const plan = envelope.outcome.plan;
      return { ...session, phase: plan.status, draft: plan, lastValidDraft: plan, generationIssues: plan.issues.filter((issue) => hasBlockingIssue([issue])), activeGeneration: null };
    }
    case "GENERATION_ABORTED":
      if (session.activeGeneration?.generationId !== event.generationId) return session;
      return { ...session, phase: session.lastValidDraft?.status ?? "plan-setup", activeGeneration: null, notices: [...session.notices, createSessionNotice("GENERATION_ABORTED", { generationId: event.generationId })] };
    case "RETRY_LEG":
      return { ...session, dirtyStages: ["build-route-legs", "build-final-schedule", "calculate-budget", "build-report", "validate-plan"], notices: [...session.notices, createSessionNotice("STALE_GENERATION", { legId: event.legId })] };
    case "RESET_PLANNING_SESSION":
      return createPlanningSession(session.request);
  }
}

export function toPersistedPlanningSession(session: PlanningSessionV1): PersistedPlanningSessionV1 {
  return { schemaVersion: 1, phase: session.phase === "generating" || session.phase === "ready" || session.phase === "partial" || session.phase === "blocked" ? "course-config" : session.phase, request: session.request, regionalReview: session.regionalReview, nearbyReview: session.nearbyReview };
}

export function restorePlanningSession(value: unknown): PlanningSessionV1 | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersistedPlanningSessionV1>;
  const parsed = planningRequestSchema.safeParse(candidate.request);
  if (!parsed.success || candidate.schemaVersion !== 1 || !candidate.phase) return null;
  const restored = createPlanningSession(parsed.data as PlanningRequestV1);
  const regionalReview = candidate.regionalReview && typeof candidate.regionalReview === "object" ? candidate.regionalReview : null;
  const nearbyReview = candidate.nearbyReview && typeof candidate.nearbyReview === "object" ? candidate.nearbyReview : null;
  const withReviews = { ...restored, regionalReview, nearbyReview };
  return { ...withReviews, phase: phaseAfterSelection(withReviews) };
}
