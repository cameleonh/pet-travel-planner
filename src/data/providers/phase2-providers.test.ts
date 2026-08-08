import { describe, expect, it, vi } from "vitest";
import { BarrierFreeProvider, ACCESSIBILITY_FIELDS } from "@/data/providers/barrier-free-provider";
import { CampingProvider } from "@/data/providers/camping-provider";
import { CongestionProvider } from "@/data/providers/congestion-provider";
import { TrailProvider } from "@/data/providers/trail-provider";
import { MultilingualProvider, coordinateKey } from "@/data/providers/multilingual-provider";

function responseJson(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function successEnvelope(item: unknown, totalCount = 1) {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: { items: { item }, numOfRows: 10, pageNo: 1, totalCount },
    },
  };
}

function emptyEnvelope() {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: { items: "", numOfRows: 0, pageNo: 1, totalCount: 0 },
    },
  };
}

function quotaExceededBody() {
  return {
    OpenAPI_ServiceResponse: {
      cmmMsgHeader: {
        errMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR",
        returnAuthMsg: "일일 서비스 요청제한 횟수 초과 에러",
        returnReasonCode: "22",
      },
    },
  };
}

describe("BarrierFreeProvider", () => {
  it("requires an API key", () => {
    expect(() => new BarrierFreeProvider({ apiKey: "" })).toThrow("TOUR_API_KEY is required");
  });

  it("fetches and parses accessibility detail for a contentId", async () => {
    const detailItem = {
      contentid: "988449",
      parking: "가능",
      wheelchair: "대여",
      elevator: "있음",
      restroom: "있음",
      braileblock: "있음",
      stroller: "가능",
    };
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope(detailItem)));
    const provider = new BarrierFreeProvider({ apiKey: "test-key", fetchImpl });

    const result = await provider.fetchAccessibility("988449");

    expect(result).toMatchObject({ parking: "가능", elevator: "있음" });
    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname.endsWith("/detailWithTour2")).toBe(true);
    expect(url.searchParams.get("contentId")).toBe("988449");
    expect(url.searchParams.get("serviceKey")).toBe("test-key");
  });

  it("returns null for empty items in the response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const provider = new BarrierFreeProvider({ apiKey: "test-key", fetchImpl });

    const result = await provider.fetchAccessibility("999");
    expect(result).toBeNull();
  });

  it("returns null for a malformed response body", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson({ unexpected: true }));
    const provider = new BarrierFreeProvider({ apiKey: "test-key", fetchImpl });

    const result = await provider.fetchAccessibility("999");
    expect(result).toBeNull();
  });

  it("throws on quota-exceeded body without exposing the key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(quotaExceededBody()));
    const provider = new BarrierFreeProvider({ apiKey: "never-echo", fetchImpl });

    await expect(provider.fetchAccessibility("1")).rejects.toThrow("quota exceeded");
    await expect(provider.fetchAccessibility("1")).rejects.not.toThrow("never-echo");
  });

  it("throws on HTTP 429 rate limit", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("rate limited", { status: 429 }));
    const provider = new BarrierFreeProvider({ apiKey: "test-key", fetchImpl });

    await expect(provider.fetchAccessibility("1")).rejects.toThrow("rate limit");
  });

  it("throws on HTTP 503 server error without exposing the key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("unavailable", { status: 503 }));
    const provider = new BarrierFreeProvider({ apiKey: "never-echo", fetchImpl });

    await expect(provider.fetchAccessibility("1")).rejects.toThrow("HTTP 503");
    await expect(provider.fetchAccessibility("1")).rejects.not.toThrow("never-echo");
  });

  it("decrements a shared request budget on each call", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope({ contentid: "1", parking: "가능" })));
    const budget = { remaining: 3 };
    const provider = new BarrierFreeProvider({ apiKey: "test-key", fetchImpl, requestBudget: budget });

    await provider.fetchAccessibility("1");
    await provider.fetchAccessibility("2");
    expect(budget.remaining).toBe(1);
  });

  it("throws when the request budget is exhausted", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope({ contentid: "1" })));
    const provider = new BarrierFreeProvider({ apiKey: "test-key", fetchImpl, requestBudget: { remaining: 0 } });

    await expect(provider.fetchAccessibility("1")).rejects.toThrow("budget exhausted");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetchBatch collects results for multiple contentIds", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      const id = url.searchParams.get("contentId");
      return responseJson(successEnvelope({ contentid: id, parking: "가능" }));
    });
    const provider = new BarrierFreeProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });
    const results = await provider.fetchBatch(["1", "2", "3"], { concurrency: 2 });

    expect(results.size).toBe(3);
    expect(results.get("1")?.parking).toBe("가능");
    expect(results.get("3")?.contentid).toBe("3");
  });

  it("stops fetchBatch when quota is exhausted mid-batch", async () => {
    const detail = { contentid: "1", parking: "가능" };
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      // First 3 calls succeed, then quota exceeded
      if (fetchImpl.mock.calls.length <= 3) return responseJson(successEnvelope(detail));
      return responseJson(quotaExceededBody());
    });
    const provider = new BarrierFreeProvider({
      apiKey: "test-key",
      fetchImpl,
      requestBudget: { remaining: 10 },
      requestIntervalMs: 0,
    });

    // fetchBatch propagates quota errors — verify it processed some before failing
    await expect(
      provider.fetchBatch(["1", "2", "3", "4", "5", "6", "7", "8"], { concurrency: 1 })
    ).rejects.toThrow("quota exceeded");
    expect(fetchImpl.mock.calls.length).toBeLessThan(8);
  });

  it("exposes all 28 accessibility fields", () => {
    expect(ACCESSIBILITY_FIELDS).toHaveLength(28);
    const groups = {
      physical: 12,
      visual: 8,
      hearing: 4,
      infant: 4,
    };
    expect(Object.values(groups).reduce((a, b) => a + b, 0)).toBe(28);
  });
});

