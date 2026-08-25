import { describe, expect, it } from "vitest";
import { THEME_PRESETS, type ThemePresetId } from "./themes";

describe("THEME_PRESETS", () => {
  it("contains all expected preset ids", () => {
    const ids = THEME_PRESETS.map((p) => p.id);
    const expectedIds: ThemePresetId[] = [
      "rainy-indoor",
      "large-dog-free",
      "healing-cafe",
      "camping-glamping",
      "ocean-water",
      "rural-stay",
    ];
    expect(ids).toEqual(expectedIds);
  });

  it("ensures each preset has valid metadata and non-empty categories", () => {
    for (const preset of THEME_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.emoji).toBeTruthy();
      expect(preset.badge).toBeTruthy();
      expect(preset.titleKo).toBeTruthy();
      expect(preset.titleEn).toBeTruthy();
      expect(preset.descKo).toBeTruthy();
      expect(preset.descEn).toBeTruthy();
      expect(preset.categories.length).toBeGreaterThan(0);
      expect(preset.recommendedTags.length).toBeGreaterThan(0);
    }
  });

  it("configures large dog free preset with largeDog requirement", () => {
    const largePreset = THEME_PRESETS.find((p) => p.id === "large-dog-free");
    expect(largePreset).toBeDefined();
    expect(largePreset?.petSize).toBe("largeDog");
    expect(largePreset?.prepFilters).toContain("outdoor");
  });
});
