import type { Coordinates } from "@/domain/geo";

export type PlanningItemRole = "core" | "supplemental";

export type PlanningItemKind =
  | "place"
  | "festival"
  | "trail"
  | "nearby-catalog"
  | "nearby-service";

export type PetAdmissionStatus =
  | "confirmed"
  | "not-evaluated"
  | "unverified"
  | "not-applicable";

export type QualificationStatus =
  | "exact-match"
  | "confirmed-non-match"
  | "unverified"
  | "not-evaluated"
  | "not-applicable";

export type QualificationProof = {
  conditionKey: string;
  sourceText: string;
  sourceUrl: string | null;
  observedAt: string | null;
  evidenceClass: "policy-text" | "provider-field" | "user-confirmation";
};

export type PlanningItemSnapshot = {
  id: string;
  name: string;
  address: string | null;
  category: string;
  role: PlanningItemRole;
  kind: PlanningItemKind;
  selectedAt: string;
  source: {
    provider: "catalog" | "tour-api" | "trail-db" | "auxiliary-db" | "kakao-local";
    sourceId: string;
    observedAt: string | null;
    sourceUrl: string | null;
  };
  coordinates: Coordinates | null;
  qualification: {
    status: QualificationStatus;
    queryFingerprint: string | null;
    hardConstraintKeys: string[];
    proof: QualificationProof[];
  };
  petAdmission: {
    status: PetAdmissionStatus;
    evidenceText: string | null;
    needsConfirmation: boolean;
  };
  activityWindow: {
    startsOn: string | null;
    endsOn: string | null;
    opensAt: string | null;
    closesAt: string | null;
    officialDurationMinutes: number | null;
  } | null;
  userDwellMinutes: number | null;
  userCostKrw: number | null;
};

export type QualificationContext = {
  queryFingerprint: string;
  dataSnapshotId: string;
  matchRuleVersion: string;
  petProfileRevision: number;
  hardConstraintKeys: string[];
  preferenceKeys: string[];
  categoryKeys: string[];
  preparationFilterKeys: string[];
  petProfile: {
    size: "smallDog" | "mediumDog" | "largeDog" | null;
    weightKg: number | null;
    dangerousDog: boolean;
  };
};

export type PlannerPace = "relaxed" | "balanced" | "packed";
export type PlannerOrderMode = "nearby" | "saved" | "manual";

export type PlanningSettings = {
  tripDate: string;
  startTime: string;
  dayEndTime: string | null;
  transportMode: "car";
  pace: PlannerPace;
  orderMode: PlannerOrderMode;
  defaultDwellMinutes: number;
  defaultDwellSource: "preset" | "user";
  budgetKrw: number | null;
  includeTollsInBudget: boolean;
};

export type PlanningRequestV1 = {
  schemaVersion: 1;
  planId: string;
  revision: number;
  locale: "ko" | "en" | "zh";
  timeZone: "Asia/Seoul";
  region: string;
  qualificationContext: QualificationContext;
  selectedItems: PlanningItemSnapshot[];
  includedItemIds: string[];
  orderedItemIds: string[];
  nearbyAnchorId: string | null;
  startItemId: string | null;
  endPolicy: "last-item" | "return-to-start";
  settings: PlanningSettings;
};

export type RouteIssueCode = "ROUTE_PROVIDER_UNAVAILABLE" | "ROUTE_TIMEOUT" | "NO_ROUTE";

export type RouteLeg = {
  id: string;
  fromItemId: string;
  toItemId: string;
  basis: "provider-road" | "coordinate-only";
  provider: "kakao" | "haversine";
  distanceKm: number;
  durationMinutes: number | null;
  durationBasis: "live" | "forecast" | "unknown";
  trafficDetailsBasis: "live" | "unavailable";
  forecastDepartureAt: string | null;
  fetchedAt: string | null;
  congestedRoads: Array<{
    name: string;
    distanceMeters: number;
    speedKph: number;
    state: "slow" | "congested" | "jammed";
  }>;
  cost: {
    taxiFareKrw: number | null;
    tollFeeKrw: number | null;
  };
  mapLink: string;
  naviLink: string;
  issueCode: RouteIssueCode | null;
};

export type DwellSource = "official" | "user" | "default";

export type ScheduleEntry = {
  itemId: string;
  sequence: number;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
  dwellMinutes: number;
  dwellSource: DwellSource;
  incomingLegId: string | null;
  outgoingLegId: string | null;
};

export type PlanningStageName =
  | "validate-input"
  | "normalize-selection"
  | "build-route-legs"
  | "build-provisional-schedule"
  | "forecast-route-legs"
  | "build-final-schedule"
  | "calculate-budget"
  | "build-report"
  | "validate-plan";

export type PlanIssueCode =
  | "INVALID_INPUT"
  | "UNKNOWN_ITEM_ID"
  | "NO_SELECTED_ITEMS"
  | "NOT_ENOUGH_ROUTE_NODES"
  | "TOO_MANY_ROUTE_NODES"
  | "HARD_CONSTRAINT_MISMATCH"
  | "QUALIFICATION_CONTEXT_MISMATCH"
  | "ITEM_WITHOUT_COORDINATES"
  | "PET_POLICY_UNVERIFIED"
  | "ACTIVITY_OUTSIDE_DATE"
  | "OUTSIDE_OPENING_WINDOW"
  | "ROUTE_PROVIDER_UNAVAILABLE"
  | "ROUTE_TIMEOUT"
  | "NO_ROUTE"
  | "ROUTE_DATA_STALE"
  | "SCHEDULE_UNKNOWN_AFTER_LEG"
  | "DAY_OVERFLOW"
  | "INTERNAL_PLAN_INVARIANT";

