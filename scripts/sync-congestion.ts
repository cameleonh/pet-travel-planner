import { z } from "zod";
import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { CongestionProvider } from "../src/data/providers/congestion-provider";

const SYNC_CONFIG = {
  BATCH_LIMIT: 900,
  REQUEST_INTERVAL_MS: 300,
};

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });
const areaCodeItemSchema = z.object({ code: z.string(), name: z.string() }).passthrough();
const sigunguCodeItemSchema = z.object({ code: z.string(), name: z.string() }).passthrough();

function envelopeFor<T extends z.ZodTypeAny>(itemSchema: T) {
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

const areaEnvelope = envelopeFor(areaCodeItemSchema);
const sigunguEnvelope = envelopeFor(sigunguCodeItemSchema);

type RegionPair = { areaCd: string; signguCd: string };

async function fetchAreaCodes(apiKey: string, fetchImpl: typeof fetch): Promise<{ code: string; name: string }[]> {
  const url = new URL("http://apis.data.go.kr/B551011/KorService2/areaCode2");
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("numOfRows", "50");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "같이갈개");
  url.searchParams.set("_type", "json");

  const response = await fetchImpl(url.toString());
  if (!response.ok) return [];
  const json = await response.json();
  if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) return [];
  const parsed = areaEnvelope.safeParse(json);
  if (!parsed.success) return [];
  const body = parsed.data.response.body;
  if (body.items === "" || body.items === null) return [];
  return Array.isArray(body.items.item) ? body.items.item : [body.items.item];
}

async function fetchSigunguCodes(apiKey: string, areaCd: string, fetchImpl: typeof fetch): Promise<{ code: string; name: string }[]> {
  const url = new URL("http://apis.data.go.kr/B551011/KorService2/areaCode2");
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("areaCode", areaCd);
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "같이갈개");
  url.searchParams.set("_type", "json");

  const response = await fetchImpl(url.toString());
  if (!response.ok) return [];
  const json = await response.json();
  if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) return [];
  const parsed = sigunguEnvelope.safeParse(json);
  if (!parsed.success) return [];
  const body = parsed.data.response.body;
  if (body.items === "" || body.items === null) return [];
  return Array.isArray(body.items.item) ? body.items.item : [body.items.item];
}

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const snapshotId: number | null = repository.getLatestSnapshotId();
    if (snapshotId === null) {
      console.error(JSON.stringify({ ok: false, error: "No snapshot found. Run pet-tour sync first." }));
      process.exitCode = 1;
      return;
    }
    const snapId: number = snapshotId;

    const snapshot = repository.loadLatestSnapshot();
    if (!snapshot) {
      console.error(JSON.stringify({ ok: false, error: "No snapshot found." }));
      process.exitCode = 1;
      return;
    }

    // Build place name lookup for matching
    const placeNames = new Map<string, string>();
    for (const p of snapshot.places) {
      placeNames.set(p.name.trim(), p.id);
    }

    const apiKey = process.env.TOUR_API_KEY ?? "";

    // Step 1: Build area/sigungu codebook
    console.log(JSON.stringify({ step: 1, message: "Fetching area code codebook..." }));
    const areas = await fetchAreaCodes(apiKey, fetch);
    console.log(JSON.stringify({ step: 1, areasFound: areas.length }));

    const regionPairs: RegionPair[] = [];
    for (const area of areas) {
      const sigungus = await fetchSigunguCodes(apiKey, area.code, fetch);
      for (const sigungu of sigungus) {
        regionPairs.push({ areaCd: area.code, signguCd: sigungu.code });
      }
      await new Promise((resolve) => setTimeout(resolve, SYNC_CONFIG.REQUEST_INTERVAL_MS));
    }

    console.log(JSON.stringify({ step: 1, totalRegionPairs: regionPairs.length }));

    // Step 2: Fetch congestion data for each region pair
    const provider = new CongestionProvider({
      requestBudget: { remaining: SYNC_CONFIG.BATCH_LIMIT },
      requestIntervalMs: SYNC_CONFIG.REQUEST_INTERVAL_MS,
      rows: 1000,
    });

    const fetchedAt = new Date().toISOString();
    let processed = 0;
    let matched = 0;
    let savedForecasts = 0;
    let regionsWithData = 0;

    for (const region of regionPairs) {
      if (provider.remainingQuota <= 0) {
        console.log(JSON.stringify({ step: 2, quotaExhausted: true, processed }));
        break;
      }

      try {
        const forecasts = await provider.fetchByRegion(region.areaCd, region.signguCd);
        processed++;

        if (forecasts.length > 0) regionsWithData++;

        for (const forecast of forecasts) {
          const placeId = placeNames.get(forecast.tAtsNm.trim());
          if (!placeId) continue;

          matched++;
          for (const day of forecast.forecasts) {
            repository.saveCongestion(snapId, placeId, fetchedAt, {
              t_ats_nm: forecast.tAtsNm,
              area_cd: forecast.areaCd,
              area_nm: forecast.areaNm,
              signgu_cd: forecast.signguCd,
              signgu_nm: forecast.signguNm,
              base_ymd: day.baseYmd,
              cnctr_rate: day.cnctrRate,
            });
            savedForecasts++;
          }
        }

        if (processed % 50 === 0) {
          console.log(JSON.stringify({ step: 2, progress: true, processed, matched, savedForecasts, quotaRemaining: provider.remainingQuota }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.includes("quota") || message.includes("429") || message.includes("exhausted")) {
          console.error(JSON.stringify({ ok: false, error: message, processed, matched, savedForecasts }));
          break;
        }
      }

      if (SYNC_CONFIG.REQUEST_INTERVAL_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, SYNC_CONFIG.REQUEST_INTERVAL_MS));
      }
    }

    const finalCount = repository.getCongestionCount();

    console.log(JSON.stringify({
      ok: true,
      totalRegionPairs: regionPairs.length,
      regionsProcessed: processed,
      regionsWithData,
      matchedPlaces: matched,
      savedForecasts,
      totalCongestionRows: finalCount,
      quotaRemaining: provider.remainingQuota,
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown congestion sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