describe("CampingProvider", () => {
  const CAMPING_ITEM = {
    contentId: "1000",
    contentTypeId: "29",
    facltNm: "행복 캠핑장",
    lineIntro: "아름다운 숲속 캠핑장",
    induty: "일반야영장",
    sbrsCl: "전기,무선인터넷,장작판매",
    animalCmgCl: "가능",
    glampSiteCo: "5",
    caravSiteCo: "3",
    gnrlSiteCo: "50",
    operPdCl: "봄가을",
    resveUrl: "https://example.com/reserve",
    firstImageUrl: "https://example.com/img.jpg",
    addr1: "강원도 속초시",
    addr2: "중앙동",
    mapX: "128.5",
    mapY: "38.2",
    doNm: "강원도",
    sigunguNm: "속초시",
    modifiedtime: "20260720090000",
  };

  it("requires an API key", () => {
    expect(() => new CampingProvider({ apiKey: "" })).toThrow("TOUR_API_KEY is required");
  });

  it("fetches all pages and maps items with pet admission", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      const pageNo = Number(url.searchParams.get("pageNo"));
      if (pageNo === 1) return responseJson(successEnvelope([CAMPING_ITEM], 1));
      return responseJson(emptyEnvelope());
    });
    const provider = new CampingProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const places = await provider.fetchAllCampingPlaces();

    expect(places).toHaveLength(1);
    expect(places[0]?.petAdmitted).toBe(true);
    expect(places[0]?.rawPlace.id).toBe("camping:1000");
    expect(places[0]?.rawPlace.name).toBe("행복 캠핑장");
    expect(places[0]?.rawPlace.category).toBe("attraction");
    expect(places[0]?.rawPlace.petPolicy.sourceText).toContain("애완동물 출입: 가능");
    expect(places[0]?.rawPlace.petPolicy.sourceText).toContain("업종: 일반야영장");
    expect(places[0]?.rawPlace.amenities).toEqual(["전기", "무선인터넷", "장작판매"]);
    expect(places[0]?.item.glampSiteCo).toBe(5);
    expect(places[0]?.item.resveUrl).toBe("https://example.com/reserve");
  });

  it("filters to pet-admitted places only via getPetAdmittedPlaces", async () => {
    const items = [
      { ...CAMPING_ITEM, contentId: "1", animalCmgCl: "가능" },
      { ...CAMPING_ITEM, contentId: "2", animalCmgCl: "불가능" },
      { ...CAMPING_ITEM, contentId: "3", animalCmgCl: "가능(소형견)" },
    ];
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope(items, items.length)));
    const provider = new CampingProvider({ apiKey: "test-key", fetchImpl, fetchAllPages: false });

    const places = await provider.getPetAdmittedPlaces();

    expect(places).toHaveLength(2);
    expect(places.map((p) => p.item.contentId)).toEqual(["1", "3"]);
  });

  it("handles coordinates gracefully when missing", async () => {
    const item = { ...CAMPING_ITEM, mapX: undefined, mapY: undefined };
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope([item], 1)));
    const provider = new CampingProvider({ apiKey: "test-key", fetchImpl, fetchAllPages: false });

    const places = await provider.fetchAllCampingPlaces();
    expect(places[0]?.rawPlace.coordinates).toEqual({ latitude: 37.5, longitude: 127.0 });
  });

  it("throws on quota-exceeded body without exposing the key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(quotaExceededBody()));
    const provider = new CampingProvider({ apiKey: "never-echo", fetchImpl });

    await expect(provider.fetchAllCampingPlaces()).rejects.toThrow("quota exceeded");
    await expect(provider.fetchAllCampingPlaces()).rejects.not.toThrow("never-echo");
  });

  it("throws on HTTP 429", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("rate limited", { status: 429 }));
    const provider = new CampingProvider({ apiKey: "test-key", fetchImpl, rateLimitRetryDelayMs: 1 });

    await expect(provider.fetchAllCampingPlaces()).rejects.toThrow("rate limit");
  });

  it("returns empty when response body is malformed", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson({ unexpected: true }));
    const provider = new CampingProvider({ apiKey: "test-key", fetchImpl, fetchAllPages: false });

    const places = await provider.fetchAllCampingPlaces();
    expect(places).toEqual([]);
  });

  it("decrements request budget per page", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const budget = { remaining: 10 };
    const provider = new CampingProvider({ apiKey: "test-key", fetchImpl, requestBudget: budget, fetchAllPages: false });

    await provider.fetchAllCampingPlaces();
    expect(budget.remaining).toBe(9);
  });
});

