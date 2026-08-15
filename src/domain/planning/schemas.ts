import { z } from "zod";

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const kstDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clockSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const kstInstantSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\+09:00$/);

const qualificationProofSchema = z.object({
  conditionKey: z.string().min(1),
  sourceText: z.string(),
  sourceUrl: z.string().url().nullable(),
  observedAt: z.string().datetime({ offset: true }).nullable(),
  evidenceClass: z.enum(["policy-text", "provider-field", "user-confirmation"]),
});

const planningItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1).nullable(),
  category: z.string().min(1),
  role: z.enum(["core", "supplemental"]),
  kind: z.enum(["place", "festival", "trail", "nearby-catalog", "nearby-service"]),
  selectedAt: z.string().datetime({ offset: true }),
  source: z.object({
    provider: z.enum(["catalog", "tour-api", "trail-db", "auxiliary-db", "kakao-local"]),
    sourceId: z.string().min(1),
    observedAt: z.string().datetime({ offset: true }).nullable(),
    sourceUrl: z.string().url().nullable(),
  }),
  coordinates: coordinateSchema.nullable(),
  qualification: z.object({
    status: z.enum(["exact-match", "confirmed-non-match", "unverified", "not-evaluated", "not-applicable"]),
    queryFingerprint: z.string().min(1).nullable(),
    hardConstraintKeys: z.array(z.string()),
    proof: z.array(qualificationProofSchema),
  }),
  petAdmission: z.object({
    status: z.enum(["confirmed", "not-evaluated", "unverified", "not-applicable"]),
    evidenceText: z.string().nullable(),
    needsConfirmation: z.boolean(),
  }),
  activityWindow: z.object({
    startsOn: kstDateSchema.nullable(),
    endsOn: kstDateSchema.nullable(),
    opensAt: clockSchema.nullable(),
    closesAt: clockSchema.nullable(),
    officialDurationMinutes: z.number().int().min(0).max(24 * 60).nullable(),
  }).nullable(),
  userDwellMinutes: z.number().int().min(0).max(24 * 60).nullable(),
  userCostKrw: z.number().int().min(0).nullable(),
});

const qualificationContextSchema = z.object({
  queryFingerprint: z.string().min(1),
  dataSnapshotId: z.string().min(1),
  matchRuleVersion: z.string().min(1),
  petProfileRevision: z.number().int().nonnegative(),
  hardConstraintKeys: z.array(z.string()),
  preferenceKeys: z.array(z.string()),
  categoryKeys: z.array(z.string()),
  preparationFilterKeys: z.array(z.string()),
  petProfile: z.object({
    size: z.enum(["smallDog", "mediumDog", "largeDog"]).nullable(),
    weightKg: z.number().finite().positive().nullable(),
    dangerousDog: z.boolean(),
  }),
});

const settingsSchema = z.object({
  tripDate: kstDateSchema,
  startTime: clockSchema,
  dayEndTime: clockSchema.nullable(),
  transportMode: z.literal("car"),
  pace: z.enum(["relaxed", "balanced", "packed"]),
  orderMode: z.enum(["nearby", "saved", "manual"]),
  defaultDwellMinutes: z.number().int().min(15).max(480),
  defaultDwellSource: z.enum(["preset", "user"]),
  budgetKrw: z.number().int().min(0).nullable(),
  includeTollsInBudget: z.boolean(),
});

const unique = (values: string[]) => new Set(values).size === values.length;

