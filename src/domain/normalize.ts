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

// Size bands match the weight thresholds used across the catalog:
// small ≤ 10kg, medium 10–25kg, large > 25kg.
const SMALL_MAX_KG = 10;
const MEDIUM_MAX_KG = 25;

// "전 견종"/"모든 견종" — the source explicitly admits every breed, so every band.
const allBreedsPattern = /(?:전\s*견종|전견종|모든\s*견종|모든\s*크기(?:\s*의)?\s*반려견)[^.!?;\n]{0,16}(?:동반|출입|입장|반입)[^.!?;\n]{0,8}(?:가능|허용)/;

const sizeAllowPatterns: { key: ConditionKey; pattern: RegExp }[] = [
  { key: "smallDog", pattern: /소형견[^.!?;\n]{0,12}(?:가능|허용)/ },
  { key: "mediumDog", pattern: /중형견[^.!?;\n]{0,12}(?:가능|허용)/ },
  { key: "largeDog", pattern: /대형견[^.!?;\n]{0,12}(?:가능|허용)/ },
];
// "중소형견" is the source's way of admitting small and medium bands only.
const smallToMediumAllowPattern = /중소형견[^.!?;\n]{0,10}(?:가능|허용)/;
const sizeDenyPatterns: { key: ConditionKey; pattern: RegExp }[] = [
  { key: "smallDog", pattern: /소형견[^.!?;\n]{0,10}(?:불가|제한|금지|불허)/ },
  { key: "mediumDog", pattern: /중형견[^.!?;\n]{0,10}(?:불가|제한|금지|불허)/ },
  { key: "largeDog", pattern: /대형견[^.!?;\n]{0,10}(?:불가|제한|금지|불허)/ },
];

// A size claim that also carries a weight/age qualifier ("15kg 이하 대형견 가능")
// cannot prove the whole band, so the explicit size word is not trusted alone.
const sizeQualifierPattern = /(?:\d+(?:\.\d+)?\s*(?:kg|㎏|킬로그램)|\d+\s*(?:개월|살|세))/i;
const ageQualifierPattern = /\d+\s*(?:개월|살|세)/;
const sizeSpecifiedPattern = /(?:소형견|중형견|대형견|중소형견|전\s*견종|전견종|모든\s*견종|모든\s*크기|체고|\d+(?:\.\d+)?\s*(?:kg|㎏|킬로그램))/i;
const generalAdmissionPattern = /동반\s*가능/;

// A weight cap (max allowed weight) expressed either positively ("Nkg 이하 동반
// 가능") or negatively ("Nkg 이상 동반 불가").
const weightAllowancePattern = /(\d+(?:\.\d+)?)\s*(?:kg|㎏|킬로그램)\s*(미만|이하)[^.!?;\n]{0,32}(?:입장|출입|동반)[^.!?;\n]{0,10}(?:가능|허용)/i;
const weightRestrictionPattern = /(\d+(?:\.\d+)?)\s*(?:kg|㎏|킬로그램)\s*(이상|초과)[^.!?;\n]{0,32}(?:불가|제한|금지|불허)/i;

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

type SizeFacts = Record<ConditionKey, ConditionFact>;

// Positive facts never override an explicit restriction; restrictions always win.
function setSizeTrue(place: RawPlace, facts: SizeFacts, key: ConditionKey, excerpt: string): void {
  if (facts[key].value === "false") return;
  facts[key] = fact(key, "true", evidenceFor(place, excerpt, "source-derived"));
}

function setSizeFalse(place: RawPlace, facts: SizeFacts, key: ConditionKey, excerpt: string): void {
  facts[key] = fact(key, "false", evidenceFor(place, excerpt, "source-derived"));
}

function applyWeightCap(place: RawPlace, facts: SizeFacts, limit: number, qualifier: "미만" | "이하", excerpt: string): void {
  if (!Number.isFinite(limit) || limit <= 0) return;
  // Any positive weight cap admits at least the small band.
  setSizeTrue(place, facts, "smallDog", excerpt);
  const mediumExcluded = (qualifier === "미만" && limit <= SMALL_MAX_KG) || (qualifier === "이하" && limit < SMALL_MAX_KG);
  const mediumIncluded = (qualifier === "미만" && limit > MEDIUM_MAX_KG) || (qualifier === "이하" && limit >= MEDIUM_MAX_KG);
  if (mediumExcluded) setSizeFalse(place, facts, "mediumDog", excerpt);
  else if (mediumIncluded) setSizeTrue(place, facts, "mediumDog", excerpt);
  const largeExcluded = (qualifier === "미만" && limit <= MEDIUM_MAX_KG) || (qualifier === "이하" && limit < MEDIUM_MAX_KG);
  if (largeExcluded) setSizeFalse(place, facts, "largeDog", excerpt);
}

