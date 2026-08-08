import { describe, expect, it } from "vitest";
import type { RawPlace } from "@/data/contracts";
import { evaluatePlace, findExactMatches } from "@/domain/match";
import { normalizePlace } from "@/domain/normalize";
import { findMinimalRelaxation } from "@/domain/relax";
import type { ConditionKey, NormalizedPlace, SelectedConstraint, TriState } from "@/domain/types";

const observedAt = "2026-07-15T00:00:00.000Z";

function rawPlace(sourceText: string, amenities: string[] = []): RawPlace {
  return {
    id: "place-1",
    name: "테스트 장소",
    category: "cafe",
    address: "서울특별시 예시로 1",
    coordinates: { latitude: 37.5, longitude: 127 },
    petPolicy: { label: "동반 안내", sourceText, sourceUrl: "https://example.invalid/place-1", observedAt },
    amenities
  };
}

function constraint(key: ConditionKey, kind: SelectedConstraint["kind"] = "hard", protectedCategory: SelectedConstraint["protectedCategory"] = null): SelectedConstraint {
  return { key, label: key, kind, protectedCategory };
}

function withValues(values: Partial<Record<ConditionKey, TriState>>): NormalizedPlace {
  const place = normalizePlace(rawPlace("정책 정보 없음"));
  for (const [key, value] of Object.entries(values) as [ConditionKey, TriState][]) {
    place.facts[key] = {
      key,
      value,
      evidence: value === "unknown" ? null : { sourceText: "fixture", sourceUrl: "https://example.invalid/evidence", observedAt, excerpt: key, evidenceClass: "source-explicit" },
      requirements: [],
    };
  }
  return place;
}

describe("policy normalization", () => {
  it("extracts positive, negative, and source-backed facts conservatively", () => {
    const place = normalizePlace(rawPlace("목줄 착용 후 이용 가능. 전 견종 동반 가능."));
    expect(place.facts.smallDog.value).toBe("true");
    expect(place.facts.mediumDog.value).toBe("true");
    expect(place.facts.largeDog.value).toBe("true");
    expect(place.facts.smallDog.evidence?.sourceUrl).toBe("https://example.invalid/place-1");
  });

  it("keeps missing or ambiguous policy facts unknown", () => {
    const place = normalizePlace(rawPlace("반려동물 관련 자세한 내용은 문의 바랍니다."));
    expect(Object.values(place.facts).every((fact) => fact.value === "unknown" && fact.evidence === null)).toBe(true);
  });

  it("maps the official all-breeds phrase to every dog-size condition", () => {
    const place = normalizePlace(rawPlace("동반 유형: 전구역 동반가능. 동반 가능 동물: 전 견종 동반 가능. 동반 필요 사항: 목줄 착용."));
    expect(place.facts.smallDog.value).toBe("true");
    expect(place.facts.mediumDog.value).toBe("true");
    expect(place.facts.largeDog.value).toBe("true");
  });

  it("maps the official all-breeds entrance phrase to every dog-size condition", () => {
    const place = normalizePlace(rawPlace("동반 가능 동물: 전 견종 출입 가능(맹견의 경우, 입마개 착용 필수). 동반 필요 사항: 목줄 착용."));
    expect(place.facts.smallDog.value).toBe("true");
    expect(place.facts.mediumDog.value).toBe("true");
    expect(place.facts.largeDog.value).toBe("true");
    expect(place.requiredPreparations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "leash", scope: "all" }),
      expect.objectContaining({ key: "muzzle", scope: "dangerous-dog" }),
    ]));
  });

  it("maps an official under-10kg admission rule to the supported size bands", () => {
    const place = normalizePlace(rawPlace("10kg 미만 리드줄 착용 시 입장 가능합니다."));
    expect(place.facts.smallDog.value).toBe("true");
    expect(place.facts.mediumDog.value).toBe("false");
    expect(place.facts.largeDog.value).toBe("false");
    expect(place.requiredPreparations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "leash", scope: "all" }),
    ]));
  });

  it("detects carrier-gated indoor admission as a preparation requirement", () => {
    const place = normalizePlace(rawPlace("이동가방 사용 시 실내 동반 가능합니다."));
    expect(place.requiredPreparations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "carrier", scope: "indoor" }),
    ]));
  });

  it("does not treat a qualified weight or age allowance as proof for the whole size band", () => {
    const place = normalizePlace(rawPlace("17kg 이하 또는 6개월 미만 대형견 동반 가능"));
    expect(place.facts.mediumDog.value).toBe("unknown");
    expect(place.facts.largeDog.value).toBe("unknown");
  });

  it("still accepts an unqualified size allowance and ignores numbers in another claim", () => {
    const place = normalizePlace(rawPlace("주차 20대 가능. 대형견 동반 가능."));
    expect(place.facts.largeDog.value).toBe("true");
  });
});

