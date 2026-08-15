import type { AuxiliaryPlace } from "@/data/contracts";
import type { PlanActivity, PlanPlace } from "@/domain/plan";
import type { MatchEvaluation } from "@/domain/types";
import type { FestivalData } from "@/features/results/FestivalSection";
import type { TrailData } from "@/features/results/TrailSection";
import type { PlanningItemSnapshot, QualificationContext } from "@/domain/planning/contracts";

type AdapterOptions = { selectedAt?: string };

function selectedAt(options?: AdapterOptions) {
  return options?.selectedAt ?? new Date().toISOString();
}

function sourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { return new URL(value).toString(); } catch { return null; }
}

function evidenceClass(value: MatchEvaluation["proof"][number]["evidence"]["evidenceClass"]): "policy-text" | "provider-field" | "user-confirmation" {
  if (value === "source-explicit") return "policy-text";
  if (value === "source-derived") return "provider-field";
  return "user-confirmation";
}

export function planningItemFromMatch(
  result: MatchEvaluation,
  context: QualificationContext,
  options?: AdapterOptions,
): PlanningItemSnapshot {
  const proof = result.proof.map((entry) => ({
    conditionKey: entry.constraint.key,
    sourceText: entry.evidence.sourceText,
    sourceUrl: sourceUrl(entry.evidence.sourceUrl),
    observedAt: entry.evidence.observedAt,
    evidenceClass: evidenceClass(entry.evidence.evidenceClass),
  }));
  const exact = result.status === "confirmed-match" && result.exact;
  return {
    id: result.place.id,
    name: result.place.name,
    address: result.place.address,
    category: result.place.category,
    role: "core",
    kind: "place",
    selectedAt: selectedAt(options),
    source: {
      provider: "catalog",
      sourceId: result.place.id,
      observedAt: result.place.policySource.observedAt,
      sourceUrl: sourceUrl(result.place.policySource.sourceUrl),
    },
    coordinates: result.place.coordinates,
    qualification: {
      status: exact ? "exact-match" : result.status === "confirmed-match" ? "unverified" : result.status,
      queryFingerprint: context.queryFingerprint,
      hardConstraintKeys: context.hardConstraintKeys,
      proof,
    },
    petAdmission: {
      status: result.place.policySource.sourceText ? "confirmed" : "not-evaluated",
      evidenceText: result.place.policySource.sourceText || null,
      needsConfirmation: !result.place.policySource.sourceText,
    },
    activityWindow: null,
    userDwellMinutes: null,
    userCostKrw: null,
  };
}

function parseCoordinate(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(value: string | null): string | null {
  return value && /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : null;
}

export function planningItemFromFestival(festival: FestivalData, options?: AdapterOptions): PlanningItemSnapshot {
  const longitude = parseCoordinate(festival.mapx);
  const latitude = parseCoordinate(festival.mapy);
  const coordinates = latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
  return {
    id: `festival:${festival.contentId}`,
    name: festival.title,
    address: festival.address,
    category: "festival",
    role: "supplemental",
    kind: "festival",
    selectedAt: selectedAt(options),
    source: { provider: "tour-api", sourceId: festival.contentId, observedAt: null, sourceUrl: `https://korean.visitkorea.or.kr/detail/festival/festivalDetail.do?cotId=${festival.contentId}` },
    coordinates,
    qualification: { status: "not-applicable", queryFingerprint: null, hardConstraintKeys: [], proof: [] },
    petAdmission: { status: "unverified", evidenceText: null, needsConfirmation: true },
    activityWindow: { startsOn: dateOrNull(festival.startDate), endsOn: dateOrNull(festival.endDate), opensAt: null, closesAt: null, officialDurationMinutes: null },
    userDwellMinutes: null,
    userCostKrw: null,
  };
}

export function planningItemFromTrail(trail: TrailData, options?: AdapterOptions): PlanningItemSnapshot {
  const officialDurationMinutes = trail.crs_totl_rqrm_hour !== null && Number.isFinite(trail.crs_totl_rqrm_hour) ? Math.max(0, Math.round(trail.crs_totl_rqrm_hour)) : null;
  return {
    id: `trail:${trail.crs_idx}`,
    name: trail.crs_kor_nm,
    address: trail.sigun,
    category: "trail",
    role: "supplemental",
    kind: "trail",
    selectedAt: selectedAt(options),
    source: { provider: "trail-db", sourceId: trail.crs_idx, observedAt: null, sourceUrl: sourceUrl(trail.gpxpath) },
    coordinates: null,
    qualification: { status: "not-applicable", queryFingerprint: null, hardConstraintKeys: [], proof: [] },
    petAdmission: { status: "unverified", evidenceText: null, needsConfirmation: true },
    activityWindow: { startsOn: null, endsOn: null, opensAt: null, closesAt: null, officialDurationMinutes },
    userDwellMinutes: null,
    userCostKrw: null,
  };
}

export function planningItemFromAuxiliary(place: AuxiliaryPlace, options?: AdapterOptions): PlanningItemSnapshot {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    category: place.category,
    role: "supplemental",
    kind: "nearby-catalog",
    selectedAt: selectedAt(options),
    source: { provider: "auxiliary-db", sourceId: place.id, observedAt: place.evidence.observedAt, sourceUrl: sourceUrl(place.evidence.sourceUrl) },
    coordinates: place.coordinates,
    qualification: { status: "not-applicable", queryFingerprint: null, hardConstraintKeys: [], proof: [] },
    petAdmission: { status: place.petStatus === "confirmed" ? "confirmed" : "unverified", evidenceText: place.evidence.sourceText, needsConfirmation: place.petStatus !== "confirmed" },
    activityWindow: null,
    userDwellMinutes: null,
    userCostKrw: null,
  };
}

export function planningItemFromPlanPlace(place: PlanPlace, context: QualificationContext, options?: AdapterOptions): PlanningItemSnapshot {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    category: place.category,
    role: "core",
    kind: "place",
    selectedAt: selectedAt(options),
    source: { provider: "catalog", sourceId: place.id, observedAt: null, sourceUrl: null },
    coordinates: place.coordinates,
    qualification: {
      status: place.exact ? "exact-match" : "unverified",
      queryFingerprint: context.queryFingerprint,
      hardConstraintKeys: place.exact ? context.hardConstraintKeys : [],
      proof: place.policySourceText ? [{ conditionKey: "admission", sourceText: place.policySourceText, sourceUrl: null, observedAt: null, evidenceClass: "policy-text" }] : [],
    },
    petAdmission: { status: place.policySourceText ? "confirmed" : "not-evaluated", evidenceText: place.policySourceText || null, needsConfirmation: !place.policySourceText },
    activityWindow: null,
    userDwellMinutes: null,
    userCostKrw: null,
  };
}

export function planningItemFromPlanActivity(activity: PlanActivity, options?: AdapterOptions): PlanningItemSnapshot {
  return {
    id: activity.id,
    name: activity.title,
    address: activity.address ?? null,
    category: activity.type,
    role: "supplemental",
    kind: activity.type,
    selectedAt: selectedAt(options),
    source: { provider: activity.type === "festival" ? "tour-api" : "trail-db", sourceId: activity.id, observedAt: null, sourceUrl: sourceUrl(activity.url) },
    coordinates: activity.coordinates ?? null,
    qualification: { status: "not-applicable", queryFingerprint: null, hardConstraintKeys: [], proof: [] },
    petAdmission: { status: "unverified", evidenceText: null, needsConfirmation: true },
    activityWindow: null,
    userDwellMinutes: null,
    userCostKrw: null,
  };
}
