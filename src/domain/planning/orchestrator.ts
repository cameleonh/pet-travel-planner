import type {
  GenerationEnvelope,
  PlanIssue,
  PlanningRequestV1,
  TravelPlanV2,
} from "@/domain/planning/contracts";
import { createInputFingerprint } from "@/domain/planning/fingerprint";
import { hasBlockingIssue } from "@/domain/planning/issues";
import { formatKstInstant } from "@/domain/planning/kst-time";
import { coordinateOnlyRoutingProvider } from "@/domain/planning/providers/coordinate-only";
import type { RoutingProvider } from "@/domain/planning/providers/routing-provider";
import { buildReportModel } from "@/domain/planning/stages/build-report";
import { buildRouteLegs } from "@/domain/planning/stages/build-route-legs";
import { buildSchedule } from "@/domain/planning/stages/build-schedule";
import { calculateBudget } from "@/domain/planning/stages/calculate-budget";
import { normalizeSelection } from "@/domain/planning/stages/normalize-selection";
import { generationRequestSchema } from "@/domain/planning/schemas";
import { createPlanIssue } from "@/domain/planning/issues";

export type PlanningDependencies = {
  routingProvider?: RoutingProvider;
  plannerVersion?: string;
  now?: () => number;
};

export type GenerateOptions = {
  signal?: AbortSignal;
  generationId?: string;
};

function id(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}:${uuid}` : `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function nowInstant(now: () => number): string {
  return formatKstInstant(now()) ?? "1970-01-01T00:00+09:00";
}

function stageIssue(code: PlanIssue["code"], details: string): PlanIssue {
  return createPlanIssue(code, "blocking", "validate-input", { params: { details } });
}

function generatedStatus(issues: PlanIssue[]): TravelPlanV2["status"] {
  return issues.some((issue) => issue.severity === "warning") ? "partial" : "ready";
}

export async function generateTravelPlan(
  request: PlanningRequestV1,
  dependencies: PlanningDependencies = {},
  options: GenerateOptions = {},
): Promise<GenerationEnvelope> {
  const generationId = options.generationId ?? id("generation");
  const inputFingerprint = await createInputFingerprint(request);
  const invalid = generationRequestSchema.safeParse(request);
  if (!invalid.success) {
    return {
      generationId,
      inputRevision: request.revision,
      inputFingerprint,
      outcome: { kind: "rejected", issues: [stageIssue("INVALID_INPUT", invalid.error.issues.map((issue) => issue.message).join(", "))] },
    };
  }

  const normalized = normalizeSelection(request);
  if (hasBlockingIssue(normalized.issues)) {
    return {
      generationId,
      inputRevision: request.revision,
      inputFingerprint,
      outcome: { kind: "rejected", issues: normalized.issues },
    };
  }

  const routingProvider = dependencies.routingProvider ?? coordinateOnlyRoutingProvider;
  const routeResult = await buildRouteLegs({
    request: normalized.request,
    orderedItems: normalized.orderedItems,
    provider: routingProvider,
    signal: options.signal,
  });
  const scheduleResult = buildSchedule({
    request: normalized.request,
    orderedItems: normalized.orderedItems,
    legs: routeResult.legs,
  });
  const budget = calculateBudget({
    request: normalized.request,
    includedItems: normalized.includedItems,
    legs: routeResult.legs,
  });
  const issues = [...normalized.issues, ...routeResult.issues, ...scheduleResult.issues];
  const report = buildReportModel({
    request: normalized.request,
    includedItems: normalized.includedItems,
    scheduledItems: scheduleResult.scheduledItems,
    unscheduledItemIds: normalized.unscheduledItems.map((item) => item.id),
    legs: routeResult.legs,
    scheduleSummary: {
      startsAt: scheduleResult.startsAt,
      endsAt: scheduleResult.endsAt,
      returnArrivalAt: scheduleResult.returnArrivalAt,
    },
    issues,
    budget,
    departureRecommendation: null,
  });
  const now = dependencies.now ?? Date.now;
  const plan: TravelPlanV2 = {
    schemaVersion: 2,
    id: normalized.request.planId,
    revision: normalized.request.revision,
    inputFingerprint,
    status: generatedStatus(issues),
    request: normalized.request,
    scheduledItems: scheduleResult.scheduledItems,
    unscheduledItemIds: normalized.unscheduledItems.map((item) => item.id),
    legs: routeResult.legs,
    departureRecommendation: null,
    scheduleSummary: {
      startsAt: scheduleResult.startsAt,
      endsAt: scheduleResult.endsAt,
      returnArrivalAt: scheduleResult.returnArrivalAt,
    },
    budget,
    issues,
    report,
    provenance: {
      plannerVersion: dependencies.plannerVersion ?? "planning-v2-local-0.1.0",
      routingCapabilities: [routingProvider.capability],
      generatedAt: nowInstant(now),
    },
  };
  return { generationId, inputRevision: request.revision, inputFingerprint, outcome: { kind: "generated", plan } };
}