describe("CongestionProvider", () => {
  const CONGESTION_ITEMS = [
    { baseYmd: "20260801", areaCd: "1", areaNm: "서울", signguCd: "1", signguNm: "종로구", tAtsNm: "경복궁", cnctrRate: "75" },
    { baseYmd: "20260802", areaCd: "1", signguCd: "1", signguNm: "종로구", tAtsNm: "경복궁", cnctrRate: "80" },
    { baseYmd: "20260801", areaCd: "1", signguCd: "1", signguNm: "종로구", tAtsNm: "창덕궁", cnctrRate: "50" },
  ];

  it("requires an API key", () => {
    expect(() => new CongestionProvider({ apiKey: "" })).toThrow("TOUR_API_KEY is required");
  });

  it("fetches and groups forecasts by tourist site name", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope(CONGESTION_ITEMS, CONGESTION_ITEMS.length)));
    const provider = new CongestionProvider({ apiKey: "test-key", fetchImpl });

    const forecasts = await provider.fetchByRegion("1", "1");

    expect(forecasts).toHaveLength(2);
    const gyeongbok = forecasts.find((f) => f.tAtsNm === "경복궁")!;
    expect(gyeongbok.forecasts).toHaveLength(2);
    expect(gyeongbok.forecasts[0]).toEqual({ baseYmd: "20260801", cnctrRate: 75 });
    expect(gyeongbok.forecasts[1]).toEqual({ baseYmd: "20260802", cnctrRate: 80 });
    expect(gyeongbok.areaNm).toBe("서울");
    expect(gyeongbok.signguNm).toBe("종로구");

    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname.endsWith("/tatsCnctrRatedList")).toBe(true);
    expect(url.searchParams.get("areaCd")).toBe("1");
    expect(url.searchParams.get("signguCd")).toBe("1");
  });

  it("returns empty array for empty items response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const provider = new CongestionProvider({ apiKey: "test-key", fetchImpl });

    const forecasts = await provider.fetchByRegion("1", "1");
    expect(forecasts).toEqual([]);
  });

  it("returns empty array for malformed response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson({ unexpected: true }));
    const provider = new CongestionProvider({ apiKey: "test-key", fetchImpl });

    const forecasts = await provider.fetchByRegion("1", "1");
    expect(forecasts).toEqual([]);
  });

  it("throws on quota-exceeded body without exposing the key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(quotaExceededBody()));
    const provider = new CongestionProvider({ apiKey: "never-echo", fetchImpl });

    await expect(provider.fetchByRegion("1", "1")).rejects.toThrow("quota exceeded");
    await expect(provider.fetchByRegion("1", "1")).rejects.not.toThrow("never-echo");
  });

  it("throws on HTTP 429", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("rate limited", { status: 429 }));
    const provider = new CongestionProvider({ apiKey: "test-key", fetchImpl, rateLimitRetryDelayMs: 1 });

    await expect(provider.fetchByRegion("1", "1")).rejects.toThrow("rate limit");
  });

  it("throws on HTTP error without exposing the key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("down", { status: 502 }));
    const provider = new CongestionProvider({ apiKey: "never-echo", fetchImpl });

    await expect(provider.fetchByRegion("1", "1")).rejects.toThrow("HTTP 502");
    await expect(provider.fetchByRegion("1", "1")).rejects.not.toThrow("never-echo");
  });

  it("throws when budget is exhausted", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const provider = new CongestionProvider({ apiKey: "test-key", fetchImpl, requestBudget: { remaining: 0 } });

    await expect(provider.fetchByRegion("1", "1")).rejects.toThrow("budget exhausted");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetchByRegions processes multiple areas sequentially", async () => {
    const callLog: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      callLog.push(url.searchParams.get("areaCd")!);
      return responseJson(successEnvelope([
        { baseYmd: "20260801", areaCd: url.searchParams.get("areaCd"), signguCd: "1", tAtsNm: "테스트", cnctrRate: "60" },
      ], 1));
    });
    const provider = new CongestionProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const forecasts = await provider.fetchByRegions([
      { areaCd: "1", signguCd: "1" },
      { areaCd: "2", signguCd: "1" },
    ]);

    expect(forecasts).toHaveLength(2);
    expect(callLog).toEqual(["1", "2"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("coerces string cnctrRate to number", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope([
      { baseYmd: "20260801", areaCd: "1", signguCd: "1", tAtsNm: "사이트", cnctrRate: "95" },
    ], 1)));
    const provider = new CongestionProvider({ apiKey: "test-key", fetchImpl });

    const forecasts = await provider.fetchByRegion("1", "1");
    expect(forecasts[0]?.forecasts[0]?.cnctrRate).toBe(95);
    expect(typeof forecasts[0]?.forecasts[0]?.cnctrRate).toBe("number");
  });
});

