import { beforeEach, describe, expect, it } from "vitest";
import { buildCatalogPage, CATALOG_PAGE_SIZE, clearCatalogCache, getCatalogCacheStats, getCatalogCoverage } from "@/data/catalog";
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
  beforeEach(() => clearCatalogCache());

  it("summarizes completeness from the full downloaded snapshot, not a page or a placeholder", async () => {
    const snapshot = await largeSnapshot();
    expect(getCatalogCoverage(snapshot)).toEqual({
      sourceTotalCount: 120,
      searchableCount: 60,
      detailCoverage: 60,
      pendingDetailCount: 60,
      failedDetailCount: 0,
    });
  });

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
    const [outdoorOnly] = fixture.places;
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

  it("sorts the whole result set by name, distance and rating", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const base = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 3,
      places: [
        { ...base, id: "p-c", name: "다나", coordinates: { latitude: 37.6, longitude: 127.0 }, petDetailStatus: "fetched", petPolicy: { ...base.petPolicy, sourceText: "동반 가능" } },
        { ...base, id: "p-a", name: "가나", coordinates: { latitude: 37.5, longitude: 127.0 }, petDetailStatus: "fetched", petPolicy: { ...base.petPolicy, sourceText: "동반 가능" } },
        { ...base, id: "p-b", name: "나다", coordinates: { latitude: 37.55, longitude: 127.0 }, petDetailStatus: "fetched", petPolicy: { ...base.petPolicy, sourceText: "동반 가능" } },
      ],
      auxiliaryPlaces: [],
    };
    const browsing = { hard: [], preferences: [], page: 1 };

    expect(buildCatalogPage(snapshot, { ...browsing, sort: "name" }).results.map((r) => r.place.id)).toEqual(["p-a", "p-b", "p-c"]);
    expect(buildCatalogPage(snapshot, { ...browsing, sort: "distance", origin: { latitude: 37.5, longitude: 127.0 } }).results.map((r) => r.place.id)).toEqual(["p-a", "p-b", "p-c"]);

    const ratings = new Map([["p-b", { count: 3, average: 5 }], ["p-c", { count: 1, average: 4 }]]);
    expect(buildCatalogPage(snapshot, { ...browsing, sort: "rating", ratings }).results.map((r) => r.place.id)).toEqual(["p-b", "p-c", "p-a"]);
  });

  it("includes café-named restaurants when the cafe category is selected", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      places: [
        { ...source, id: "gn-cafe-named-restaurant", name: "카페 플랜비", address: "경상남도 창원시 진해구 진희로 146", category: "restaurant" },
        { ...source, id: "gn-plain-restaurant", name: "바다식당", address: "경상남도 창원시 웅동로 5", category: "restaurant" },
        { ...source, id: "gn-cafe", name: "어느카페", address: "경상남도 창원시 법원로 7", category: "cafe" },
      ],
      auxiliaryPlaces: [],
    };

    const page = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, region: "경남", categories: ["cafe"] });
    expect(page.results.map((result) => result.place.id).sort()).toEqual(["gn-cafe", "gn-cafe-named-restaurant"]);

    // restaurant-only selection keeps café-named restaurants too (their source
    // category IS restaurant) — the café filter widens, it never steals rows.
    const restaurantPage = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, region: "경남", categories: ["restaurant"] });
    expect(restaurantPage.results.map((result) => result.place.id).sort()).toEqual(["gn-cafe-named-restaurant", "gn-plain-restaurant"]);
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

  it("treats selecting every place type as the unfiltered catalog", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const categories = ["attraction", "restaurant", "cafe", "accommodation", "shopping"] as const;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: categories.length,
      places: categories.map((category, index) => ({
        ...source,
        id: `all-category-${category}`,
        name: category === "shopping" ? "다비치안경 테스트점" : `장소 ${index + 1}`,
        category,
      })),
      auxiliaryPlaces: [],
    };

    const unfiltered = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1 });
    const everyType = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, categories: [...categories] });
    const shoppingOnly = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, categories: ["shopping"] });

    expect(everyType.searchableCount).toBe(unfiltered.searchableCount);
    expect(everyType.filteredCount).toBe(unfiltered.filteredCount);
    expect(everyType.results.map((result) => result.place.id)).toEqual(unfiltered.results.map((result) => result.place.id));
    expect(shoppingOnly.filteredCount).toBe(0);
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

  it("prepares and evaluates an unchanged snapshot only once", async () => {
    const snapshot = await largeSnapshot();
    const query = { hard: [hard("mediumDog")], preferences: [], page: 1 };

    const first = buildCatalogPage(snapshot, query);
    const second = buildCatalogPage(snapshot, query);

    expect(second).toEqual(first);
    expect(second.results[0]).toBe(first.results[0]);
    expect(getCatalogCacheStats()).toEqual({ preparations: 1, evaluationBuilds: 1 });
  });

  it("invalidates prepared data when the provider publishes a new snapshot object", async () => {
    const snapshot = await largeSnapshot();
    const query = { hard: [hard("mediumDog")], preferences: [], page: 1 };
    const first = buildCatalogPage(snapshot, query);
    const replacement = { ...snapshot, places: snapshot.places.map((place) => ({ ...place })) };
    const second = buildCatalogPage(replacement, query);

    expect(second.results[0]).not.toBe(first.results[0]);
    expect(getCatalogCacheStats()).toEqual({ preparations: 2, evaluationBuilds: 2 });
  });

  it("infers indoor admission for indoor venues with whole-area admission", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 4,
      places: [
        { ...source, id: "cafe-whole", category: "cafe", petPolicy: { ...source.petPolicy, sourceText: "동반 유형: 전구역 동반가능" } },
        { ...source, id: "attraction-whole", category: "attraction", petPolicy: { ...source.petPolicy, sourceText: "동반 유형: 전구역 동반가능" } },
        { ...source, id: "attraction-explicit", category: "attraction", petPolicy: { ...source.petPolicy, sourceText: "실내 동반 가능" } },
        { ...source, id: "attraction-restricted", category: "attraction", petPolicy: { ...source.petPolicy, sourceText: "실내 전시관은 출입 제한. 야외 공간은 동반 가능." } },
      ],
      auxiliaryPlaces: [],
    };

    const page = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, preparationFilters: ["indoor"] });
    expect(page.results.map((result) => result.place.id).sort()).toEqual(["attraction-explicit", "cafe-whole"]);
  });

  it("uses live accessibility ids for the accessible place set when provided", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 3,
      places: [
        { ...source, id: "acc-live", name: "실제 접근성 장소" },
        { ...source, id: "acc-other", name: "일반 장소" },
        { ...source, id: "acc-third", name: "다른 장소" },
      ],
      auxiliaryPlaces: [],
    };

    const page = buildCatalogPage(snapshot, {
      hard: [],
      preferences: [],
      page: 1,
      placeSet: "accessible",
      accessiblePlaceIds: new Set(["acc-live"]),
    });
    expect(page.results.map((result) => result.place.id)).toEqual(["acc-live"]);
  });

  it("adds name-matched night landmarks and ignores mall tower shops", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 4,
      places: [
        { ...source, id: "night-beach", name: "광안리해수욕장", category: "attraction" },
        { ...source, id: "night-tower-shop", name: "올리브영 타워팰리스점", category: "shopping" },
        { ...source, id: "night-beach-shop", name: "다비치안경 해운대해수욕장입구점", category: "shopping" },
        { ...source, id: "night-ordinary", name: "동네 식당", category: "restaurant" },
        { ...source, id: "night-curated", name: "여의도한강공원", category: "attraction" },
      ],
      auxiliaryPlaces: [],
    };

    const page = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, placeSet: "night-spots" });
    expect(page.results.map((result) => result.place.id).sort()).toEqual(["night-beach", "night-curated"]);
  });

  it("restricts results to the curated night-spot place set when requested", async () => {
    const fixture = await new FixturePlaceProvider().getSnapshot();
    const source = fixture.places[0]!;
    const snapshot: ProviderSnapshot = {
      ...fixture,
      sourceTotalCount: 3,
      places: [
        { ...source, id: "tour-api:1059479", name: "여의도한강공원", address: "서울특별시 영등포구 여의동로 330" },
        { ...source, id: "catalog-ordinary-1", name: "동네 카페" },
        { ...source, id: "catalog-ordinary-2", name: "시장" },
      ],
      auxiliaryPlaces: [],
    };

    const unfiltered = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1 });
    expect(unfiltered.filteredCount).toBe(3);

    const nightPage = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, placeSet: "night-spots" });
    expect(nightPage.filteredCount).toBe(1);
    expect(nightPage.results.map((result) => result.place.id)).toEqual(["tour-api:1059479"]);
    expect(nightPage.results.map((result) => result.place.name)).toEqual(["여의도한강공원"]);

    const combined = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1, placeSet: "night-spots", region: "서울" });
    expect(combined.filteredCount).toBe(1);
  });
});
