import type { RawPlace } from "@/data/contracts";
import {
  conditionKeys,
  type ConditionEvidence,
  type ConditionFact,
  type ConditionKey,
  type NormalizedPlace,
  type PreparationKey,
  type PreparationRequirement,
  type PreparationScope,
  type TriState,
} from "@/domain/types";

type Rule = { key: ConditionKey; value: Exclude<TriState, "unknown">; patterns: RegExp[] };

const rules: Rule[] = [
  { key: "indoor", value: "false", patterns: [/실내.{0,12}(출입|입장).{0,6}(제한|불가)/] },
  { key: "largeDog", value: "false", patterns: [/대형견.{0,8}(불가|제한)/] },
  { key: "outdoor", value: "true", patterns: [/(야외|테라스).{0,16}(동반|이용).{0,8}(가능|허용)/, /동반 가능.{0,12}(야외|테라스)/] },
  { key: "indoor", value: "true", patterns: [/실내.{0,16}(동반|이용).{0,8}(가능|허용)/, /이동가방.{0,16}실내.{0,12}(동반|이용)?.{0,8}(가능|허용)/] },
  { key: "leash", value: "true", patterns: [/(목줄|리드줄).{0,12}(착용|사용|필수)/] },
  { key: "carrier", value: "true", patterns: [/(이동가방|이동장|캐리어|케이지).{0,12}(사용|착용|필수|가능)/] },
  { key: "smallDog", value: "true", patterns: [/소형견.{0,12}(가능|허용)/, /(전\s*견종|모든\s*크기.{0,8}반려견).{0,12}(동반|출입)\s*(가능|허용)/] },
  { key: "mediumDog", value: "true", patterns: [/중형견.{0,12}(가능|허용)/, /(전\s*견종|모든\s*크기.{0,8}반려견).{0,12}(동반|출입)\s*(가능|허용)/] },
  { key: "largeDog", value: "true", patterns: [/대형견.{0,12}(가능|허용)/, /(전\s*견종|모든\s*크기.{0,8}반려견).{0,12}(동반|출입)\s*(가능|허용)/] }
];

function evidenceFor(place: RawPlace, excerpt: string, evidenceClass: ConditionEvidence["evidenceClass"]): ConditionEvidence {
  return { sourceText: place.petPolicy.sourceText, sourceUrl: place.petPolicy.sourceUrl, observedAt: place.petPolicy.observedAt, excerpt, evidenceClass };
}

function fact(
  key: ConditionKey,
  value: TriState,
  evidence: ConditionEvidence | null,
  requirements: PreparationKey[] = [],
): ConditionFact {
  return { key, value, evidence, requirements };
}

const dogSizeKeys = new Set<ConditionKey>(["smallDog", "mediumDog", "largeDog"]);
const allBreedsPattern = /(전\s*견종|모든\s*크기.{0,8}반려견).{0,12}(동반|출입)\s*(가능|허용)/;
const sizeQualifierPattern = /(?:\d+(?:\.\d+)?\s*(?:kg|㎏|킬로그램)|\d+\s*(?:개월|살|세))/i;
const ageQualifierPattern = /\d+\s*(?:개월|살|세)/;

const preparationRules: {
  key: PreparationKey;
  label: string;
  pattern: RegExp;
  scope: (claim: string) => PreparationScope;
}[] = [
  { key: "leash", label: "목줄 또는 리드줄", pattern: /(목줄|리드줄|개목줄).{0,16}(착용|사용|필수|구비)/, scope: () => "all" },
  { key: "carrier", label: "이동가방 또는 이동장", pattern: /(이동가방|이동장|캐리어|케이지|켄넬).{0,16}(사용|착용|필수|탑승)/, scope: (claim) => claim.includes("실내") ? "indoor" : "all" },
  { key: "muzzle", label: "입마개", pattern: /입마개.{0,12}(착용|사용|필수)/, scope: (claim) => claim.includes("맹견") ? "dangerous-dog" : "all" },
  { key: "wasteBag", label: "배변봉투", pattern: /(배변봉투|비닐봉지).{0,16}(지참|구비|필수|처리)/, scope: () => "all" },
  { key: "stroller", label: "반려동물 유모차", pattern: /유모차.{0,12}(탑승|사용|필수)/, scope: () => "all" },
  { key: "mannerBelt", label: "매너벨트", pattern: /매너벨트.{0,12}(착용|사용|필수)/, scope: () => "all" },
];

function containingClaim(text: string, matchIndex: number): string {
  const before = text.slice(0, matchIndex);
  const startBoundary = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf(";"));
  const remainder = text.slice(matchIndex);
  const boundaryOffsets = [remainder.indexOf("."), remainder.indexOf("!"), remainder.indexOf("?"), remainder.indexOf(";")].filter((index) => index >= 0);
  const end = boundaryOffsets.length > 0 ? matchIndex + Math.min(...boundaryOffsets) : text.length;
  return text.slice(startBoundary + 1, end);
}