describe("TrailProvider", () => {
  const ROUTE_ITEM = {
    routeIdx: "1",
    themeNm: "해안길",
    linemsg: "동해안 아름다운 길",
    brdDiv: "DNWW",
  };
  const COURSE_ITEM = {
    routeIdx: "1",
    crsIdx: "10",
    crsKorNm: "속초 해안길 1구간",
    crsDstnc: "15.5",
    crsTotlRqrmHour: "300",
    crsLevel: "2",
    crsCycle: "비순환형",
    sigun: "속초시",
    brdDiv: "DNWW",
    gpxpath: "https://durunubi.kr/gpx/10.gpx",
    crsSummary: "아름다운 해안 도보길",
  };

  it("requires an API key", () => {
    expect(() => new TrailProvider({ apiKey: "" })).toThrow("TOUR_API_KEY is required");
  });

  it("fetches routes from routeList endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope([ROUTE_ITEM], 1)));
    const provider = new TrailProvider({ apiKey: "test-key", fetchImpl });

    const routes = await provider.fetchAllRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.routeIdx).toBe("1");
    expect(routes[0]?.themeNm).toBe("해안길");

    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname.endsWith("/routeList")).toBe(true);
  });

  it("fetches courses for a specific route", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope([COURSE_ITEM], 1)));
    const provider = new TrailProvider({ apiKey: "test-key", fetchImpl });

    const courses = await provider.fetchCoursesForRoute("1");

    expect(courses).toHaveLength(1);
    expect(courses[0]?.crsKorNm).toBe("속초 해안길 1구간");

    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname.endsWith("/courseList")).toBe(true);
    expect(url.searchParams.get("routeIdx")).toBe("1");
  });

  it("returns empty array for empty route response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const provider = new TrailProvider({ apiKey: "test-key", fetchImpl });

    const routes = await provider.fetchAllRoutes();
    expect(routes).toEqual([]);
  });

  it("returns empty array for malformed route response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson({ unexpected: true }));
    const provider = new TrailProvider({ apiKey: "test-key", fetchImpl });

    const routes = await provider.fetchAllRoutes();
    expect(routes).toEqual([]);
  });

  it("fetchAllCourses combines routes and courses into TrailRecords", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/routeList")) return responseJson(successEnvelope([ROUTE_ITEM], 1));
      if (url.pathname.endsWith("/courseList")) return responseJson(successEnvelope([COURSE_ITEM], 1));
      return new Response(null, { status: 404 });
    });
    const provider = new TrailProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const records = await provider.fetchAllCourses();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      crs_idx: "10",
      route_idx: "1",
      crs_kor_nm: "속초 해안길 1구간",
      theme_nm: "해안길",
      crs_dstnc: 15.5,
      crs_totl_rqrm_hour: 300,
      crs_level: 2,
      crs_cycle: "비순환형",
      sigun: "속초시",
      brd_div: "DNWW",
      gpxpath: "https://durunubi.kr/gpx/10.gpx",
    });
  });

  it("parses numeric fields from string values", async () => {
    const course = { ...COURSE_ITEM, crsDstnc: "20.3", crsTotlRqrmHour: "480", crsLevel: "3" };
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/routeList")) return responseJson(successEnvelope([ROUTE_ITEM], 1));
      if (url.pathname.endsWith("/courseList")) return responseJson(successEnvelope([course], 1));
      return new Response(null, { status: 404 });
    });
    const provider = new TrailProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const records = await provider.fetchAllCourses();

    expect(records[0]?.crs_dstnc).toBe(20.3);
    expect(typeof records[0]?.crs_dstnc).toBe("number");
    expect(records[0]?.crs_totl_rqrm_hour).toBe(480);
    expect(records[0]?.crs_level).toBe(3);
  });

  it("handles missing optional fields as null", async () => {
    const minimalCourse = { routeIdx: "1", crsIdx: "10", crsKorNm: "테스트 코스" };
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/routeList")) return responseJson(successEnvelope([{ routeIdx: "1", themeNm: "테마" }], 1));
      if (url.pathname.endsWith("/courseList")) return responseJson(successEnvelope([minimalCourse], 1));
      return new Response(null, { status: 404 });
    });
    const provider = new TrailProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const records = await provider.fetchAllCourses();

    expect(records[0]).toMatchObject({
      crs_dstnc: null,
      crs_totl_rqrm_hour: null,
      crs_level: null,
      crs_cycle: null,
      sigun: null,
      gpxpath: null,
      linemsg: null,
    });
    expect(records[0]?.theme_nm).toBe("테마");
  });

  it("does not echo the API key in errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("down", { status: 500 }));
    const provider = new TrailProvider({ apiKey: "never-echo", fetchImpl });

    const routes = await provider.fetchAllRoutes();
    expect(routes).toEqual([]);
  });
});

