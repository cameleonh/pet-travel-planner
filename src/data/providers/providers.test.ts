import { describe, expect, it, vi } from "vitest";
import { providerSnapshotSchema } from "@/data/contracts";
import { selectPlaceProvider } from "@/data/providers";
import { FixturePlaceProvider } from "@/data/providers/fixture-provider";
import { ProviderConfigurationError } from "@/data/providers/provider";
import { TourApiPlaceProvider } from "@/data/providers/tour-api-provider";

const LIST_ITEM = {
  addr1: "부산광역시 중구 중앙대로 1",
  addr2: "1층",
  contentid: "2930927",
  contenttypeid: "38",
  mapx: "129.0354",
  mapy: "35.1041",
  title: "가까운약국",
  modifiedtime: "20260716090000",
};

function successEnvelope(item: unknown, totalCount = 1) {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: { items: { item }, numOfRows: 10, pageNo: 1, totalCount },
    },
  };
}

function responseJson(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("place providers", () => {
  it("parses deterministic fixture data without a network request", async () => {
    const snapshot = await new FixturePlaceProvider().getSnapshot();
    expect(snapshot.provider).toBe("fixture");
    expect(snapshot.places.map((place) => place.id)).toEqual(["fixture-attraction-001", "fixture-cafe-001"]);
  });

  it("activates safe fixture fallback for an unsupported provider mode", () => {
    const selection = selectPlaceProvider({ DATA_PROVIDER: "unexpected" });
    expect(selection.provider.name).toBe("fixture");
    expect(selection.notice).toContain("Unsupported DATA_PROVIDER");
  });

  it("fails closed when live mode has no issued credential", () => {
    expect(() => selectPlaceProvider({ DATA_PROVIDER: "tour-api" })).toThrow(ProviderConfigurationError);
  });

  it("selects the database provider without requiring a live API credential", () => {
    const selection = selectPlaceProvider({ DATA_PROVIDER: "database", DATABASE_PATH: ":memory:" });
    expect(selection.provider.name).toBe("database");
  });

  it("maps official list and pet-detail responses without re-encoding the decoded key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/areaBasedList2")) return responseJson(successEnvelope([LIST_ITEM]));
      if (url.pathname.endsWith("/detailPetTour2")) {
        return responseJson(successEnvelope([{ contentid: "2930927", acmpyTypeCd: "전구역 동반가능", acmpyPsblCpam: "모든 크기 반려견", acmpyNeedMtr: "목줄 착용" }]));
      }
      return new Response(null, { status: 404 });
    });
    const now = () => new Date("2026-07-16T02:00:00.000Z");
    const provider = new TourApiPlaceProvider({ apiKey: "decoded+/=key", fetchImpl, now });

    const snapshot = await provider.getSnapshot();
    const requestedUrls = fetchImpl.mock.calls.map(([input]) => new URL(String(input)));

    expect(snapshot).toMatchObject({
      provider: "tour-api",
      fetchedAt: "2026-07-16T02:00:00.000Z",
      auxiliaryPlaces: [],
      places: [{
        id: "tour-api:2930927",
        name: "가까운약국",
        category: "shopping",
        address: "부산광역시 중구 중앙대로 1 1층",
        coordinates: { latitude: 35.1041, longitude: 129.0354 },
        petPolicy: {
          label: "한국관광공사 반려동물 동반여행 서비스",
          observedAt: "2026-07-16T02:00:00.000Z",
        },
      }],
    });
    expect(snapshot.places[0]?.petPolicy.sourceText).toContain("동반 유형: 전구역 동반가능");
    expect(snapshot.places[0]?.petPolicy.sourceText).toContain("동반 필요 사항: 목줄 착용");
    expect(requestedUrls.every((url) => url.searchParams.get("serviceKey") === "decoded+/=key")).toBe(true);
    expect(requestedUrls[0]?.pathname.endsWith("/areaBasedList2")).toBe(true);
    expect(requestedUrls[1]?.searchParams.get("contentId")).toBe("2930927");
  });

  it("uses the official fine category to distinguish cafes from restaurants", async () => {
    const items = [
      { ...LIST_ITEM, contentid: "cafe", contenttypeid: "39", cat3: "A05020900", title: "바다 카페" },
      { ...LIST_ITEM, contentid: "restaurant", contenttypeid: "39", cat3: "A05020100", title: "바다 식당" },
    ];
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope(items, items.length))
        : responseJson(successEnvelope([{ contentid: url.searchParams.get("contentId"), acmpyTypeCd: "전구역 동반가능" }]));
    });

    const snapshot = await new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl }).getSnapshot();

    expect(snapshot.places.map((place) => [place.name, place.category])).toEqual([
      ["바다 카페", "cafe"],
      ["바다 식당", "restaurant"],
    ]);
  });

  it("isolates a pet-detail failure instead of discarding the list item", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope([LIST_ITEM]))
        : new Response("unavailable", { status: 503 });
    });
    const provider = new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl });

    const snapshot = await provider.getSnapshot();

    expect(snapshot.places).toHaveLength(1);
    expect(snapshot.places[0]?.petPolicy.sourceText).toBe("반려동물 동반 상세정보 미제공");
  });

  it("bounds concurrent pet-detail requests while preserving list order", async () => {
    let active = 0;
    let maximum = 0;
    const list = Array.from({ length: 7 }, (_, index) => ({ ...LIST_ITEM, contentid: String(index + 1), title: `장소 ${index + 1}` }));
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/areaBasedList2")) return responseJson(successEnvelope(list, list.length));
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return responseJson(successEnvelope([{ contentid: url.searchParams.get("contentId"), acmpyNeedMtr: "목줄 착용" }]));
    });
    const provider = new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, rows: 7, detailConcurrency: 3 });
    const snapshot = await provider.getSnapshot();
    expect(maximum).toBeLessThanOrEqual(3);
    expect(snapshot.places.map((place) => place.name)).toEqual(list.map((item) => item.title));
  });

  it("fetches every list page, reuses unchanged detail, and spends only the configured detail budget", async () => {
    const items = Array.from({ length: 5 }, (_, index) => ({ ...LIST_ITEM, contentid: String(index + 1), title: `장소 ${index + 1}` }));
    const cachedSnapshot = await new FixturePlaceProvider().getSnapshot();
    const cached = {
      ...cachedSnapshot.places[0]!,
      id: "tour-api:1",
      name: "장소 1",
      sourceModifiedAt: LIST_ITEM.modifiedtime,
      petDetailStatus: "fetched" as const,
    };
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/areaBasedList2")) {
        const page = Number(url.searchParams.get("pageNo"));
        return responseJson(successEnvelope(items.slice((page - 1) * 2, page * 2), items.length));
      }
      return responseJson(successEnvelope([{ contentid: url.searchParams.get("contentId"), acmpyNeedMtr: "목줄 착용" }]));
    });
    const provider = new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, rows: 2, fetchAllPages: true, detailLimit: 2, cachedPlaces: [cached] });

    const snapshot = await provider.getSnapshot();
    const urls = fetchImpl.mock.calls.map(([input]) => new URL(String(input)));

    expect(snapshot.sourceTotalCount).toBe(5);
    expect(snapshot.places).toHaveLength(5);
    expect(urls.filter((url) => url.pathname.endsWith("/areaBasedList2"))).toHaveLength(3);
    expect(urls.filter((url) => url.pathname.endsWith("/detailPetTour2")).map((url) => url.searchParams.get("contentId"))).toEqual(["2", "3"]);
    expect(snapshot.places.map((place) => place.petDetailStatus)).toEqual(["fetched", "fetched", "fetched", "not-fetched", "not-fetched"]);
    expect(snapshot.places[0]?.petPolicy.observedAt).toBe(cached.petPolicy.observedAt);
  });

  it("refreshes cached detail when the source modification token changes", async () => {
    const cachedSnapshot = await new FixturePlaceProvider().getSnapshot();
    const cached = { ...cachedSnapshot.places[0]!, id: "tour-api:2930927", sourceModifiedAt: "20260101000000", petDetailStatus: "fetched" as const };
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope([LIST_ITEM]))
        : responseJson(successEnvelope([{ contentid: LIST_ITEM.contentid, acmpyNeedMtr: "목줄 착용" }]));
    });
    const provider = new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, detailLimit: 1, cachedPlaces: [cached] });
    await provider.getSnapshot();
    expect(fetchImpl.mock.calls.map(([input]) => String(input)).filter((url) => url.includes("detailPetTour2"))).toHaveLength(1);
  });

  it("preserves cached evidence and the old modification token when a changed row is deferred", async () => {
    const cachedSnapshot = await new FixturePlaceProvider().getSnapshot();
    const cachedPlaces = ["1", "2"].map((contentId) => ({
      ...cachedSnapshot.places[0]!,
      id: `tour-api:${contentId}`,
      name: `장소 ${contentId}`,
      amenities: [`기존 편의시설 ${contentId}`],
      sourceModifiedAt: "20260101000000",
      petDetailStatus: "fetched" as const,
    }));
    const items = cachedPlaces.map((place, index) => ({
      ...LIST_ITEM,
      contentid: String(index + 1),
      title: place.name,
      modifiedtime: "20260717090000",
    }));
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope(items, items.length))
        : responseJson(successEnvelope([{ contentid: url.searchParams.get("contentId"), acmpyNeedMtr: "새 정책" }]));
    });

    const snapshot = await new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, rows: 2, detailLimit: 1, cachedPlaces }).getSnapshot();

    expect(snapshot.places[1]).toMatchObject({
      sourceModifiedAt: "20260101000000",
      petDetailStatus: "fetched",
      amenities: ["기존 편의시설 2"],
      petPolicy: { sourceText: cachedPlaces[1]?.petPolicy.sourceText, observedAt: cachedPlaces[1]?.petPolicy.observedAt },
    });
  });

  it("preserves known fetched evidence when a changed-row refresh fails", async () => {
    const cachedSnapshot = await new FixturePlaceProvider().getSnapshot();
    const cached = {
      ...cachedSnapshot.places[0]!,
      id: "tour-api:2930927",
      sourceModifiedAt: "20260101000000",
      petDetailStatus: "fetched" as const,
    };
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope([LIST_ITEM]))
        : new Response("unavailable", { status: 503 });
    });

    const snapshot = await new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, detailLimit: 1, cachedPlaces: [cached] }).getSnapshot();

    expect(snapshot.places[0]).toMatchObject({
      sourceModifiedAt: cached.sourceModifiedAt,
      petDetailStatus: "fetched",
      petPolicy: { sourceText: cached.petPolicy.sourceText, observedAt: cached.petPolicy.observedAt },
    });
  });

  it("selects pending rows before retrying historical failures", async () => {
    const cachedSnapshot = await new FixturePlaceProvider().getSnapshot();
    const failed = {
      ...cachedSnapshot.places[0]!,
      id: "tour-api:1",
      name: "실패 장소",
      sourceModifiedAt: LIST_ITEM.modifiedtime,
      petDetailStatus: "failed" as const,
    };
    const items = [
      { ...LIST_ITEM, contentid: "1", title: "실패 장소" },
      { ...LIST_ITEM, contentid: "2", title: "미수집 장소" },
    ];
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope(items, items.length))
        : responseJson(successEnvelope([{ contentid: url.searchParams.get("contentId"), acmpyNeedMtr: "목줄 착용" }]));
    });

    const snapshot = await new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, rows: 2, detailLimit: 1, cachedPlaces: [failed] }).getSnapshot();
    const detailIds = fetchImpl.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/detailPetTour2"))
      .map((url) => url.searchParams.get("contentId"));

    expect(detailIds).toEqual(["2"]);
    expect(snapshot.places.map((place) => place.petDetailStatus)).toEqual(["failed", "fetched"]);
  });

  it("rotates retry candidates so one persistent failure cannot monopolize the budget", async () => {
    const cachedSnapshot = await new FixturePlaceProvider().getSnapshot();
    const failedPlaces = ["1", "2", "3"].map((contentId) => ({
      ...cachedSnapshot.places[0]!,
      id: `tour-api:${contentId}`,
      name: `실패 장소 ${contentId}`,
      sourceModifiedAt: LIST_ITEM.modifiedtime,
      petDetailStatus: "failed" as const,
    }));
    const items = failedPlaces.map((place, index) => ({ ...LIST_ITEM, contentid: String(index + 1), title: place.name }));
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope(items, items.length))
        : new Response("unavailable", { status: 503 });
    });

    await new TourApiPlaceProvider({
      apiKey: "issued-test-key",
      fetchImpl,
      rows: 3,
      detailLimit: 1,
      detailRetryOffset: 1,
      cachedPlaces: failedPlaces,
    }).getSnapshot();
    const detailIds = fetchImpl.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/detailPetTour2"))
      .map((url) => url.searchParams.get("contentId"));

    expect(detailIds).toEqual(["2"]);
  });

  it("stops scheduling detail requests and rejects the snapshot on quota exhaustion", async () => {
    const items = Array.from({ length: 3 }, (_, index) => ({ ...LIST_ITEM, contentid: String(index + 1), title: `장소 ${index + 1}` }));
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope(items, items.length))
        : responseJson({ response: { header: { resultCode: "22", resultMsg: "LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR." }, body: { items: "", numOfRows: 0, pageNo: 1, totalCount: 0 } } });
    });
    const provider = new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, rows: 3, detailConcurrency: 1 });

    await expect(provider.getSnapshot()).rejects.toThrow("result code 22");
    expect(fetchImpl.mock.calls.map(([input]) => String(input)).filter((url) => url.includes("detailPetTour2"))).toHaveLength(1);
  });

  it("enforces a shared local request budget across list and detail operations", async () => {
    const items = Array.from({ length: 3 }, (_, index) => ({ ...LIST_ITEM, contentid: String(index + 1), title: `장소 ${index + 1}` }));
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/areaBasedList2")
        ? responseJson(successEnvelope(items, items.length))
        : responseJson(successEnvelope([{ contentid: url.searchParams.get("contentId"), acmpyNeedMtr: "목줄 착용" }]));
    });
    const requestBudget = { remaining: 2 };
    const provider = new TourApiPlaceProvider({ apiKey: "issued-test-key", fetchImpl, rows: 3, detailConcurrency: 1, requestBudget });

    await expect(provider.getSnapshot()).rejects.toThrow("local request budget");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(requestBudget.remaining).toBe(0);
  });

  it("paces requests and retries one transient HTTP 429 without retrying provider quota code 22", async () => {
    let detailAttempts = 0;
    const waits: number[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/areaBasedList2")) return responseJson(successEnvelope([LIST_ITEM]));
      detailAttempts += 1;
      return detailAttempts === 1
        ? new Response("rate limited", { status: 429 })
        : responseJson(successEnvelope([{ contentid: LIST_ITEM.contentid, acmpyNeedMtr: "목줄 착용" }]));
    });
    const provider = new TourApiPlaceProvider({
      apiKey: "issued-test-key",
      fetchImpl,
      requestIntervalMs: 200,
      rateLimitRetryDelayMs: 2_000,
      sleep: async (milliseconds) => { waits.push(milliseconds); },
    });

    await expect(provider.getSnapshot()).resolves.toMatchObject({ places: [{ petDetailStatus: "fetched" }] });
    expect(detailAttempts).toBe(2);
    expect(waits).toContain(2_000);
  });

  it("fails closed on an upstream list error without echoing the credential", async () => {
    const provider = new TourApiPlaceProvider({
      apiKey: "never-echo-this-key",
      fetchImpl: async () => new Response("upstream unavailable", { status: 503 }),
    });
    const error = await provider.getSnapshot().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("status 503");
    expect((error as Error).message).not.toContain("never-echo-this-key");
  });

  it("rejects malformed official envelopes and impossible coordinates", async () => {
    const provider = new TourApiPlaceProvider({
      apiKey: "issued-test-key",
      fetchImpl: async () => responseJson({ response: { unexpected: true } }),
    });
    await expect(provider.getSnapshot()).rejects.toMatchObject({ name: "ZodError" });
    expect(providerSnapshotSchema.safeParse({
      provider: "fixture",
      fetchedAt: new Date().toISOString(),
      places: [],
      auxiliaryPlaces: [{ id: "broken", name: "Broken", category: "park", address: "Nowhere", coordinates: { latitude: 91, longitude: 0 }, petStatus: "unknown", evidence: { label: "source", sourceText: "unknown", sourceUrl: "https://example.test", observedAt: new Date().toISOString() } }],
    }).success).toBe(false);
  });

  it("accepts the official empty-items shape as valid empty data", async () => {
    const provider = new TourApiPlaceProvider({
      apiKey: "issued-test-key",
      fetchImpl: async () => responseJson({ response: { header: { resultCode: "0000", resultMsg: "OK" }, body: { items: "", numOfRows: 10, pageNo: 1, totalCount: 0 } } }),
    });
    await expect(provider.getSnapshot()).resolves.toMatchObject({ provider: "tour-api", places: [], auxiliaryPlaces: [] });
  });

  it("rejects a provider-level error code without exposing the credential", async () => {
    const provider = new TourApiPlaceProvider({
      apiKey: "never-echo-this-key",
      fetchImpl: async () => responseJson({ response: { header: { resultCode: "22", resultMsg: "LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR." }, body: { items: "", numOfRows: 0, pageNo: 1, totalCount: 0 } } }),
    });
    await expect(provider.getSnapshot()).rejects.toThrow("Tour API returned result code 22");
    await expect(provider.getSnapshot()).rejects.not.toThrow("never-echo-this-key");
  });
});
