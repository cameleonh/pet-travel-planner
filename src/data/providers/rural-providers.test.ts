import { describe, expect, it, vi } from "vitest";
import { VillageProvider, mapRecordsToVillages } from "@/data/providers/village-provider";
import { FarmstayProvider, tmCenterToWgs84, tmCenterToWgs84Safe } from "@/data/providers/farmstay-provider";

function villageRecord(overrides: Record<string, string> = {}) {
  return {
    "체험마을명": "무창포어촌체험휴양마을",
    "시도명": "충청남도",
    "시군구명": "보령시",
    "체험프로그램구분": "어촌생활체험+레포츠",
    "체험프로그램명": "바지락캐기+통발체험",
    "보유시설정보": "갯벌체험장",
    "소재지도로명주소": "충청남도 보령시 웅천읍 열린바다2길 46",
    "소재지지번주소": "",
    "대표전화번호": "041-936-3510",
    "지정일자": "2016-03-23",
    "홈페이지주소": "http://example.kr",
    "관리기관명": "한국어촌어항공단",
    "위도": "36.24844646",
    "경도": "126.5370377",
    "데이터기준일자": "2026-03-03",
    "제공기관코드": "B553968",
    "제공기관명": "한국어촌어항공단",
    ...overrides,
  };
}

describe("VillageProvider", () => {
  it("maps a fishing-village record with programs", () => {
    const villages = mapRecordsToVillages([villageRecord()]);
    expect(villages).toHaveLength(1);
    const village = villages[0]!;
    expect(village.village_kind).toBe("fishing");
    expect(village.name).toBe("무창포어촌체험휴양마을");
    expect(village.latitude).toBeCloseTo(36.24844646, 6);
    expect(village.longitude).toBeCloseTo(126.5370377, 6);
    expect(village.phone).toBe("041-936-3510");
    expect(village.programs).toEqual([
      { program_class: "어촌생활체험", program_name: "바지락캐기" },
      { program_class: "레포츠", program_name: "통발체험" },
    ]);
  });

  it("classifies 한국농어촌공사 records as farm villages", () => {
    const villages = mapRecordsToVillages([villageRecord({ "체험마을명": "산들내체험휴양마을", "제공기관명": "한국농어촌공사", "관리기관명": "한국농어촌공사" })]);
    expect(villages[0]!.village_kind).toBe("farm");
  });

  it("deduplicates villages by name", () => {
    const villages = mapRecordsToVillages([villageRecord(), villageRecord({ "소재지도로명주소": "충청남도 보령시 다른길 1" })]);
    expect(villages).toHaveLength(1);
  });

  it("skips records with missing coordinates or address", () => {
    const villages = mapRecordsToVillages([
      villageRecord({ "위도": "", "경도": "" }),
      villageRecord({ "체험마을명": "주소없음", "소재지도로명주소": "", "소재지지번주소": "" }),
      villageRecord({ "체험마을명": "좌표이상", "위도": "52.5", "경도": "13.4" }),
    ]);
    expect(villages).toHaveLength(0);
  });

  it("pairs unequal class/name lists by extending the last value", () => {
    const villages = mapRecordsToVillages([villageRecord({ "체험프로그램구분": "어촌생활체험", "체험프로그램명": "갯벌체험+낚시체험" })]);
    expect(villages[0]!.programs).toEqual([
      { program_class: "어촌생활체험", program_name: "갯벌체험" },
      { program_class: "어촌생활체험", program_name: "낚시체험" },
    ]);
  });

  it("does not split on plus signs inside parentheses", () => {
    const villages = mapRecordsToVillages([villageRecord({
      "체험프로그램구분": "레포츠",
      "체험프로그램명": "수상레포츠(요트+물총보트)+먹거리체험(문어빵)",
    })]);
    expect(villages[0]!.programs).toEqual([
      { program_class: "레포츠", program_name: "수상레포츠(요트+물총보트)" },
      { program_class: "레포츠", program_name: "먹거리체험(문어빵)" },
    ]);
  });

  it("loads and validates a standard-data JSON file", async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "village-test-"));
    const file = join(dir, "villages.json");
    writeFileSync(file, JSON.stringify({ fields: [{ id: "체험마을명" }], records: [villageRecord()] }), "utf8");
    try {
      const provider = new VillageProvider();
      const result = await provider.loadFromJsonFile(file);
      expect(result.rawCount).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.villages).toHaveLength(1);
      expect(result.villages[0]!.name).toBe("무창포어촌체험휴양마을");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects malformed JSON structure", async () => {
    const provider = new VillageProvider();
    await expect(provider.loadFromJsonFile("file:///nonexistent")).rejects.toThrow();
  });
});

