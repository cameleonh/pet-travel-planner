import { describe, expect, it } from "vitest";
import { emptySearchFilters, hasActiveFilters } from "./search-filters";

describe("search-filters", () => {
  it("treats the empty filter state as inactive", () => {
    expect(hasActiveFilters(emptySearchFilters())).toBe(false);
  });

  it("flags region selection as active", () => {
    expect(hasActiveFilters({ ...emptySearchFilters(), region: "제주" })).toBe(true);
    expect(hasActiveFilters({ ...emptySearchFilters(), region: "  " })).toBe(false);
  });

  it("flags category, hard, preference and prep selections as active", () => {
    expect(hasActiveFilters({ ...emptySearchFilters(), categories: ["cafe"] })).toBe(true);
    expect(hasActiveFilters({ ...emptySearchFilters(), hard: ["smallDog"] })).toBe(true);
    expect(hasActiveFilters({ ...emptySearchFilters(), preferences: ["largeDog"] })).toBe(true);
    expect(hasActiveFilters({ ...emptySearchFilters(), prepFilters: ["indoor"] })).toBe(true);
  });

  it("flags pagination beyond page 1 as active", () => {
    expect(hasActiveFilters({ ...emptySearchFilters(), page: 3 })).toBe(true);
  });
});