export const planningRequestSchema = z.object({
  schemaVersion: z.literal(1),
  planId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  locale: z.enum(["ko", "en", "zh"]),
  timeZone: z.literal("Asia/Seoul"),
  region: z.string(),
  qualificationContext: qualificationContextSchema,
  selectedItems: z.array(planningItemSchema),
  includedItemIds: z.array(z.string()),
  orderedItemIds: z.array(z.string()),
  nearbyAnchorId: z.string().nullable(),
  startItemId: z.string().nullable(),
  endPolicy: z.enum(["last-item", "return-to-start"]),
  settings: settingsSchema,
}).superRefine((request, context) => {
  const selectedIds = request.selectedItems.map((item) => item.id);
  const selectedSet = new Set(selectedIds);
  const includedSet = new Set(request.includedItemIds);
  const orderedSet = new Set(request.orderedItemIds);

  if (!unique(selectedIds)) context.addIssue({ code: "custom", path: ["selectedItems"], message: "DUPLICATE_ITEM_ID" });
  if (!unique(request.includedItemIds)) context.addIssue({ code: "custom", path: ["includedItemIds"], message: "DUPLICATE_INCLUDED_ITEM_ID" });
  if (!unique(request.orderedItemIds)) context.addIssue({ code: "custom", path: ["orderedItemIds"], message: "DUPLICATE_ORDERED_ITEM_ID" });

  for (const id of request.includedItemIds) {
    if (!selectedSet.has(id)) context.addIssue({ code: "custom", path: ["includedItemIds"], message: `UNKNOWN_ITEM_ID:${id}` });
  }
  for (const id of request.orderedItemIds) {
    if (!includedSet.has(id)) context.addIssue({ code: "custom", path: ["orderedItemIds"], message: `ORDER_NOT_INCLUDED:${id}` });
    const item = request.selectedItems.find((candidate) => candidate.id === id);
    if (item && !item.coordinates) context.addIssue({ code: "custom", path: ["orderedItemIds"], message: `ORDER_ITEM_WITHOUT_COORDINATES:${id}` });
  }
  if (request.startItemId !== null && !orderedSet.has(request.startItemId)) {
    context.addIssue({ code: "custom", path: ["startItemId"], message: "START_NOT_ORDERED" });
  }
  if (request.nearbyAnchorId !== null && !selectedSet.has(request.nearbyAnchorId)) {
    context.addIssue({ code: "custom", path: ["nearbyAnchorId"], message: "ANCHOR_NOT_SELECTED" });
  }
});

export const generationRequestSchema = planningRequestSchema.superRefine((request, context) => {
  if (request.includedItemIds.length === 0) context.addIssue({ code: "custom", path: ["includedItemIds"], message: "NO_SELECTED_ITEMS" });
  if (request.orderedItemIds.length < 2) context.addIssue({ code: "custom", path: ["orderedItemIds"], message: "NOT_ENOUGH_ROUTE_NODES" });
  if (request.orderedItemIds.length > 12) context.addIssue({ code: "custom", path: ["orderedItemIds"], message: "TOO_MANY_ROUTE_NODES" });
  if (request.startItemId === null || request.startItemId !== request.orderedItemIds[0]) {
    context.addIssue({ code: "custom", path: ["startItemId"], message: "START_MUST_BE_FIRST_ORDERED_ITEM" });
  }
});

export const routeLegSchema = z.object({
  id: z.string().min(1),
  fromItemId: z.string().min(1),
  toItemId: z.string().min(1),
  basis: z.enum(["provider-road", "coordinate-only"]),
  provider: z.enum(["kakao", "haversine"]),
  distanceKm: z.number().finite().nonnegative(),
  durationMinutes: z.number().int().nonnegative().nullable(),
  durationBasis: z.enum(["live", "forecast", "unknown"]),
  trafficDetailsBasis: z.enum(["live", "unavailable"]),
  forecastDepartureAt: kstInstantSchema.nullable(),
  fetchedAt: z.string().datetime({ offset: true }).nullable(),
  congestedRoads: z.array(z.object({
    name: z.string(),
    distanceMeters: z.number().finite().nonnegative(),
    speedKph: z.number().finite().nonnegative(),
    state: z.enum(["slow", "congested", "jammed"]),
  })),
  cost: z.object({
    taxiFareKrw: z.number().int().nonnegative().nullable(),
    tollFeeKrw: z.number().int().nonnegative().nullable(),
  }),
  mapLink: z.string().url(),
  naviLink: z.string().url(),
  issueCode: z.enum(["ROUTE_PROVIDER_UNAVAILABLE", "ROUTE_TIMEOUT", "NO_ROUTE"]).nullable(),
});

export const planIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["info", "warning", "blocking"]),
  stage: z.string().min(1),
  itemId: z.string().nullable(),
  legId: z.string().nullable(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const budgetSummarySchema = z.object({
  knownTotalKrw: z.number().int().nonnegative(),
  unknownItemCount: z.number().int().nonnegative(),
  remainingKrw: z.number().int().nullable(),
  overBudget: z.enum(["yes", "no", "unknown"]),
  lines: z.array(z.object({
    id: z.string().min(1),
    itemId: z.string().nullable(),
    labelCode: z.enum(["ITEM_COST", "TOLL_FEE", "TAXI_FARE_REFERENCE"]),
    labelParams: z.record(z.string(), z.union([z.string(), z.number()])),
    amountKrw: z.number().int().nonnegative().nullable(),
    source: z.enum(["user", "routing-provider"]),
    includedInTotal: z.boolean(),
  })),
});

export const kstInstantPattern = kstInstantSchema;
