import { z } from "zod";
import { type RawPlace } from "@/data/contracts";

const OFFICIAL_CATALOG_URL = "https://www.data.go.kr/data/15068066/openapi.do";

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });

const campingItemSchema = z.object({
  contentId: z.string(),
  contentTypeId: z.string().optional(),
  facltNm: z.string(),
  lineIntro: z.string().optional(),
  intro: z.string().optional(),
  induty: z.string().optional(),
  sbrsCl: z.string().optional(),
  animalCmgCl: z.string().optional(),
  glampSiteCo: z.coerce.number().optional(),
  caravSiteCo: z.coerce.number().optional(),
  gnrlSiteCo: z.coerce.number().optional(),
  operPdCl: z.string().optional(),
  operDeCl: z.string().optional(),
  resveUrl: z.string().optional(),
  firstImageUrl: z.string().optional(),
  addr1: z.string().optional(),
  addr2: z.string().optional(),
  mapX: z.string().optional(),
  mapY: z.string().optional(),
  doNm: z.string().optional(),
  sigunguNm: z.string().optional(),
  createdtime: z.string().optional(),
  modifiedtime: z.string().optional(),
}).passthrough();

export type CampingItem = z.infer<typeof campingItemSchema>;

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

const listEnvelopeSchema = envelopeSchema(campingItemSchema);

type Options = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  requestBudget?: { remaining: number };
  requestIntervalMs?: number;
  rateLimitRetryDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  fetchAllPages?: boolean;
  rows?: number;
};

class CampingQuotaError extends Error {}

export type CampingPlace = {
  item: CampingItem;
  rawPlace: RawPlace;
  petAdmitted: boolean;
};

function mapCampingToRawPlace(item: CampingItem): RawPlace {
  const lat = item.mapY ? parseFloat(item.mapY) : NaN;
  const lng = item.mapX ? parseFloat(item.mapX) : NaN;

  const policyParts: string[] = [];
  if (item.animalCmgCl) policyParts.push(`애완동물 출입: ${item.animalCmgCl}`);
  if (item.lineIntro) policyParts.push(item.lineIntro);
  if (item.induty) policyParts.push(`업종: ${item.induty}`);
  if (item.sbrsCl) policyParts.push(`부대시설: ${item.sbrsCl}`);

  const policyText = policyParts.length > 0 ? policyParts.join("\n") : "반려동물 정책 정보 없음";

  return {
    id: `camping:${item.contentId}`,
    name: item.facltNm,
    category: "attraction",
    address: [item.addr1, item.addr2].filter(Boolean).join(" ") || "주소 미상",
    coordinates: {
      latitude: Number.isFinite(lat) ? lat : 37.5,
      longitude: Number.isFinite(lng) ? lng : 127.0,
    },
    petPolicy: {
      label: "한국관광공사 고캠핑 서비스",
      sourceText: policyText,
      sourceUrl: OFFICIAL_CATALOG_URL,
      observedAt: new Date().toISOString(),
    },
    amenities: item.sbrsCl ? item.sbrsCl.split(",").map((s) => s.trim()).filter(Boolean) : [],
    sourceModifiedAt: item.modifiedtime ?? null,
    petDetailStatus: "fetched" as const,
  };
}

export class CampingProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly requestBudget: { remaining: number };
  private readonly requestIntervalMs: number;
  private readonly rateLimitRetryDelayMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly fetchAllPages: boolean;
  private readonly rows: number;

  constructor(options: Options = {}) {
    this.apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    this.baseUrl = options.baseUrl ?? "http://apis.data.go.kr/B551011/GoCamping";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestBudget = options.requestBudget ?? { remaining: 1000 };
    this.requestIntervalMs = options.requestIntervalMs ?? 200;
    this.rateLimitRetryDelayMs = options.rateLimitRetryDelayMs ?? 5000;
    this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.fetchAllPages = options.fetchAllPages ?? true;
    this.rows = options.rows ?? 1000;

    if (!this.apiKey) {
      throw new Error("TOUR_API_KEY is required for the camping provider.");
    }
  }

  private async fetchPage(pageNo: number): Promise<{ items: CampingItem[]; totalCount: number }> {
    if (this.requestBudget.remaining <= 0) {
      throw new CampingQuotaError("Daily request budget exhausted for GoCamping service.");
    }

    const url = new URL(`${this.baseUrl}/basedList`);
    url.searchParams.set("serviceKey", this.apiKey);
    url.searchParams.set("numOfRows", String(this.rows));
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "같이갈개");
    url.searchParams.set("_type", "json");

    this.requestBudget.remaining -= 1;

    const response = await this.fetchImpl(url.toString());

    if (response.status === 429) {
      await this.sleep(this.rateLimitRetryDelayMs);
      throw new CampingQuotaError("Tour API rate limit (429) for GoCamping service.");
    }

    if (!response.ok) {
      throw new Error(`GoCamping API HTTP ${response.status} on page ${pageNo}.`);
    }

    const json = await response.json();

    if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) {
      const errorBody = (json as { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: string } } }).OpenAPI_ServiceResponse.cmmMsgHeader;
      if (errorBody.returnReasonCode === "22") {
        throw new CampingQuotaError("Tour API daily quota exceeded for GoCamping service.");
      }
      return { items: [], totalCount: 0 };
    }

    const parsed = listEnvelopeSchema.safeParse(json);
    if (!parsed.success) {
      return { items: [], totalCount: 0 };
    }

    const body = parsed.data.response.body;
    const items = body.items === "" || body.items === null ? [] : (Array.isArray(body.items.item) ? body.items.item : [body.items.item]);

    return { items, totalCount: body.totalCount };
  }

  async fetchAllCampingPlaces(): Promise<CampingPlace[]> {
    const allItems: CampingItem[] = [];
    let pageNo = 1;
    let totalCount = 0;

    do {
      const { items, totalCount: tc } = await this.fetchPage(pageNo);
      allItems.push(...items);
      totalCount = tc;
      if (!this.fetchAllPages) break;
      if (this.requestIntervalMs > 0) await this.sleep(this.requestIntervalMs);
      pageNo++;
    } while (allItems.length < totalCount && pageNo <= 50);

    return allItems.map((item) => {
      const rawPlace = mapCampingToRawPlace(item);
      const petAdmitted = /^가능/.test((item.animalCmgCl ?? "").trim());
      return { item, rawPlace, petAdmitted };
    });
  }

  getPetAdmittedPlaces(): Promise<CampingPlace[]> {
    return this.fetchAllCampingPlaces().then((places) => places.filter((p) => p.petAdmitted));
  }

  get remainingQuota(): number {
    return this.requestBudget.remaining;
  }

  get catalogUrl(): string {
    return OFFICIAL_CATALOG_URL;
  }
}
