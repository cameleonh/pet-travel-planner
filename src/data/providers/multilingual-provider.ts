import { z } from "zod";

const OFFICIAL_CATALOG_EN = "https://www.data.go.kr/data/15059087/openapi.do";
const OFFICIAL_CATALOG_ZH = "https://www.data.go.kr/data/15059088/openapi.do";

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });

const translationItemSchema = z.object({
  contentid: z.string(),
  title: z.string().optional(),
  addr1: z.string().optional(),
  addr2: z.string().optional(),
  overview: z.string().optional(),
  contenttypeid: z.string().optional(),
  cat1: z.string().optional(),
  cat2: z.string().optional(),
  cat3: z.string().optional(),
  modifiedtime: z.string().optional(),
  mapx: z.string().optional(),
  mapy: z.string().optional(),
}).passthrough();

export type TranslationItem = z.infer<typeof translationItemSchema>;

export type Language = "en" | "zh";

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

const listEnvelopeSchema = envelopeSchema(translationItemSchema);

export type TranslatedPlace = {
  contentId: string;
  title: string | null;
  address: string | null;
  overview: string | null;
  mapx: string | null;
  mapy: string | null;
};

export type CoordinateKey = string;

export function coordinateKey(latitude: number, longitude: number, precision = 4): CoordinateKey {
  return `${latitude.toFixed(precision)},${longitude.toFixed(precision)}`;
}

type Options = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  requestBudget?: { remaining: number };
  requestIntervalMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  rows?: number;
};

class MultilingualQuotaError extends Error {}

const SERVICE_CONFIG: Record<Language, { serviceId: string; catalogUrl: string }> = {
  en: { serviceId: "EngService2", catalogUrl: OFFICIAL_CATALOG_EN },
  zh: { serviceId: "ChtService2", catalogUrl: OFFICIAL_CATALOG_ZH },
};

/**
 * Provider that fetches translated place data (title, address, overview)
 * from the Korea Tourism Organization's multilingual tourism APIs.
 *
 * Both EngService2 and ChtService2 share the same contentId space as
 * KorPetTourService2, enabling direct join with existing places.
 *
 * Pet-policy fields remain Korean-only — only structural place data is translated.
 */
export class MultilingualProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly requestBudget: { remaining: number };
  private readonly requestIntervalMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly rows: number;

  constructor(options: Options = {}) {
    this.apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestBudget = options.requestBudget ?? { remaining: 1000 };
    this.requestIntervalMs = options.requestIntervalMs ?? 200;
    this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.rows = options.rows ?? 1000;

    if (!this.apiKey) {
      throw new Error("TOUR_API_KEY is required for the multilingual provider.");
    }
  }

  private async fetchPage(
    language: Language,
    pageNo: number,
  ): Promise<{ items: TranslationItem[]; totalCount: number }> {
    if (this.requestBudget.remaining <= 0) {
      throw new MultilingualQuotaError(
        `Daily request budget exhausted for ${language} translation service.`,
      );
    }

    const { serviceId } = SERVICE_CONFIG[language];
    const url = new URL(`http://apis.data.go.kr/B551011/${serviceId}/areaBasedList2`);
    url.searchParams.set("serviceKey", this.apiKey);
    url.searchParams.set("numOfRows", String(this.rows));
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "같이갈개");
    url.searchParams.set("_type", "json");

    this.requestBudget.remaining -= 1;

    const response = await this.fetchImpl(url.toString());

    if (response.status === 429) {
      throw new MultilingualQuotaError(
        `Tour API rate limit (429) for ${language} translation service.`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `${language} translation API HTTP ${response.status} on page ${pageNo}.`,
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { items: [], totalCount: 0 };
    }

    if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) {
      const errorBody = (json as { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: string } } })
        .OpenAPI_ServiceResponse.cmmMsgHeader;
      if (errorBody.returnReasonCode === "22") {
        throw new MultilingualQuotaError(
          `Tour API daily quota exceeded for ${language} translation service.`,
        );
      }
      return { items: [], totalCount: 0 };
    }

    const parsed = listEnvelopeSchema.safeParse(json);
    if (!parsed.success) {
      return { items: [], totalCount: 0 };
    }

    const body = parsed.data.response.body;
    const items =
      body.items === "" || body.items === null
        ? []
        : Array.isArray(body.items.item)
          ? body.items.item
          : [body.items.item];

    return { items, totalCount: body.totalCount };
  }

  /**
   * Fetch all translated places for the given language, matching against our
   * existing places by rounded coordinates. EngService2/ChtService2 use
   * different contentId spaces than KorPetTourService2, so coordinate matching
   * is the only reliable join key.
   *
   * @param coordinateToPlaceId Map of coordinate keys to our place IDs
   */
  async fetchTranslations(
    language: Language,
    coordinateToPlaceId: Map<CoordinateKey, string>,
  ): Promise<Map<string, TranslatedPlace>> {
    const results = new Map<string, TranslatedPlace>();
    let pageNo = 1;
    let totalCount = 0;

    do {
      const { items, totalCount: tc } = await this.fetchPage(language, pageNo);
      totalCount = tc;

      for (const item of items) {
        if (item.mapx && item.mapy) {
          const lng = parseFloat(item.mapx);
          const lat = parseFloat(item.mapy);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const key = coordinateKey(lat, lng);
            const matchedPlaceId = coordinateToPlaceId.get(key);
            if (matchedPlaceId) {
              const addr = [item.addr1, item.addr2].filter(Boolean).join(" ") || null;
              results.set(matchedPlaceId, {
                contentId: item.contentid,
                title: item.title ?? null,
                address: addr,
                overview: item.overview ?? null,
                mapx: item.mapx ?? null,
                mapy: item.mapy ?? null,
              });
            }
          }
        }
      }

      if (this.requestIntervalMs > 0) {
        await this.sleep(this.requestIntervalMs);
      }
      pageNo++;
    } while ((pageNo - 1) * this.rows < totalCount && pageNo <= 50);

    return results;
  }

  get catalogUrl(): string {
    return OFFICIAL_CATALOG_EN;
  }

  get remainingQuota(): number {
    return this.requestBudget.remaining;
  }
}