describe("strict AND matching", () => {
  it("excludes a hard UNKNOWN and reports the missing proof", () => {
    const result = evaluatePlace(withValues({ smallDog: "true", mediumDog: "unknown" }), [constraint("smallDog"), constraint("mediumDog")]);
    expect(result.exact).toBe(false);
    expect(result.proof).toHaveLength(1);
    expect(result.failures).toEqual([expect.objectContaining({ value: "unknown", reason: "unknown" })]);
  });

  it("returns one source-backed proof per selected condition", () => {
    const result = evaluatePlace(withValues({ smallDog: "true", mediumDog: "true", largeDog: "true" }), [constraint("smallDog"), constraint("mediumDog"), constraint("largeDog")]);
    expect(result.exact).toBe(true);
    expect(result.proof).toHaveLength(3);
    expect(result.proof.every((item) => item.evidence.sourceUrl.startsWith("https://"))).toBe(true);
  });

  it("accepts only all-TRUE combinations across the tri-state space", () => {
    const states: TriState[] = ["true", "false", "unknown"];
    let exactCount = 0;
    for (const smallDog of states) for (const mediumDog of states) for (const largeDog of states) {
      const exact = evaluatePlace(withValues({ smallDog, mediumDog, largeDog }), [constraint("smallDog"), constraint("mediumDog"), constraint("largeDog")]).exact;
      if (exact) exactCount += 1;
      expect(exact).toBe(smallDog === "true" && mediumDog === "true" && largeDog === "true");
    }
    expect(exactCount).toBe(1);
  });

  it("does not classify an empty constraint set as an exact match", () => {
    const result = evaluatePlace(withValues({ smallDog: "true" }), []);
    expect(result.status).toBe("not-evaluated");
    expect(findExactMatches([withValues({ smallDog: "true" })], [])).toHaveLength(0);
  });

  it("assigns one mutually exclusive disposition with explicit false taking precedence", () => {
    expect(evaluatePlace(withValues({ smallDog: "true" }), [constraint("smallDog")]).status).toBe("confirmed-match");
    expect(evaluatePlace(withValues({ smallDog: "false", mediumDog: "unknown" }), [constraint("smallDog"), constraint("mediumDog")]).status).toBe("confirmed-non-match");
    expect(evaluatePlace(withValues({ smallDog: "true", mediumDog: "unknown" }), [constraint("smallDog"), constraint("mediumDog")]).status).toBe("unverified");
  });
});

describe("minimal relaxation", () => {
  it("removes the smallest ordinary preference set that yields results", () => {
    const places = [withValues({ smallDog: "true", mediumDog: "true", largeDog: "false" })];
    const proposal = findMinimalRelaxation(places, [constraint("smallDog"), constraint("mediumDog", "preference"), constraint("largeDog", "preference")]);
    expect(proposal?.removedPreferences.map((item) => item.key)).toEqual(["largeDog"]);
    expect(proposal?.matches).toHaveLength(1);
  });

  it("never relaxes hard or safety/legal/access/admission constraints", () => {
    const protectedCategories = ["safety", "legal", "access", "admission"] as const;
    for (const protectedCategory of protectedCategories) {
      const places = [withValues({ smallDog: "false" })];
      const proposal = findMinimalRelaxation(places, [constraint("smallDog", "preference", protectedCategory)]);
      expect(proposal).toBeNull();
    }
    expect(findMinimalRelaxation([withValues({ smallDog: "false" })], [constraint("smallDog", "hard")])).toBeNull();
  });

  it("preserves a hard constraint even when a preference has the same key", () => {
    const hard = constraint("smallDog", "hard");
    const preference = constraint("smallDog", "preference");
    const proposal = findMinimalRelaxation([withValues({ smallDog: "false" })], [hard, preference]);
    expect(proposal).toBeNull();
  });
});

describe("preparation filter extraction", () => {
  it("extracts leash from source text mentioning 목줄 착용", () => {
    const place = normalizePlace(rawPlace("목줄 착용 후 동반 가능합니다."));
    expect(place.requiredPreparations.some((p) => p.key === "leash")).toBe(true);
  });

  it("extracts carrier from source text mentioning 이동장 사용", () => {
    const place1 = normalizePlace(rawPlace("이동장 사용 시 동반 가능"));
    expect(place1.requiredPreparations.some((p) => p.key === "carrier")).toBe(true);
    const place2 = normalizePlace(rawPlace("이동가방 착용 필수"));
    expect(place2.requiredPreparations.some((p) => p.key === "carrier")).toBe(true);
  });

  it("does not extract preparations when text has no preparation keywords", () => {
    const place = normalizePlace(rawPlace("전 구역 동반 가능합니다."));
    expect(place.requiredPreparations).toHaveLength(0);
  });
});
