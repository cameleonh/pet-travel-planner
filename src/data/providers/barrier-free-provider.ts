import { z } from "zod";

const OFFICIAL_CATALOG_URL = "https://www.data.go.kr/data/15001258/openapi.do";

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });

/**
 * Zod schema for the `detailWithTour2` response item.
 * 28 accessibility fields across 4 disability groups:
 * 지체장애, 시각장애, 청각장애, 영유아가족.
 */
export const accessibilityDetailSchema = z.object({
  contentid: z.string().optional(),
  // 지체장애
  parking: z.string().optional(),
  publictransport: z.string().optional(),
  route: z.string().optional(),
  ticketoffice: z.string().optional(),
  promotion: z.string().optional(),
  wheelchair: z.string().optional(),
  exit: z.string().optional(),
  elevator: z.string().optional(),
  restroom: z.string().optional(),
  auditorium: z.string().optional(),
  room: z.string().optional(),
  handicapetc: z.string().optional(),
  // 시각장애
  braileblock: z.string().optional(),
  helpdog: z.string().optional(),
  guidehuman: z.string().optional(),
  audioguide: z.string().optional(),
  bigprint: z.string().optional(),
  brailepromotion: z.string().optional(),
  guidesystem: z.string().optional(),
  blindhandicapetc: z.string().optional(),
  // 청각장애
  signguide: z.string().optional(),
  videoguide: z.string().optional(),
  hearingroom: z.string().optional(),
  hearinghandicapetc: z.string().optional(),
  // 영유아가족
  stroller: z.string().optional(),
  lactationroom: z.string().optional(),
  babysparechair: z.string().optional(),
  infantsfamilyetc: z.string().optional(),
}).passthrough();

export type AccessibilityDetail = z.infer<typeof accessibilityDetailSchema>;

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

const detailEnvelopeSchema = envelopeSchema(accessibilityDetailSchema);

export const ACCESSIBILITY_FIELDS = [
  // 지체장애
  "parking", "publictransport", "route", "ticketoffice", "promotion",
  "wheelchair", "exit", "elevator", "restroom", "auditorium", "room",
  "handicapetc",
  // 시각장애
  "braileblock", "helpdog", "guidehuman", "audioguide", "bigprint",
  "brailepromotion", "guidesystem", "blindhandicapetc",
  // 청각장애
  "signguide", "videoguide", "hearingroom", "hearinghandicapetc",
  // 영유아가족
  "stroller", "lactationroom", "babysparechair", "infantsfamilyetc",
] as const;

export type AccessibilityField = (typeof ACCESSIBILITY_FIELDS)[number];

export type AccessibilityResult = {
  contentId: string;
  detail: AccessibilityDetail;
};

type Options = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  requestBudget?: { remaining: number };
  requestIntervalMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

class BarrierFreeQuotaError extends Error {}

/**
 * Provider that enriches existing places with barrier-free accessibility data
 * from the Korea Tourism Organization's `KorWithService2/detailWithTour2` API.
 * Each call requires a `contentId` that matches the existing place_id suffix.
 */
export class BarrierFreeProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly requestBudget: { remaining: number };
  private readonly requestIntervalMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: Options = {}) {
    this.apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    this.baseUrl = options.baseUrl ?? process.env.TOUR_API_BASE_URL?.replace("KorPetTourService2", "KorWithService2") ?? "http://apis.data.go.kr/B551011/KorWithService2";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestBudget = options.requestBudget ?? { remaining: 1000 };
    this.requestIntervalMs = options.requestIntervalMs ?? 50;
    this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

    if (!this.apiKey) {
      throw new Error("TOUR_API_KEY is required for the barrier-free provider.");
    }
  }

  async fetchAccessibility(contentId: string): Promise<AccessibilityDetail | null> {
    if (this.requestBudget.remaining <= 0) {
      throw new BarrierFreeQuotaError("Daily request budget exhausted for barrier-free service.");
    }

    const url = new URL(`${this.baseUrl}/detailWithTour2`);
    url.searchParams.set("serviceKey", this.apiKey);
    url.searchParams.set("contentId", contentId);
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "같이갈개");
    url.searchParams.set("_type", "json");

    this.requestBudget.remaining -= 1;

    const response = await this.fetchImpl(url.toString());

    if (response.status === 429) {
      throw new BarrierFreeQuotaError("Tour API rate limit (429) for barrier-free service.");
    }

    if (!response.ok) {
      throw new Error(`Barrier-free API HTTP ${response.status} for contentId ${contentId}.`);
    }

    const json = await response.json();

    // Detect quota-exceeded JSON body (HTTP 200 but error in body)
    if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) {
      const errorBody = (json as { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: string; errMsg: string } } }).OpenAPI_ServiceResponse.cmmMsgHeader;
      if (errorBody.returnReasonCode === "22") {
        throw new BarrierFreeQuotaError("Tour API daily quota exceeded for barrier-free service.");
      }
      return null;
    }

    const parsed = detailEnvelopeSchema.safeParse(json);

    if (!parsed.success) {
      return null;
    }

    const items = parsed.data.response.body.items;
    if (items === "" || items === null) {
      return null;
    }

    const item = Array.isArray(items.item) ? items.item[0] : items.item;
    if (!item) {
      return null;
    }

    return item;
  }

  /**
   * Fetch accessibility data for a list of content IDs.
   * Returns results keyed by contentId for easy join.
   */
  async fetchBatch(contentIds: string[], options?: { concurrency?: number }): Promise<Map<string, AccessibilityDetail>> {
    const concurrency = options?.concurrency ?? 5;
    const results = new Map<string, AccessibilityDetail>();
    let index = 0;

    async function worker(provider: BarrierFreeProvider) {
      while (index < contentIds.length) {
        const currentIndex = index++;
        const contentId = contentIds[currentIndex];
        if (!contentId) continue;
        try {
          const detail = await provider.fetchAccessibility(contentId);
          if (detail) {
            results.set(contentId, detail);
          }
        } catch (error) {
          if (error instanceof BarrierFreeQuotaError) throw error;
        }
        if (provider.requestIntervalMs > 0) {
          await provider.sleep(provider.requestIntervalMs);
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, contentIds.length) }, () => worker(this));
    await Promise.all(workers);

    return results;
  }

  get catalogUrl(): string {
    return OFFICIAL_CATALOG_URL;
  }

  get remainingQuota(): number {
    return this.requestBudget.remaining;
  }
}