function extractPreparations(place: RawPlace, text: string): PreparationRequirement[] {
  const requirements = new Map<string, PreparationRequirement>();
  for (const rule of preparationRules) {
    for (const match of text.matchAll(new RegExp(rule.pattern.source, `${rule.pattern.flags}g`))) {
      const claim = containingClaim(text, match.index ?? 0).trim();
      const scope = rule.scope(claim);
      const id = `${rule.key}:${scope}`;
      if (requirements.has(id)) continue;
      requirements.set(id, {
        key: rule.key,
        label: rule.label,
        scope,
        evidence: evidenceFor(place, claim || match[0], "source-derived"),
      });
    }
  }
  return [...requirements.values()];
}

function applyWeightAllowance(place: RawPlace, text: string, facts: Record<ConditionKey, ConditionFact>): void {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|㎏|킬로그램)\s*(미만|이하).{0,32}(입장|출입|동반).{0,10}(가능|허용)/i);
  if (!match || ageQualifierPattern.test(containingClaim(text, match.index ?? 0))) return;
  const limit = Number(match[1]);
  if (!Number.isFinite(limit)) return;
  const qualifier = match[2];
  const evidence = evidenceFor(place, match[0], "source-derived");
  if (limit >= 10) facts.smallDog = fact("smallDog", "true", evidence);
  if ((qualifier === "미만" && limit <= 10) || (qualifier === "이하" && limit < 10)) {
    facts.mediumDog = fact("mediumDog", "false", evidence);
  }
  if ((qualifier === "미만" && limit <= 25) || (qualifier === "이하" && limit < 25)) {
    facts.largeDog = fact("largeDog", "false", evidence);
  }
  if ((qualifier === "미만" && limit > 25) || (qualifier === "이하" && limit >= 25)) {
    facts.mediumDog = fact("mediumDog", "true", evidence);
  }
}

const generalAdmissionPattern = /동반\s*가능/;
const explicitSizeFalsePattern = /(?:소형견|중형견|대형견).{0,8}(불가|제한|금지)/;
const weightOrAgeLimitPattern = /(?:\d+(?:\.\d+)?\s*(?:kg|㎏|킬로그램))|(?:\d+\s*(?:개월|살|세))/i;

function applyGeneralAdmissionFallback(place: RawPlace, text: string, facts: Record<ConditionKey, ConditionFact>): void {
  if (!generalAdmissionPattern.test(text)) return;
  if (explicitSizeFalsePattern.test(text)) return;
  if (weightOrAgeLimitPattern.test(text)) return;
  for (const key of dogSizeKeys) {
    if (facts[key].value === "unknown") {
      facts[key] = fact(
        key,
        "true",
        evidenceFor(place, "반려동물 동반 가능 명시 (전 견종 제한 없음)", "inferred-from-general-admission"),
      );
    }
  }
}

export function normalizePlace(place: RawPlace): NormalizedPlace {
  const facts = Object.fromEntries(conditionKeys.map((key) => [key, fact(key, "unknown", null)])) as Record<ConditionKey, ConditionFact>;
  const text = place.petPolicy.sourceText.replace(/\r?\n+/g, ". ").replace(/[\t ]+/g, " ").trim();
  const requiredPreparations = extractPreparations(place, text);

  for (const rule of rules) {
    const match = rule.patterns.map((pattern) => text.match(pattern)).find(Boolean);
    if (!match) continue;
    const qualifiedSizeClaim = rule.value === "true"
      && dogSizeKeys.has(rule.key)
      && !allBreedsPattern.test(match[0])
      && sizeQualifierPattern.test(containingClaim(text, match.index ?? 0));
    if (qualifiedSizeClaim) continue;
    const current = facts[rule.key];
    if (current.value !== "unknown" && current.value !== rule.value) {
      facts[rule.key] = fact(rule.key, "unknown", null);
      continue;
    }
    const requirements = rule.key === "indoor"
      && /(이동가방|이동장|캐리어|케이지|켄넬)/.test(containingClaim(text, match.index ?? 0))
      ? ["carrier" as const]
      : [];
    facts[rule.key] = fact(rule.key, rule.value, evidenceFor(place, match[0], "source-derived"), requirements);
  }

  applyWeightAllowance(place, text, facts);

  // Fallback: if no specific size rule matched but the source explicitly states
  // general pet admission (e.g., "동반 가능", "출입 가능"), promote unknown dog-size
  // facts to true. Explicit false values (e.g., "대형견 불가") are preserved.
  applyGeneralAdmissionFallback(place, text, facts);

  if (place.amenities.includes("outdoor") && facts.outdoor.value === "unknown") {
    facts.outdoor = fact("outdoor", "true", evidenceFor(place, "amenities: outdoor", "source-explicit"));
  }
  if (place.amenities.includes("indoor") && facts.indoor.value === "unknown") {
    facts.indoor = fact("indoor", "true", evidenceFor(place, "amenities: indoor", "source-explicit"));
  }
  if (place.amenities.includes("carrier") && facts.carrier.value === "unknown") {
    facts.carrier = fact("carrier", "true", evidenceFor(place, "amenities: carrier", "source-explicit"));
  }

  const { petPolicy, ...placeFields } = place;
  return { ...placeFields, policySource: petPolicy, facts, requiredPreparations };
}

export function normalizePlaces(places: RawPlace[]): NormalizedPlace[] {
  return places.map(normalizePlace);
}
