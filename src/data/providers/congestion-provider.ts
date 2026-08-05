import { z } from "zod";

const OFFICIAL_CATALOG_URL = "https://www.data.go.kr/data/15076760/openapi.do";

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });

/**
 * Zod schema for a single `tatsCnctrRatedList` response item.
 * Each item represents one day of congestion forecast for one tourist site.
 */
const congestionItemSchema = z.object({
  baseYmd: z.string(),
  areaCd: z.string(),
  areaNm: z.string().optional(),
  signguCd: z.string(),
  signguNm: z.string().optional(),
  tAtsNm: z.string(),
  cnctrRate: z.coerce.number(),
}).passthrough();

export type CongestionItem = z.infer<typeof congestionItemSchema>;

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

const listEnvelopeSchema = envelopeSchema(congestionItemSchema);

export type CongestionForecast = {
  tAtsNm: string;
  areaCd: string;
  signguCd: string;
  areaNm: string | null;
  signguNm: string | null;
  forecasts: { baseYmd: string; cnctrRate: number }[];
};

type Options = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  requestBudget?: { remaining: number };
  requestIntervalMs?: number;
  rateLimitRetryDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  rows?: number;
};

class CongestionQuotaError extends Error {}

/**
 * Provider that fetches 30-day congestion forecasts from the Korea Tourism
 * Organization's `TatsCnctrRateService/tatsCnctrRatedList` API.
 *
 * Unlike contentId-based enrichment providers, congestion data is keyed by
 * tourist-site name (`tAtsNm`) within a region (`areaCd` + `signguCd`).
 * The caller must supply valid area/sigungu code pairs.
 */
export class CongestionProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly requestBudget: { remaining: number };
  private readonly requestIntervalMs: number;
  private readonly rateLimitRetryDelayMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly rows: number;

  constructor(options: Options = {}) {
    this.apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    this.baseUrl = options.baseUrl ?? "http://apis.data.go.kr/B551011/TatsCnctrRateService";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestBudget = options.requestBudget ?? { remaining: 1000 };
    this.requestIntervalMs = options.requestIntervalMs ?? 200;
    this.rateLimitRetryDelayMs = options.rateLimitRetryDelayMs ?? 5000;
    this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.rows = options.rows ?? 1000;

    if (!this.apiKey) {
      throw new Error("TOUR_API_KEY is required for the congestion provider.");
    }
  }

  /**
   * Fetch all congestion forecasts for a single area/sigungu pair.
   * Returns one entry per tourist site, each containing 30 daily forecasts.
   */
  async fetchByRegion(areaCd: string, signguCd: string): Promise<CongestionForecast[]> {
    if (this.requestBudget.remaining <= 0) {
      throw new CongestionQuotaError("Daily request budget exhausted for congestion service.");
    }

    const url = new URL(`${this.baseUrl}/tatsCnctrRatedList`);
    url.searchParams.set("serviceKey", this.apiKey);
    url.searchParams.set("numOfRows", String(this.rows));
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "같이갈개");
    url.searchParams.set("areaCd", areaCd);
    url.searchParams.set("signguCd", signguCd);
    url.searchParams.set("_type", "json");

    this.requestBudget.remaining -= 1;

    const response = await this.fetchImpl(url.toString());

    if (response.status === 429) {
      await this.sleep(this.rateLimitRetryDelayMs);
      throw new CongestionQuotaError("Tour API rate limit (429) for congestion service.");
    }

    if (!response.ok) {
      throw new Error(`Congestion API HTTP ${response.status} for areaCd=${areaCd} signguCd=${signguCd}.`);
    }

    const json = await response.json();

    if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) {
      const errorBody = (json as { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: string; errMsg: string } } }).OpenAPI_ServiceResponse.cmmMsgHeader;
      if (errorBody.returnReasonCode === "22") {
        throw new CongestionQuotaError("Tour API daily quota exceeded for congestion service.");
      }
      return [];
    }

    const parsed = listEnvelopeSchema.safeParse(json);
    if (!parsed.success) {
      return [];
    }

    const body = parsed.data.response.body;
    if (body.items === "" || body.items === null) {
      return [];
    }

    const items = Array.isArray(body.items.item) ? body.items.item : [body.items.item];

    // Group 30-day forecasts by tourist site name
    const siteMap = new Map<string, CongestionForecast>();
    for (const item of items) {
      const key = `${item.tAtsNm}|${item.areaCd}|${item.signguCd}`;
      let forecast = siteMap.get(key);
      if (!forecast) {
        forecast = {
          tAtsNm: item.tAtsNm,
          areaCd: item.areaCd,
          signguCd: item.signguCd,
          areaNm: item.areaNm ?? null,
          signguNm: item.signguNm ?? null,
          forecasts: [],
        };
        siteMap.set(key, forecast);
      }
      forecast.forecasts.push({ baseYmd: item.baseYmd, cnctrRate: item.cnctrRate });
    }

    return [...siteMap.values()];
  }

  /**
   * Fetch congestion forecasts for multiple area/sigungu pairs.
   * Processes sequentially to respect rate limits.
   */
  async fetchByRegions(regions: { areaCd: string; signguCd: string }[]): Promise<CongestionForecast[]> {
    const all: CongestionForecast[] = [];
    for (const region of regions) {
      try {
        const forecasts = await this.fetchByRegion(region.areaCd, region.signguCd);
        all.push(...forecasts);
      } catch (error) {
        if (error instanceof CongestionQuotaError) throw error;
      }
      if (this.requestIntervalMs > 0) {
        await this.sleep(this.requestIntervalMs);
      }
    }
    return all;
  }

  get catalogUrl(): string {
    return OFFICIAL_CATALOG_URL;
  }

  get remainingQuota(): number {
    return this.requestBudget.remaining;
  }
}
