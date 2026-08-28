import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearViewedHistory,
  getRecentlyViewed,
  getViewedHistorySnapshot,
  recordViewedPlace,
  removeViewedPlace,
  subscribeViewedHistory,
  VIEWED_HISTORY_LIMIT,
  type ViewedPlaceSummary,
} from "./viewed-history";

function entry(id: string, name = id): ViewedPlaceSummary {
  return { id, name, category: "cafe", region: "제주" };
}

describe("viewed-history storage", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(store)) delete store[k];
      }),
    };
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty list when nothing is stored", () => {
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("records views newest-first", () => {
    recordViewedPlace(entry("a"));
    recordViewedPlace(entry("b"));
    expect(getRecentlyViewed().map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("moves a repeated view to the front instead of duplicating", () => {
    recordViewedPlace(entry("a"));
    recordViewedPlace(entry("b"));
    recordViewedPlace(entry("a"));
    expect(getRecentlyViewed().map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("caps the history at the configured limit", () => {
    for (let i = 0; i < VIEWED_HISTORY_LIMIT + 3; i += 1) recordViewedPlace(entry(`place-${i}`));
    const ids = getRecentlyViewed().map((item) => item.id);
    expect(ids).toHaveLength(VIEWED_HISTORY_LIMIT);
    expect(ids[0]).toBe(`place-${VIEWED_HISTORY_LIMIT + 2}`);
  });

  it("removes a single entry by id", () => {
    recordViewedPlace(entry("a"));
    recordViewedPlace(entry("b"));
    removeViewedPlace("a");
    expect(getRecentlyViewed().map((item) => item.id)).toEqual(["b"]);
  });

  it("clears the whole history", () => {
    recordViewedPlace(entry("a"));
    clearViewedHistory();
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("ignores corrupted JSON and non-array payloads", () => {
    localStorage.setItem("pet_travel_viewed_history_v1", "{corrupted json");
    expect(getRecentlyViewed()).toEqual([]);
    localStorage.setItem("pet_travel_viewed_history_v1", JSON.stringify({ nope: true }));
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("drops malformed entries while keeping valid ones", () => {
    localStorage.setItem("pet_travel_viewed_history_v1", JSON.stringify([{ id: 42 }, "junk", entry("ok")]));
    expect(getRecentlyViewed().map((item) => item.id)).toEqual(["ok"]);
  });

  it("notifies subscribers: records deferred, removals immediate", () => {
    vi.useFakeTimers();
    try {
      const listener = vi.fn();
      const unsubscribe = subscribeViewedHistory(listener);
      recordViewedPlace(entry("a"));
      expect(listener).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(listener).toHaveBeenCalledTimes(1);
      removeViewedPlace("a");
      expect(listener).toHaveBeenCalledTimes(2);
      clearViewedHistory();
      expect(listener).toHaveBeenCalledTimes(3);
      unsubscribe();
      recordViewedPlace(entry("b"));
      vi.advanceTimersByTime(300);
      expect(listener).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the snapshot reference stable while storage is unchanged", () => {
    recordViewedPlace(entry("a"));
    const first = getViewedHistorySnapshot();
    expect(getViewedHistorySnapshot()).toBe(first);
    recordViewedPlace(entry("b"));
    expect(getViewedHistorySnapshot()).not.toBe(first);
  });

  it("handles window undefined gracefully", () => {
    vi.stubGlobal("window", undefined);
    expect(getRecentlyViewed()).toEqual([]);
    expect(() => recordViewedPlace(entry("a"))).not.toThrow();
    expect(() => removeViewedPlace("a")).not.toThrow();
    expect(() => clearViewedHistory()).not.toThrow();
  });
});