describe("tmCenterToWgs84 (EPSG:5174 → WGS84)", () => {
  it("maps the false origin back near the central meridian origin", () => {
    const { latitude, longitude } = tmCenterToWgs84(200000, 500000);
    expect(Math.abs(latitude - 38.0)).toBeLessThan(0.02);
    expect(Math.abs(longitude - 127.00289)).toBeLessThan(0.02);
  });

  it("keeps Korean territory points inside the peninsula bbox", () => {
    const points = [
      [200000, 500000],
      [246000, 397000],
      [340000, 480000],
      [172000, 517000],
    ];
    for (const [x, y] of points) {
      const { latitude, longitude } = tmCenterToWgs84(x as number, y as number);
      expect(latitude).toBeGreaterThan(33);
      expect(latitude).toBeLessThan(39);
      expect(longitude).toBeGreaterThan(124);
      expect(longitude).toBeLessThan(132);
    }
  });

  it("moves east when x increases and north when y increases", () => {
    const base = tmCenterToWgs84(250000, 450000);
    const east = tmCenterToWgs84(260000, 450000);
    const north = tmCenterToWgs84(250000, 460000);
    expect(east.longitude).toBeGreaterThan(base.longitude);
    expect(north.latitude).toBeGreaterThan(base.latitude);
  });

  it("rejects null and out-of-range coordinates in the safe wrapper", () => {
    expect(tmCenterToWgs84Safe(null, 500000).latitude).toBeNull();
    expect(tmCenterToWgs84Safe(200000, null).longitude).toBeNull();
    expect(tmCenterToWgs84Safe(NaN, NaN).latitude).toBeNull();
    expect(tmCenterToWgs84Safe(2000000, 9000000).latitude).toBeNull();
  });
});

function responseJson(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function successEnvelope(item: unknown, totalCount = 1) {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: { items: { item }, numOfRows: 1000, pageNo: 1, totalCount },
    },
  };
}

describe("FarmstayProvider", () => {
  it("requires apiKey and baseUrl", () => {
    expect(() => new FarmstayProvider({ apiKey: "", baseUrl: "https://example" })).toThrow("FARMSTAY_API_KEY is required");
    expect(() => new FarmstayProvider({ apiKey: "k" })).toThrow("FARMSTAY_API_BASE_URL is required");
  });

  it("fetches all pages until totalCount", async () => {
    const page1 = successEnvelope([{ MNG_NO: "AGCV001", BPLC_NM: "A민박", ROAD_NM_ADDR: "충남 A시", CRD_INFO_X: "200000", CRD_INFO_Y: "500000" }], 2);
    const page2 = successEnvelope([{ MNG_NO: "AGCV002", BPLC_NM: "B민박", ROAD_NM_ADDR: "충남 B시", CRD_INFO_X: "210000", CRD_INFO_Y: "510000" }], 2);
    const fetchImpl = vi.fn<typeof fetch>(async (input) =>
      responseJson(new URL(String(input)).searchParams.get("pageNo") === "1" ? page1 : page2),
    );
    const provider = new FarmstayProvider({ apiKey: "test", baseUrl: "https://apis.example/1741000/rural_homestays", fetchImpl, sleep: async () => {}, rows: 1 });

    const items = await provider.fetchAllFarmstays();
    expect(items).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname.endsWith("/info")).toBe(true);
    expect(url.searchParams.get("serviceKey")).toBe("test");
  });

  it("surfaces portal error codes", async () => {
    const errorBody = {
      OpenAPI_ServiceResponse: {
        cmmMsgHeader: { errMsg: "NO_OPENAPI_SERVICE_ERROR", returnAuthMsg: "해당 오픈API 서비스가 없거나 폐기됨", returnReasonCode: "12" },
      },
    };
    const fetchImpl = vi.fn<typeof fetch>(async () => responseJson(errorBody, 400));
    const provider = new FarmstayProvider({ apiKey: "test", baseUrl: "https://apis.example/1741000/rural_homestays", fetchImpl, sleep: async () => {} });
    await expect(provider.fetchAllFarmstays()).rejects.toThrow("12");
  });
});