function applyWeightRules(place: RawPlace, text: string, facts: SizeFacts): void {
  const allowance = text.match(weightAllowancePattern);
  if (allowance && !ageQualifierPattern.test(containingClaim(text, allowance.index ?? 0))) {
    applyWeightCap(place, facts, Number(allowance[1]), allowance[2] as "미만" | "이하", allowance[0]);
  }
  const restriction = text.match(weightRestrictionPattern);
  if (restriction && !ageQualifierPattern.test(containingClaim(text, restriction.index ?? 0))) {
    // "Nkg 이상 불가" ⇒ below N allowed ("미만"); "Nkg 초과 불가" ⇒ N or below allowed ("이하").
    applyWeightCap(place, facts, Number(restriction[1]), restriction[2] === "이상" ? "미만" : "이하", restriction[0]);
  }
}

function enforceSizeMonotonicity(place: RawPlace, facts: SizeFacts): void {
  // A larger band being allowed implies every smaller band is allowed...
  if (facts.largeDog.value === "true") {
    setSizeTrue(place, facts, "mediumDog", "대형견 가능 → 중형견·소형견 가능");
    setSizeTrue(place, facts, "smallDog", "대형견 가능 → 중형견·소형견 가능");
  }
  if (facts.mediumDog.value === "true") {
    setSizeTrue(place, facts, "smallDog", "중형견 가능 → 소형견 가능");
  }
  // ...and a smaller band being forbidden implies every larger band is forbidden.
  if (facts.smallDog.value === "false") {
    setSizeFalse(place, facts, "mediumDog", "소형견 불가 → 중형견·대형견 불가");
    setSizeFalse(place, facts, "largeDog", "소형견 불가 → 중형견·대형견 불가");
  } else if (facts.mediumDog.value === "false") {
    setSizeFalse(place, facts, "largeDog", "중형견 불가 → 대형견 불가");
  }
}

function applyDogSizeRules(place: RawPlace, text: string, facts: SizeFacts): void {
  const allBreeds = text.match(allBreedsPattern);
  if (allBreeds) {
    for (const key of dogSizeKeys) setSizeTrue(place, facts, key, allBreeds[0]);
  }

  for (const { key, pattern } of sizeAllowPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const claim = containingClaim(text, match.index ?? 0);
    if (sizeQualifierPattern.test(claim) && !allBreedsPattern.test(match[0])) continue;
    setSizeTrue(place, facts, key, match[0]);
  }

  const smallToMedium = text.match(smallToMediumAllowPattern);
  if (smallToMedium) {
    setSizeTrue(place, facts, "smallDog", smallToMedium[0]);
    setSizeTrue(place, facts, "mediumDog", smallToMedium[0]);
    setSizeFalse(place, facts, "largeDog", smallToMedium[0]);
  }

  for (const { key, pattern } of sizeDenyPatterns) {
    const match = text.match(pattern);
    if (match) setSizeFalse(place, facts, key, match[0]);
  }

  applyWeightRules(place, text, facts);
  enforceSizeMonotonicity(place, facts);

  // Only fall back to generic admission when the source says nothing size-specific:
  // "동반 가능" alone proves the small band, not medium or large. Whole-band proof
  // comes from an explicit all-breeds phrase, which is handled above.
  if (!sizeSpecifiedPattern.test(text) && generalAdmissionPattern.test(text)) {
    setSizeTrue(place, facts, "smallDog", "동반 가능 명시 (크기 미지정)");
  }
}

export function normalizePlace(place: RawPlace): NormalizedPlace {
  const facts = Object.fromEntries(conditionKeys.map((key) => [key, fact(key, "unknown", null)])) as SizeFacts;
  const text = place.petPolicy.sourceText.replace(/\r?\n+/g, ". ").replace(/[\t ]+/g, " ").trim();
  const requiredPreparations = extractPreparations(place, text);
  applyDogSizeRules(place, text, facts);

  const { petPolicy, ...placeFields } = place;
  return { ...placeFields, policySource: petPolicy, facts, requiredPreparations };
}

export function normalizePlaces(places: RawPlace[]): NormalizedPlace[] {
  return places.map(normalizePlace);
}