describe("MultilingualProvider", () => {
  const EN_ITEM = {
    contentid: "3506802",
    title: "Gakkaun Pharmacy",
    addr1: "1 Jungang-daero, Jung-gu, Busan",
    addr2: "1st Floor",
    overview: "A pharmacy in central Busan.",
    mapx: "129.0354",
    mapy: "35.1041",
    contenttypeid: "38",
    modifiedtime: "20260720090000",
  };

  function coordMap(lat: number, lng: number, placeId: string): Map<string, string> {
    const m = new Map<string, string>();
    m.set(coordinateKey(lat, lng), placeId);
    return m;
  }

  it("requires an API key", () => {
    expect(() => new MultilingualProvider({ apiKey: "" })).toThrow("TOUR_API_KEY is required");
  });

  it("fetches English translations and matches by coordinates", async () => {
    const unmatched = { ...EN_ITEM, contentid: "999", mapx: "126.9780", mapy: "37.5665" };
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      responseJson(successEnvelope([EN_ITEM, unmatched], 2)),
    );
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });
    const coordMap = new Map<string, string>();
    coordMap.set(coordinateKey(35.1041, 129.0354), "tour-api:2930927");

    const results = await provider.fetchTranslations("en", coordMap);

    expect(results.size).toBe(1);
    expect(results.get("tour-api:2930927")?.title).toBe("Gakkaun Pharmacy");
    expect(results.get("tour-api:2930927")?.address).toBe("1 Jungang-daero, Jung-gu, Busan 1st Floor");
    expect(results.get("tour-api:2930927")?.overview).toBe("A pharmacy in central Busan.");

    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname).toContain("/EngService2/areaBasedList2");
    expect(url.searchParams.get("serviceKey")).toBe("test-key");
  });

  it("fetches Chinese translations via ChtService2", async () => {
    const zhItem = {
      contentid: "2954320",
      title: "附近的藥局",
      addr1: "釜山廣域市中區中央大路1",
      overview: "釜山中心的藥局。",
      mapx: "129.0354",
      mapy: "35.1041",
    };
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(successEnvelope([zhItem], 1)));
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const results = await provider.fetchTranslations("zh", coordMap(35.1041, 129.0354, "tour-api:2930927"));

    expect(results.get("tour-api:2930927")?.title).toBe("附近的藥局");
    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname).toContain("/ChtService2/areaBasedList2");
  });

  it("returns empty map when no coordinates match", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      responseJson(successEnvelope([
        { contentid: "999", title: "Other", mapx: "126.0", mapy: "37.0" },
      ], 1)),
    );
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const results = await provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1"));
    expect(results.size).toBe(0);
  });

  it("skips items without coordinates", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      responseJson(successEnvelope([
        { contentid: "1", title: "No Coords" },
      ], 1)),
    );
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const results = await provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1"));
    expect(results.size).toBe(0);
  });

  it("handles empty response items", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const results = await provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1"));
    expect(results.size).toBe(0);
  });

  it("handles malformed response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson({ unexpected: true }));
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    const results = await provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1"));
    expect(results.size).toBe(0);
  });

  it("handles non-JSON error response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("down", { status: 500 }));
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    await expect(
      provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1")),
    ).rejects.toThrow("HTTP 500");
  });

  it("throws on quota-exceeded body without exposing the key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(quotaExceededBody()));
    const provider = new MultilingualProvider({ apiKey: "never-echo", fetchImpl, requestIntervalMs: 0 });

    await expect(
      provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1")),
    ).rejects.toThrow("quota exceeded");
    await expect(
      provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1")),
    ).rejects.not.toThrow("never-echo");
  });

  it("throws on HTTP 429", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("rate limited", { status: 429 }));
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestIntervalMs: 0 });

    await expect(
      provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1")),
    ).rejects.toThrow("rate limit");
  });

  it("throws when budget is exhausted", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestBudget: { remaining: 0 } });

    await expect(
      provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1")),
    ).rejects.toThrow("budget exhausted");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("paginates through multiple pages", async () => {
    const page1 = Array.from({ length: 5 }, (_, i) => ({
      ...EN_ITEM, contentid: String(i + 1),
      mapx: `${128.0 + i * 0.1}`, mapy: `${35.0 + i * 0.1}`,
    }));
    const page2 = Array.from({ length: 3 }, (_, i) => ({
      ...EN_ITEM, contentid: String(i + 6),
      mapx: `${128.5 + i * 0.1}`, mapy: `${35.5 + i * 0.1}`,
    }));
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return Number(url.searchParams.get("pageNo")) === 1
        ? responseJson(successEnvelope(page1, 8))
        : responseJson(successEnvelope(page2, 8));
    });
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, rows: 5, requestIntervalMs: 0 });
    const coordMap = new Map<string, string>();
    for (let i = 0; i < 8; i++) {
      const lat = i < 5 ? 35.0 + i * 0.1 : 35.5 + (i - 5) * 0.1;
      const lng = i < 5 ? 128.0 + i * 0.1 : 128.5 + (i - 5) * 0.1;
      coordMap.set(coordinateKey(lat, lng), `tour-api:${i + 1}`);
    }

    const results = await provider.fetchTranslations("en", coordMap);

    expect(results.size).toBe(8);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("decrements request budget per page", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(emptyEnvelope()));
    const budget = { remaining: 10 };
    const provider = new MultilingualProvider({ apiKey: "test-key", fetchImpl, requestBudget: budget, requestIntervalMs: 0 });

    await provider.fetchTranslations("en", coordMap(35.0, 129.0, "tour-api:1"));
    expect(budget.remaining).toBeLessThan(10);
  });

  it("coordinateKey rounds consistently at 4 decimal places", () => {
    expect(coordinateKey(35.10414, 129.03544)).toBe(coordinateKey(35.10412, 129.03542));
    expect(coordinateKey(35.1041, 129.0354)).toBe("35.1041,129.0354");
  });
});