export type PlanIssueSeverity = "info" | "warning" | "blocking";

export type PlanIssue = {
  code: PlanIssueCode;
  severity: PlanIssueSeverity;
  stage: PlanningStageName;
  itemId: string | null;
  legId: string | null;
  params: Record<string, string | number | boolean | null>;
};

export type BudgetSummary = {
  knownTotalKrw: number;
  unknownItemCount: number;
  remainingKrw: number | null;
  overBudget: "yes" | "no" | "unknown";
  lines: Array<{
    id: string;
    itemId: string | null;
    labelCode: "ITEM_COST" | "TOLL_FEE" | "TAXI_FARE_REFERENCE";
    labelParams: Record<string, string | number>;
    amountKrw: number | null;
    source: "user" | "routing-provider";
    includedInTotal: boolean;
  }>;
};

export type PlanReportModel = {
  overview: {
    tripDate: string;
    region: string;
    startsAt: string;
    endsAt: string | null;
    recommendedFirstMoveAt: string | null;
    scheduledCount: number;
    unscheduledCount: number;
    totalDistanceKm: number;
    distanceBasis: "road" | "mixed" | "coordinate-only";
    totalKnownTravelMinutes: number;
    unknownLegCount: number;
  };
  visits: Array<{
    sequence: number;
    itemId: string;
    startsAt: string | null;
    endsAt: string | null;
    dwellMinutes: number;
    issueCodes: PlanIssueCode[];
  }>;
  movements: Array<{
    sequence: number;
    legId: string;
    fromItemId: string;
    toItemId: string;
    departureAt: string | null;
    arrivalAt: string | null;
    distanceKm: number;
    durationMinutes: number | null;
    durationBasis: RouteLeg["durationBasis"];
    trafficDetailsBasis: RouteLeg["trafficDetailsBasis"];
    fetchedAt: string | null;
    forecastDepartureAt: string | null;
    congestedRoads: RouteLeg["congestedRoads"];
    mapLink: string;
    naviLink: string;
    issueCodes: PlanIssueCode[];
    isReturnLeg: boolean;
  }>;
  unscheduled: Array<{ itemId: string; reasonCode: PlanIssueCode }>;
  confirmationItemIds: string[];
  budget: BudgetSummary;
};

export type TravelPlanV2 = {
  schemaVersion: 2;
  id: string;
  revision: number;
  inputFingerprint: string;
  status: "ready" | "partial";
  request: PlanningRequestV1;
  scheduledItems: ScheduleEntry[];
  unscheduledItemIds: string[];
  legs: RouteLeg[];
  departureRecommendation: {
    legId: string;
    currentDepartureAt: string;
    currentDurationMinutes: number | null;
    recommendedDepartureAt: string;
    recommendedDurationMinutes: number;
    comparisonCount: number;
    isAlreadyApplied: boolean;
  } | null;
  scheduleSummary: {
    startsAt: string;
    endsAt: string | null;
    returnArrivalAt: string | null;
  };
  budget: BudgetSummary;
  issues: PlanIssue[];
  report: PlanReportModel;
  provenance: {
    plannerVersion: string;
    routingCapabilities: Array<"provider-road" | "coordinate-only">;
    generatedAt: string;
  };
};

export type StageTrace = {
  stage: PlanningStageName;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  source: "local-rule" | "local-cache" | "provider";
  cacheHit: boolean;
  inputRevision: number;
};

export type StageResult<T> =
  | { ok: true; data: T; issues: PlanIssue[]; trace: StageTrace }
  | { ok: false; data: null; issues: PlanIssue[]; trace: StageTrace };

export type GenerationOutcome =
  | { kind: "generated"; plan: TravelPlanV2 }
  | { kind: "rejected"; issues: PlanIssue[] };

export type GenerationEnvelope = {
  generationId: string;
  inputRevision: number;
  inputFingerprint: string;
  outcome: GenerationOutcome;
};

export type SessionNoticeCode = "STORAGE_UNAVAILABLE" | "STALE_GENERATION" | "GENERATION_ABORTED";

export type SessionNotice = {
  code: SessionNoticeCode;
  params: Record<string, string | number | boolean | null>;
};

export type PlanningPhase =
  | "selecting"
  | "supplemental-review"
  | "course-config"
  | "plan-setup"
  | "generating"
  | "ready"
  | "partial"
  | "blocked";

export type PlanningSessionV1 = {
  schemaVersion: 1;
  phase: PlanningPhase;
  request: PlanningRequestV1;
  draft: TravelPlanV2 | null;
  lastValidDraft: TravelPlanV2 | null;
  generationIssues: PlanIssue[];
  notices: SessionNotice[];
  activeGeneration: {
    generationId: string;
    inputRevision: number;
    inputFingerprint: string;
    previousPhase: Exclude<PlanningPhase, "generating">;
  } | null;
  dirtyStages: PlanningStageName[];
  regionalReview: { region: string; completed: boolean } | null;
  nearbyReview: { anchorItemId: string; completed: boolean } | null;
};

export type PersistedPlanningSessionV1 = Pick<
  PlanningSessionV1,
  "schemaVersion" | "request" | "regionalReview" | "nearbyReview"
> & {
  phase: Exclude<PlanningPhase, "generating" | "ready" | "partial" | "blocked">;
};
