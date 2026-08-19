import { z } from "zod";

const OFFICIAL_CATALOG_URL = "https://www.data.go.kr/data/15155113/openapi.do";

// EPSG:5174 (Bessel 중부원점 TM, 보정계수 미적용) → WGS84 근사 역변환.
// 횡메카토르 역산 후 Bessel→WGS84 데이텀 시프트를 적용한다. 오차는 수십 미터 수준이며,
// 민박 마커 표시용 좌표로는 충분하지만 "정확한 위치" 단정에는 쓰지 않는다.
const A = 6377483.865804072;          // Bessel 1841 장반경
const F = 1 / 299.1528128;            // Bessel 1841 역편평률
const E2 = 2 * F - F * F;

const ORIGIN_LON = 127.0028905555556; // 동경 127°00′10.4″
const ORIGIN_LAT = 38.0;
const FALSE_E = 200000;
const FALSE_N = 500000;
const K0 = 1.0;
const DEG = Math.PI / 180;

export function tmCenterToWgs84(x: number, y: number): { latitude: number; longitude: number } {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const M0 = meridianArc(ORIGIN_LAT);

  const M = M0 + (y - FALSE_N) / K0;
  const mu = M / (A * (1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 * E2 * E2 / 256));

  const e1sq = e1 * e1;
  const footLat = mu
    + (3 * e1 / 2 - 27 * e1sq * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1sq / 16 - 55 * e1sq * e1sq / 32) * Math.sin(4 * mu)
    + (151 * e1sq * e1 / 96) * Math.sin(6 * mu)
    + (1097 * e1sq * e1sq / 512) * Math.sin(8 * mu);

  const sinF = Math.sin(footLat);
  const cosF = Math.cos(footLat);
  const tanF = Math.tan(footLat);
  const N = A / Math.sqrt(1 - E2 * sinF * sinF);
  const T = tanF * tanF;
  const C = 0;
  const R = (A * (1 - E2)) / Math.pow(1 - E2 * sinF * sinF, 1.5);
  const D = (x - FALSE_E) / (N * K0);

  const latRad = footLat
    - ((N * tanF) / R) * (
      D * D / 2
      - (5 + 3 * T + 10 * C - 4 * C * C - 9 * E2) * Math.pow(D, 4) / 24
      + (61 + 90 * T + 298 * C + 45 * T * T - 252 * E2 - 3 * C * C) * Math.pow(D, 6) / 720
    );
  const lonRad = Math.asin(
    (D - (1 + 2 * T + C) * Math.pow(D, 3) / 6
      + (5 - 2 * C + 28 * T - 3 * C * C + 8 * E2 + 24 * T * T) * Math.pow(D, 5) / 120) / cosF,
  );

  const latBessel = latRad / DEG;
  const lonBessel = ORIGIN_LON + lonRad / DEG;

  return besselToWgs84(latBessel, lonBessel);
}

function meridianArc(latDeg: number): number {
  const lat = latDeg * DEG;
  const e4 = E2 * E2;
  const e6 = e4 * E2;
  return A * (
    (1 - E2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * lat
    - (3 * E2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * lat)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * lat)
    - (35 * e6 / 3072) * Math.sin(6 * lat)
  );
}

// 3-파라미터 Molodensky 근사 (한국 Bessel→WGS84 표준 변환환수)
const DX = -146.21;
const DY = 507.89;
const DZ = 680.87;
const WGS_A = 6378137.0;
const WGS_F = 1 / 298.257223563;
const WGS_E2 = 2 * WGS_F - WGS_F * WGS_F;

function besselToWgs84(latDeg: number, lonDeg: number): { latitude: number; longitude: number } {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  const N1 = A / Math.sqrt(1 - E2 * sinLat * sinLat);
  const x1 = (N1) * cosLat * cosLon;
  const y1 = (N1) * cosLat * sinLon;
  const z1 = (N1 * (1 - E2)) * sinLat;

  const x2 = x1 + DX;
  const y2 = y1 + DY;
  const z2 = z1 + DZ;

  const p = Math.sqrt(x2 * x2 + y2 * y2);
  const theta = Math.atan2(z2 * WGS_A, p * WGS_A * Math.sqrt(1 - WGS_E2));
  const latWgs = Math.atan2(z2 + WGS_A * WGS_E2 * Math.pow(Math.sin(theta), 3), p - WGS_A * Math.sqrt(1 - WGS_E2) * WGS_E2 * Math.pow(Math.cos(theta), 3));
  const lonWgs = Math.atan2(y2, x2);

  return { latitude: latWgs / DEG, longitude: lonWgs / DEG };
}

export function tmCenterToWgs84Safe(x: number | null | undefined, y: number | null | undefined): { latitude: number | null; longitude: number | null } {
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return { latitude: null, longitude: null };
  const { latitude, longitude } = tmCenterToWgs84(x, y);
  if (latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) return { latitude: null, longitude: null };
  return { latitude, longitude };
}

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });

