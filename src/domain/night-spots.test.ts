import { describe, expect, it } from "vitest";
import { NIGHT_SPOTS, NIGHT_SPOT_PLACE_IDS, type NightSpotTag } from "./night-spots";

const validTags: readonly NightSpotTag[] = ["view", "ride", "walk", "stay"];

describe("NIGHT_SPOTS curation seed", () => {
  it("holds the approved 51-spot seed with the expected tag mix", () => {
    expect(NIGHT_SPOTS).toHaveLength(51);
    const counts = NIGHT_SPOTS.reduce<Record<string, number>>((acc, spot) => {
      acc[spot.tag] = (acc[spot.tag] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ view: 24, ride: 9, walk: 12, stay: 6 });
  });

  it("contains only valid tags and non-empty tour-api place ids", () => {
    for (const spot of NIGHT_SPOTS) {
      expect(validTags).toContain(spot.tag);
      expect(spot.placeId).toMatch(/^tour-api:\d+$/);
    }
  });

  it("keeps place ids unique between the list and the derived set", () => {
    const ids = NIGHT_SPOTS.map((spot) => spot.placeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(NIGHT_SPOT_PLACE_IDS.size).toBe(ids.length);
    for (const id of ids) expect(NIGHT_SPOT_PLACE_IDS.has(id)).toBe(true);
    expect(NIGHT_SPOT_PLACE_IDS.has("tour-api:0")).toBe(false);
  });

  it("still carries the owner-approved landmark spots", () => {
    // 북악스카이 팔각정 / 부산 송도해상케이블카 / 이랜드크루즈 / 여의도한강공원 / 리틀포레한강
    expect(NIGHT_SPOT_PLACE_IDS.has("tour-api:126943")).toBe(true);
    expect(NIGHT_SPOT_PLACE_IDS.has("tour-api:2504464")).toBe(true);
    expect(NIGHT_SPOT_PLACE_IDS.has("tour-api:126701")).toBe(true);
    expect(NIGHT_SPOT_PLACE_IDS.has("tour-api:1059479")).toBe(true);
    expect(NIGHT_SPOT_PLACE_IDS.has("tour-api:3532633")).toBe(true);
  });
});
