import { describe, expect, it } from "vitest";
import type { DisplayCategory } from "@/domain/categories";
import { PLACE_VISUAL_THEMES, resolvePlaceVisual } from "./place-visuals";

const allCategories: DisplayCategory[] = [
  "park", "beach", "mountain", "nature", "culture",
  "market", "outlet", "department", "dutyfree",
  "restaurant", "cafe", "accommodation", "shopping",
  "camping", "veterinary", "petShop", "petCafe",
  "place",
];

describe("place-visuals", () => {
  it("defines a theme for every display category", () => {
    for (const category of allCategories) {
      expect(PLACE_VISUAL_THEMES[category]).toBeDefined();
    }
  });

  it("uses hex gradient stops and an emoji per theme", () => {
    for (const category of allCategories) {
      const theme = PLACE_VISUAL_THEMES[category];
      expect(theme.from).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.to).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.emoji.length).toBeGreaterThan(0);
    }
  });

  it("resolves a known category to its own theme", () => {
    expect(resolvePlaceVisual("cafe")).toEqual(PLACE_VISUAL_THEMES.cafe);
    expect(resolvePlaceVisual("camping")).toEqual(PLACE_VISUAL_THEMES.camping);
  });

  it("falls back to the generic paw theme for unknown categories", () => {
    expect(resolvePlaceVisual("unknown-category" as DisplayCategory)).toEqual(PLACE_VISUAL_THEMES.place);
  });
});
