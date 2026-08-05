import { describe, expect, it } from "vitest";
import { buildCatalogPage, CATALOG_PAGE_SIZE } from "@/data/catalog";
import { FixturePlaceProvider } from "@/data/providers/fixture-provider";
import type { ProviderSnapshot } from "@/data/contracts";
import type { SelectedConstraint } from "@/domain/types";

function hard(key: SelectedConstraint["key"]): SelectedConstraint {
  return { key, label: key, kind: "hard", protectedCategory: "admission" };
}

async function largeSnapshot(): Promise<ProviderSnapshot> {
  const fixture = await new FixturePlaceProvider().getSnapshot();
  const source = fixture.places[0]!;
  return {
    ...fixture,
    sourceTotalCount: 120,
    places: Array.from({ length: 120 }, (_, index) => ({
      ...source,
      id: `catalog-${index + 1}`,
      name: `장소 ${index + 1}`,
      petDetailStatus: index < 60 ? "fetched" : "not-fetched",
      petPolicy: index < 60 ? source.petPolicy : { ...source.petPolicy, sourceText: "반려동물 동반 상세정보 미제공" },
    })),
    auxiliaryPlaces: [],
  };
}

describe("catalog pagination", () => {
  it("reports the global total while returning only one 50-row page", async () => {
    const page = buildCatalogPage(await largeSnapshot(), { hard: [], preferences: [], page: 1 });
    expect(page).toMatchObject({
      sourceTotalCount: 120,
      searchableCount: 60,
      detailCoverage: 60,
      pendingDetailCount: 60,
      filteredCount: 60,
      page: 1,
      pageSize: CATALOG_PAGE_SIZE,
      totalPages: 2,
    });
    expect(page.results).toHaveLength(50);
    expect(page.results.every((result) => result.place.petDetailStatus === "fetched")).toBe(true);
  });

  it("returns the final window and clamps page overflow", async () => {
    const page = buildCatalogPage(await largeSnapshot(), { hard: [], preferences: [], page: 999 });
    expect(page.page).toBe(2);
    expect(page.results).toHaveLength(10);
    expect(page.results[0]?.place.id).toBe("catalog-51");
  });

  it("computes a global exact count and excludes unknown detail", async () => {
    const page = buildCatalogPage(await largeSnapshot(), { hard: [hard("smallDog")], preferences: [], page: 1 });
    expect(page.filteredCount).toBe(60);
    expect(page.confirmedMatchCount).toBe(60);
    expect(page.confirmedNonMatchCount).toBe(0);
    expect(page.unverifiedCount).toBe(0);
    expect(page.unknownPlaceCount).toBe(0);
    expect(page.confirmedMatchCount + page.confirmedNonMatchCount + page.unverifiedCount).toBe(page.searchableCount);
    expect(page.results).toHaveLength(50);
    expect(page.results.every((result) => result.exact)).toBe(true);
  });

  it("partitions filtered places without counting false-and-unknown rows twice", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const [outdoorOnly, indoorPlace] = fixture.places;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 3,
      places: [
        { ...outdoorOnly!, id: "match", petPolicy: { ...outdoorOnly!.petPolicy, sourceText: "전 견종 동반 가능." } },
        { ...outdoorOnly!, id: "non-match", petPolicy: { ...outdoorOnly!.petPolicy, sourceText: "대형견 동반 불가." } },
        { ...outdoorOnly!, id: "unverified", petPolicy: { ...outdoorOnly!.petPolicy, sourceText: "반려동물 정책은 전화 문의 바랍니다." } },
      ],
      auxiliaryPlaces: [],
    };
    const page = buildCatalogPage(snapshot, { hard: [hard("smallDog"), hard("largeDog")], preferences: [], page: 1 });
    expect(page).toMatchObject({ confirmedMatchCount: 1, confirmedNonMatchCount: 1, unverifiedCount: 1, unknownPlaceCount: 1 });
    expect(page.confirmedMatchCount + page.confirmedNonMatchCount + page.unverifiedCount).toBe(3);
  });

  it("filters fetched places by destination text and category before matching", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 4,
      places: [
        { ...source, id: "sokcho-attraction", address: "강원특별자치도 속초시 중앙로 1", category: "attraction" },
        { ...source, id: "sokcho-cafe", address: "강원특별자치도 속초시 해변로 2", category: "cafe" },
        { ...source, id: "gangneung-cafe", address: "강원특별자치도 강릉시 경강로 3", category: "cafe" },
        { ...source, id: "pending", address: "강원특별자치도 속초시 미수집로 4", category: "cafe", petDetailStatus: "not-fetched" },
      ],
      auxiliaryPlaces: [],
    };

    const page = buildCatalogPage(snapshot, {
      hard: [],
      preferences: [],
      page: 1,
      region: " 속초 ",
      categories: ["cafe"],
    });

    expect(page.searchableCount).toBe(1);
    expect(page.filteredCount).toBe(1);
    expect(page.results.map((result) => result.place.id)).toEqual(["sokcho-cafe"]);
    expect(page.detailCoverage).toBe(3);
    expect(page.pendingDetailCount).toBe(1);
  });

  it("matches every whitespace-separated destination term across the address and place name", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 3,
      places: [
        { ...source, id: "busan-haeundae", address: "부산광역시 해운대구 달맞이길 1", name: "바다공원" },
        { ...source, id: "busan-only", address: "부산광역시 부산진구 중앙대로 2", name: "도심공원" },
        { ...source, id: "haeundae-only", address: "서울특별시 중구 세종대로 3", name: "해운대식당" },
      ],
      auxiliaryPlaces: [],
    };

    const page = buildCatalogPage(snapshot, {
      hard: [],
      preferences: [],
      page: 1,
      region: " 부산   해운대 ",
    });

    expect(page.searchableCount).toBe(1);
    expect(page.results.map((result) => result.place.id)).toEqual(["busan-haeundae"]);
  });
});
