import { describe, expect, it } from "vitest";
import {
  buildRecommendationQueue,
  COMPANION_STORAGE_KEY,
  DEFAULT_COMPANION_PREFS,
  parseCompanionPrefs,
  pickRecommendation,
  serializeCompanionPrefs,
  type CompanionCandidate,
} from "./companion";
import type { ViewedPlaceSummary } from "@/domain/viewed-history";

function viewed(id: string, name = id, region = "제주"): ViewedPlaceSummary {
  return { id, name, category: "cafe", region };
}

function candidate(id: string, name = id, region = "서울"): CompanionCandidate {
  return { id, name, region };
}

describe("pickRecommendation", () => {
  it("returns null for an empty queue", () => {
    expect(pickRecommendation([], 0)).toBeNull();
  });

  it("returns the indexed item", () => {
    const items = ["a", "b", "c"];
    expect(pickRecommendation(items, 1)).toBe("b");
  });

  it("wraps around past the end", () => {
    const items = ["a", "b", "c"];
    expect(pickRecommendation(items, 4)).toBe("b");
  });

  it("normalizes negative and fractional indexes", () => {
    const items = ["a", "b", "c"];
    expect(pickRecommendation(items, -1)).toBe("c");
    expect(pickRecommendation(items, 2.9)).toBe("c");
  });
});

describe("buildRecommendationQueue", () => {
  it("puts recently viewed places first, then candidates", () => {
    const queue = buildRecommendationQueue([viewed("r1")], [candidate("c1")]);
    expect(queue.map((item) => item.id)).toEqual(["r1", "c1"]);
  });

  it("deduplicates ids and keeps the viewed entry", () => {
    const queue = buildRecommendationQueue([viewed("same", "본 곳", "부산")], [candidate("same", "후보")]);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.name).toBe("본 곳");
    expect(queue[0]?.region).toBe("부산");
  });

  it("returns an empty queue when there is nothing to recommend", () => {
    expect(buildRecommendationQueue([], [])).toEqual([]);
  });

  it("carries the confirmed flag from the candidate pool", () => {
    const queue = buildRecommendationQueue([], [{ ...candidate("c1"), confirmed: true }]);
    expect(queue[0]?.confirmed).toBe(true);
  });

  it("marks a viewed-only place as unconfirmed", () => {
    const queue = buildRecommendationQueue([viewed("r1")], []);
    expect(queue[0]?.confirmed).toBe(false);
  });
});

describe("companion preferences", () => {
  it("defaults when nothing is stored", () => {
    expect(parseCompanionPrefs(null)).toEqual(DEFAULT_COMPANION_PREFS);
  });

  it("round-trips through serialization", () => {
    const prefs = { hidden: true, petCount: 7 };
    expect(parseCompanionPrefs(serializeCompanionPrefs(prefs))).toEqual(prefs);
  });

  it("ignores corrupted payloads and malformed counts", () => {
    expect(parseCompanionPrefs("{corrupted json")).toEqual(DEFAULT_COMPANION_PREFS);
    expect(parseCompanionPrefs(JSON.stringify({ hidden: "yes", petCount: -3 }))).toEqual({ hidden: false, petCount: 0 });
    expect(parseCompanionPrefs(JSON.stringify({ hidden: true, petCount: "many" }))).toEqual({ hidden: true, petCount: 0 });
  });

  it("floors fractional and negative counts on serialize", () => {
    expect(serializeCompanionPrefs({ hidden: false, petCount: 2.9 })).toBe(JSON.stringify({ hidden: false, petCount: 2 }));
    expect(serializeCompanionPrefs({ hidden: false, petCount: -5 })).toBe(JSON.stringify({ hidden: false, petCount: 0 }));
  });

  it("exposes a stable storage key", () => {
    expect(COMPANION_STORAGE_KEY).toBe("pet_travel_companion_v1");
  });
});
