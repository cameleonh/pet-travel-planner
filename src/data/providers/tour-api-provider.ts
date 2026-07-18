import { z } from "zod";
import { providerSnapshotSchema, rawPlaceSchema, type ProviderSnapshot, type RawPlace } from "@/data/contracts";
import { ProviderConfigurationError, type PlaceProvider } from "@/data/providers/provider";

const OFFICIAL_CATALOG_URL = "https://www.data.go.kr/data/15135102/openapi.do";

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });
const listItemSchema = z.object({
  addr1: z.string().optional(),
  addr2: z.string().optional(),
  cat3: z.string().optional(),
  contentid: z.string(),
  contenttypeid: z.string().optional(),
  mapx: z.string().optional(),
  mapy: z.string().optional(),
  modifiedtime: z.string().optional(),
  title: z.string(),
}).passthrough();
const petDetailSchema = z.object({
  contentid: z.string().optional(),
  relaAcdntRiskMtr: z.string().optional(),
  acmpyTypeCd: z.string().optional(),
  relaPosesFclty: z.string().optional(),
  relaFrnshPrdlst: z.string().optional(),
  etcAcmpyInfo: z.string().optional(),
  relaPurcPrdlst: z.string().optional(),
  acmpyPsblCpam: z.string().optional(),
  relaRntlPrdlst: z.string().optional(),
  acmpyNeedMtr: z.string().optional(),
});

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

const listEnvelopeSchema = envelopeSchema(listItemSchema);
const detailEnvelopeSchema = envelopeSchema(petDetailSchema);

type Options = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  rows?: number;
  detailConcurrency?: number;
  detailLimit?: number;
  detailRetryOffset?: number;
  requestBudget?: { remaining: number };
  requestIntervalMs?: number;
  rateLimitRetryDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  fetchAllPages?: boolean;
  cachedPlaces?: RawPlace[];
  now?: () => Date;
};

type PetDetail = z.infer<typeof petDetailSchema>;

class TourApiQuotaError extends Error {}

const POLICY_FIELDS: ReadonlyArray<[keyof PetDetail, string]> = [
  ["acmpyTypeCd", "동반 유형"],
  ["acmpyPsblCpam", "동반 가능 동물"],
  ["acmpyNeedMtr", "동반 필요 사항"],
  ["relaAcdntRiskMtr", "사고 위험 사항"],
  ["etcAcmpyInfo", "기타 동반 정보"],
  ["relaPosesFclty", "반려동물 보유 시설"],
  ["relaFrnshPrdlst", "반려동물 비치 품목"],
  ["relaPurcPrdlst", "반려동물 구매 가능 품목"],
  ["relaRntlPrdlst", "반려동물 대여 가능 품목"],
];

