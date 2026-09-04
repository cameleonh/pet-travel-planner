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
      "night-view",
    ];
    expect(ids).toEqual(expectedIds);
  });

  it("ensures each preset has valid metadata and a result driver", () => {
    for (const preset of THEME_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.emoji).toBeTruthy();
      expect(preset.badge).toBeTruthy();
      expect(preset.titleKo).toBeTruthy();
      expect(preset.titleEn).toBeTruthy();
      expect(preset.descKo).toBeTruthy();
      expect(preset.descEn).toBeTruthy();
      expect(preset.recommendedTags.length).toBeGreaterThan(0);
      if (preset.placeSet) {
        expect(preset.placeSet).toBe("night-spots");
      } else {
        expect(preset.categories.length).toBeGreaterThan(0);
      }
    }
  });

  it("configures the night view preset to drive results via the curated place set", () => {
    const nightPreset = THEME_PRESETS.find((p) => p.id === "night-view");
    expect(nightPreset).toBeDefined();
    expect(nightPreset?.placeSet).toBe("night-spots");
    expect(nightPreset?.categories).toEqual([]);
    expect(nightPreset?.prepFilters).toContain("leash");
  });

  it("configures large dog free preset with largeDog requirement", () => {
    const largePreset = THEME_PRESETS.find((p) => p.id === "large-dog-free");
    expect(largePreset).toBeDefined();
    expect(largePreset?.petSize).toBe("largeDog");
    expect(largePreset?.prepFilters).toContain("outdoor");
  });
});