// Field names confirmed against the live service (2026-08-19):
// https://apis.data.go.kr/1741000/rural_homestays/info
const farmstayItemSchema = z.object({
  MNG_NO: z.string().optional(),
  BPLC_NM: z.string().optional(),
  ROAD_NM_ADDR: z.string().optional(),
  LOTNO_ADDR: z.string().optional(),
  ROAD_NM_ZIP: z.string().optional(),
  LCPMT_YMD: z.string().optional(),
  CLSBIZ_YMD: z.string().optional(),
  SALS_STTS_CD: z.string().optional(),
  SALS_STTS_NM: z.string().optional(),
  DTL_SALS_STTS_NM: z.string().optional(),
  CRD_INFO_X: z.string().optional(),
  CRD_INFO_Y: z.string().optional(),
  OPN_ATMY_GRP_CD: z.string().optional(),
  TELNO: z.string().optional(),
  DAT_UPDT_PNT: z.string().optional(),
}).passthrough();

export type FarmstayItem = z.infer<typeof farmstayItemSchema>;

function envelopeSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    response: z.object({
      header: headerSchema,
      body: z.object({
        items: z.union([
          z.object({ item: z.union([z.array(itemSchema), itemSchema]) }),
          z.literal(""),
          z.null(),
        ]),
        numOfRows: z.coerce.number(),
        pageNo: z.coerce.number(),
        totalCount: z.coerce.number(),
      }),
    }),
  });
}

const listEnvelopeSchema = envelopeSchema(farmstayItemSchema);

type Options = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  requestBudget?: { remaining: number };
  requestIntervalMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  rows?: number;
};

export class FarmstayQuotaError extends Error {}

export class FarmstayProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly requestBudget: { remaining: number };
  private readonly requestIntervalMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly rows: number;

  constructor(options: Options = {}) {
    this.apiKey = options.apiKey ?? process.env.FARMSTAY_API_KEY ?? "";
    this.baseUrl = (options.baseUrl ?? process.env.FARMSTAY_API_BASE_URL ?? "").replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestBudget = options.requestBudget ?? { remaining: 10000 };
    this.requestIntervalMs = options.requestIntervalMs ?? 200;
    this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.rows = options.rows ?? 1000;

    if (!this.apiKey) {
      throw new Error("FARMSTAY_API_KEY is required for the farmstay provider.");
    }
    if (!this.baseUrl) {
      throw new Error("FARMSTAY_API_BASE_URL is required for the farmstay provider.");
    }
  }

  async fetchAllFarmstays(): Promise<FarmstayItem[]> {
    const allItems: FarmstayItem[] = [];
    let pageNo = 1;
    let totalCount = 0;
    // The live service caps every page at 100 items regardless of numOfRows,
    // so the guard is a generous absolute page ceiling (2000 pages × 100 rows).
    do {
      const { items, totalCount: tc } = await this.fetchPage(pageNo);
      allItems.push(...items);
      totalCount = tc;
      if (this.requestIntervalMs > 0) await this.sleep(this.requestIntervalMs);
      pageNo++;
    } while (allItems.length < totalCount && pageNo <= 2000 && this.requestBudget.remaining > 0);

    return allItems;
  }

  private async fetchPage(pageNo: number): Promise<{ items: FarmstayItem[]; totalCount: number }> {
    if (this.requestBudget.remaining <= 0) {
      throw new FarmstayQuotaError("Daily request budget exhausted for farmstay service.");
    }
    const url = new URL(`${this.baseUrl}/info`);
    url.searchParams.set("serviceKey", this.apiKey);
    url.searchParams.set("numOfRows", String(this.rows));
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("_type", "json");
    this.requestBudget.remaining -= 1;

    const response = await this.fetchImpl(url.toString());
    if (response.status === 429) {
      throw new FarmstayQuotaError("Rate limit (429) for farmstay service.");
    }
    const json = await response.json().catch(() => null);
    if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) {
      const header = (json as { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: string; returnAuthMsg?: string } } }).OpenAPI_ServiceResponse.cmmMsgHeader;
      throw new Error(`Farmstay API error code ${header.returnReasonCode}: ${header.returnAuthMsg ?? "unknown"}`);
    }
    if (!response.ok) {
      throw new Error(`Farmstay API HTTP ${response.status} on page ${pageNo}.`);
    }
    const parsed = listEnvelopeSchema.safeParse(json);
    if (!parsed.success) return { items: [], totalCount: 0 };
    const body = parsed.data.response.body;
    const items = body.items === "" || body.items === null ? [] : (Array.isArray(body.items.item) ? body.items.item : [body.items.item]);
    return { items, totalCount: body.totalCount };
  }

  get catalogUrl(): string {
    return OFFICIAL_CATALOG_URL;
  }
}