function itemsFrom<T>(items: { item: T | T[] } | "" | null): T[] {
  if (!items) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

function categoryFrom(contentTypeId?: string, fineCategory?: string): RawPlace["category"] {
  if (contentTypeId === "32") return "accommodation";
  if (contentTypeId === "38") return "shopping";
  if (contentTypeId === "39" && fineCategory === "A05020900") return "cafe";
  if (contentTypeId === "39") return "restaurant";
  return "attraction";
}

function policyText(detail?: PetDetail): string {
  if (!detail) return "반려동물 동반 상세정보 미제공";
  const lines = POLICY_FIELDS.flatMap(([key, label]) => {
    const value = detail[key]?.trim();
    return value ? [`${label}: ${value}`] : [];
  });
  return lines.length > 0 ? lines.join("\n") : "반려동물 동반 상세정보 미제공";
}

function amenitiesFrom(detail?: PetDetail): string[] {
  if (!detail) return [];
  return [detail.relaPosesFclty, detail.relaFrnshPrdlst, detail.relaPurcPrdlst, detail.relaRntlPrdlst]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export class TourApiPlaceProvider implements PlaceProvider {
  readonly name = "tour-api" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly rows: number;
  private readonly detailConcurrency: number;
  private readonly detailLimit: number;
  private readonly detailRetryOffset: number;
  private readonly requestBudget?: { remaining: number };
  private readonly requestIntervalMs: number;
  private readonly rateLimitRetryDelayMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private nextRequestAt = 0;
  private readonly fetchAllPages: boolean;
  private readonly cachedPlaces: Map<string, RawPlace>;
  private readonly now: () => Date;

  constructor(options: Options = {}) {
    if (!options.apiKey) throw new ProviderConfigurationError("TOUR_API_KEY is required when DATA_PROVIDER=tour-api.");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "http://apis.data.go.kr/B551011/KorPetTourService2").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.rows = options.rows ?? 10;
    this.detailConcurrency = Math.max(1, Math.floor(options.detailConcurrency ?? 5));
    this.detailLimit = Math.max(0, Math.floor(options.detailLimit ?? Number.POSITIVE_INFINITY));
    this.detailRetryOffset = Math.max(0, Math.floor(options.detailRetryOffset ?? 0));
    this.requestBudget = options.requestBudget;
    this.requestIntervalMs = Math.max(0, Math.floor(options.requestIntervalMs ?? 0));
    this.rateLimitRetryDelayMs = Math.max(0, Math.floor(options.rateLimitRetryDelayMs ?? 2_000));
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.fetchAllPages = options.fetchAllPages ?? false;
    this.cachedPlaces = new Map((options.cachedPlaces ?? []).map((place) => [place.id, place]));
    this.now = options.now ?? (() => new Date());
  }

  private async request<T>(operation: string, parameters: Record<string, string>, schema: z.ZodTypeAny): Promise<{ items: T[]; totalCount: number }> {
    const url = new URL(`${this.baseUrl}/${operation}`);
    const commonParameters = {
      serviceKey: this.apiKey,
      MobileOS: "ETC",
      MobileApp: "HamkkeGaljido",
      _type: "json",
      ...parameters,
    };
    for (const [key, value] of Object.entries(commonParameters)) url.searchParams.set(key, value);
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (this.requestBudget && this.requestBudget.remaining <= 0) {
        throw new TourApiQuotaError("Tour API local request budget exhausted.");
      }
      if (this.requestBudget) this.requestBudget.remaining -= 1;
      const scheduledAt = Math.max(Date.now(), this.nextRequestAt);
      this.nextRequestAt = scheduledAt + this.requestIntervalMs;
      const pacingDelay = scheduledAt - Date.now();
      if (pacingDelay > 0) await this.sleep(pacingDelay);
      response = await this.fetchImpl(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (response.status !== 429 || attempt === 1) break;
      await this.sleep(this.rateLimitRetryDelayMs);
    }
    if (!response) throw new Error("Tour API request did not produce a response.");
    if (response.status === 429) throw new TourApiQuotaError("Tour API request failed with status 429 after one retry.");
    if (!response.ok) throw new Error(`Tour API request failed with status ${response.status}.`);
    const envelope = schema.parse(await response.json()) as { response: { header: { resultCode: string; resultMsg: string }; body: { items: unknown } } };
    if (envelope.response.header.resultCode === "22") {
      throw new TourApiQuotaError(`Tour API returned result code ${envelope.response.header.resultCode}: ${envelope.response.header.resultMsg}`);
    }
    if (envelope.response.header.resultCode !== "0000") {
      throw new Error(`Tour API returned result code ${envelope.response.header.resultCode}: ${envelope.response.header.resultMsg}`);
    }
    return {
      items: itemsFrom(envelope.response.body.items as { item: T | T[] } | "" | null),
      totalCount: Number((envelope.response.body as { totalCount?: number }).totalCount ?? 0),
    };
  }

  private async getPetDetail(contentId: string): Promise<PetDetail | undefined> {
    const response = await this.request<PetDetail>("detailPetTour2", {
      contentId,
      numOfRows: "1",
      pageNo: "1",
    }, detailEnvelopeSchema);
    return response.items[0];
  }

  async getSnapshot(): Promise<ProviderSnapshot> {
    const observedAt = this.now().toISOString();
    const firstPage = await this.request<z.infer<typeof listItemSchema>>("areaBasedList2", {
      numOfRows: String(this.rows),
      pageNo: "1",
      arrange: "A",
    }, listEnvelopeSchema);
    const allItems = [...firstPage.items];
    if (this.fetchAllPages) {
      const pageCount = Math.ceil(firstPage.totalCount / this.rows);
      for (let page = 2; page <= pageCount; page += 1) {
        const response = await this.request<z.infer<typeof listItemSchema>>("areaBasedList2", {
          numOfRows: String(this.rows),
          pageNo: String(page),
          arrange: "A",
        }, listEnvelopeSchema);
        allItems.push(...response.items);
      }
    }
    const listItems = [...new Map(allItems.map((item) => [item.contentid, item])).values()];
    const targetGroups = listItems.reduce<{ pending: number[]; retry: number[] }>((groups, item, index) => {
      const cached = this.cachedPlaces.get(`tour-api:${item.contentid}`);
      const cachedFetched = cached && (cached.petDetailStatus ?? "fetched") === "fetched";
      const unchanged = cached && (!cached.sourceModifiedAt || cached.sourceModifiedAt === (item.modifiedtime ?? null));
      if (cachedFetched && unchanged) return groups;
      if (!cached || cached.petDetailStatus === "not-fetched") groups.pending.push(index);
      else groups.retry.push(index);
      return groups;
    }, { pending: [], retry: [] });
    const retryOffset = targetGroups.retry.length === 0 ? 0 : this.detailRetryOffset % targetGroups.retry.length;
    const rotatedRetry = [...targetGroups.retry.slice(retryOffset), ...targetGroups.retry.slice(0, retryOffset)];
    const detailTargets = [...targetGroups.pending, ...rotatedRetry].slice(0, this.detailLimit);
    const details = new Map<number, PromiseSettledResult<PetDetail | undefined>>();
    let nextIndex = 0;
    let fatalError: TourApiQuotaError | undefined;
    const worker = async () => {
      while (nextIndex < detailTargets.length) {
        if (fatalError) return;
        const index = detailTargets[nextIndex++];
        if (index === undefined) continue;
        const item = listItems[index];
        if (!item) continue;
        try {
          details.set(index, { status: "fulfilled", value: await this.getPetDetail(item.contentid) });
        } catch (reason) {
          if (reason instanceof TourApiQuotaError) {
            fatalError ??= reason;
            return;
          }
          details.set(index, { status: "rejected", reason });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.detailConcurrency, detailTargets.length) }, worker));
    if (fatalError) throw fatalError;

    const places = listItems.flatMap((item, index) => {
      const cached = this.cachedPlaces.get(`tour-api:${item.contentid}`);
      const cachedFetched = cached && (cached.petDetailStatus ?? "fetched") === "fetched";
      const detailResult = details.get(index);
      const detail = detailResult?.status === "fulfilled" ? detailResult.value : undefined;
      const detailSucceeded = detailResult?.status === "fulfilled";
      const preserveCached = cached && !detailSucceeded ? cached : undefined;
      const detailStatus: RawPlace["petDetailStatus"] = detailSucceeded
        ? "fetched"
        : cachedFetched
          ? "fetched"
          : detailResult?.status === "rejected"
            ? "failed"
            : cached?.petDetailStatus ?? "not-fetched";
      const candidate = rawPlaceSchema.safeParse({
        id: `tour-api:${item.contentid}`,
        name: item.title.trim(),
        category: categoryFrom(item.contenttypeid, item.cat3),
        address: [item.addr1, item.addr2].map((part) => part?.trim()).filter(Boolean).join(" ") || "주소 미제공",
        coordinates: { latitude: Number(item.mapy), longitude: Number(item.mapx) },
        petPolicy: {
          label: "한국관광공사 반려동물 동반여행 서비스",
          sourceText: preserveCached?.petPolicy.sourceText ?? policyText(detail),
          sourceUrl: OFFICIAL_CATALOG_URL,
          observedAt: preserveCached?.petPolicy.observedAt ?? observedAt,
        },
        amenities: preserveCached?.amenities ?? amenitiesFrom(detail),
        sourceModifiedAt: detailSucceeded || !cached ? item.modifiedtime ?? null : cached.sourceModifiedAt ?? null,
        petDetailStatus: detailStatus,
      });
      return candidate.success ? [candidate.data] : [];
    });

    return providerSnapshotSchema.parse({ provider: "tour-api", fetchedAt: observedAt, sourceTotalCount: firstPage.totalCount, places, auxiliaryPlaces: [] });
  }
}
