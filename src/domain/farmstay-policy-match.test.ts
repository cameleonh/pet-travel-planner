import { describe, expect, it } from "vitest";
import { haversineMeters, matchFarmstaysToFarmstays, normalizeBusinessName, type FarmstayCandidate } from "@/domain/farmstay-policy-match";

function place(id: string, name: string, lat: number, lon: number, category = "accommodation") {
  return {
    id,
    name,
    category: category as "accommodation",
    coordinates: { latitude: lat, longitude: lon },
    petPolicy: { label: "동반 안내", sourceText: "전 견종 동반 가능", sourceUrl: `https://example.invalid/${id}`, observedAt: "2026-08-01T00:00:00.000Z" },
  };
}

function farmstay(id: string, name: string, lat: number, lon: number): FarmstayCandidate {
  return { farmstayId: id, businessName: name, latitude: lat, longitude: lon };
}

// 1 degree latitude ≈ 111km; 0.001° ≈ 111m
const BASE_LAT = 36.5;
const BASE_LON = 127.5;

describe("normalizeBusinessName", () => {
  it("strips parentheses, punctuation, and case", () => {
    expect(normalizeBusinessName("도그밀리(DOGMILY) 펜션")).toBe("도그밀리 펜션");
    expect(normalizeBusinessName("마운틴밸리  펜션")).toBe("마운틴밸리 펜션");
  });
});

describe("haversineMeters", () => {
  it("returns zero for identical points and ~111m for 0.001 latitude", () => {
    expect(haversineMeters(BASE_LAT, BASE_LON, BASE_LAT, BASE_LON)).toBe(0);
    const d = haversineMeters(BASE_LAT, BASE_LON, BASE_LAT + 0.001, BASE_LON);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(125);
  });
});

describe("matchFarmstaysToFarmstays", () => {
  it("matches a farmstay within 150m with a compatible name", () => {
    const matches = matchFarmstaysToFarmstays(
      [farmstay("fs1", "도그밀리(DOGMILY)", BASE_LAT + 0.0005, BASE_LON)],
      [place("p1", "도그밀리  펜션", BASE_LAT, BASE_LON)],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]!.farmstayId).toBe("fs1");
    expect(matches[0]!.placeId).toBe("p1");
    expect(matches[0]!.sourceText).toBe("전 견종 동반 가능");
  });

  it("picks the nearest of multiple compatible matches", () => {
    const matches = matchFarmstaysToFarmstays(
      [farmstay("fs1", "도그밀리", BASE_LAT + 0.0003, BASE_LON)],
      [place("far", "도그밀리 펜션", BASE_LAT + 0.001, BASE_LON), place("near", "도그밀리", BASE_LAT, BASE_LON)],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]!.placeId).toBe("near");
  });

  it("rejects a within-range place with an incompatible name", () => {
    const matches = matchFarmstaysToFarmstays(
      [farmstay("fs1", "산촌민박", BASE_LAT, BASE_LON)],
      [place("p1", "바다펜션", BASE_LAT, BASE_LON)],
    );
    expect(matches).toHaveLength(0);
  });

  it("rejects a name-compatible place beyond 150m", () => {
    const matches = matchFarmstaysToFarmstays(
      [farmstay("fs1", "도그밀리", BASE_LAT + 0.01, BASE_LON)],
      [place("p1", "도그밀리", BASE_LAT, BASE_LON)],
    );
    expect(matches).toHaveLength(0);
  });

  it("ignores non-accommodation catalog places", () => {
    const matches = matchFarmstaysToFarmstays(
      [farmstay("fs1", "카페민박", BASE_LAT, BASE_LON)],
      [place("p1", "카페민박", BASE_LAT, BASE_LON, "restaurant" as "accommodation")],
    );
    expect(matches).toHaveLength(0);
  });

  it("shares a meaningful token when neither name contains the other", () => {
    const matches = matchFarmstaysToFarmstays(
      [farmstay("fs1", "마운틴밸리 리조트", BASE_LAT + 0.0002, BASE_LON)],
      [place("p1", "마운틴밸리  펜션", BASE_LAT, BASE_LON)],
    );
    expect(matches).toHaveLength(1);
  });

  it("matches on a shared two-character token", () => {
    const matches = matchFarmstaysToFarmstays(
      [farmstay("fs1", "가야 펜션", BASE_LAT + 0.0002, BASE_LON)],
      [place("p1", "가야 산장", BASE_LAT, BASE_LON)],
    );
    expect(matches).toHaveLength(1);
  });

  it("returns empty for empty inputs", () => {
    expect(matchFarmstaysToFarmstays([], [place("p1", "x", BASE_LAT, BASE_LON)])).toHaveLength(0);
    expect(matchFarmstaysToFarmstays([farmstay("fs1", "x", BASE_LAT, BASE_LON)], [])).toHaveLength(0);
  });
});
