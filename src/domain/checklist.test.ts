import { describe, expect, it } from "vitest";
import { generateSmartChecklist } from "./checklist";
import type { PlanPlace } from "@/domain/plan";

function mockPlace(overrides: Partial<PlanPlace> = {}): PlanPlace {
  return {
    id: "place-1",
    name: "테스트 장소",
    category: "attraction",
    address: "강원도 속초시",
    coordinates: { latitude: 38.2, longitude: 128.5 },
    policySourceText: "목줄 착용 필수",
    exact: true,
    ...overrides,
  };
}

describe("generateSmartChecklist", () => {
  it("returns base essential items for empty places list", () => {
    const items = generateSmartChecklist([]);
    expect(items.length).toBe(4);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("leash");
    expect(ids).toContain("waste-bag");
    expect(ids).toContain("water-bottle");
    expect(ids).toContain("id-tag");
  });

  it("adds indoor items when indoor venue is included", () => {
    const places = [mockPlace({ category: "cafe" })];
    const items = generateSmartChecklist(places);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("manner-belt");
    expect(ids).toContain("carrier-bag");
  });

  it("adds outdoor and comfort items when nature/attraction is included", () => {
    const places = [mockPlace({ category: "attraction" })];
    const items = generateSmartChecklist(places);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("tick-spray");
    expect(ids).toContain("mat-cushion");
  });

  it("adds water safety items when beach or water spot is detected in name or address", () => {
    const places = [mockPlace({ name: "속초 해수욕장", category: "attraction" })];
    const items = generateSmartChecklist(places);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("towel-lifejacket");
  });

  it("includes all relevant categories when itinerary is diverse", () => {
    const places = [
      mockPlace({ name: "경포대 해변 카페", category: "cafe", address: "강릉시 해변로" }),
      mockPlace({ name: "솔향 글램핑", category: "accommodation", address: "강릉시 숲길" }),
    ];
    const items = generateSmartChecklist(places);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("leash");
    expect(ids).toContain("manner-belt");
    expect(ids).toContain("tick-spray");
    expect(ids).toContain("towel-lifejacket");
  });
});
