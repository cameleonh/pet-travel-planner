import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { BarrierFreeProvider, ACCESSIBILITY_FIELDS } from "../src/data/providers/barrier-free-provider";
import { z } from "zod";

const SYNC_CONFIG = {
  BATCH_SIZE: 900,
  CATALOG_PAGES: 20,
  REQUEST_INTERVAL_MS: 300,
};

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });
const syncItemSchema = z.object({ contentid: z.string() }).passthrough();
const syncEnvelopeSchema = z.object({
  response: z.object({
    header: headerSchema,
    body: z.object({
      items: z.union([
        z.object({ item: z.union([z.array(syncItemSchema), syncItemSchema]) }),
        z.literal(""),
        z.null(),
      ]),
      numOfRows: z.coerce.number(),
      pageNo: z.coerce.number(),
      totalCount: z.coerce.number(),
    }),
  }),
});

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const snapshotId: number | null = repository.getLatestSnapshotId();
    if (snapshotId === null) {
      console.error(JSON.stringify({ ok: false, error: "No snapshot found." }));
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

    // Build a set of our DB's contentIds (numeric part of place_id)
    const ourContentIds = new Set<string>();
    const placeIdByContentId = new Map<string, string>();
    for (const p of snapshot.places) {
      const match = p.id.match(/:(\d+)$/);
      if (match) {
        ourContentIds.add(match[1]!);
        placeIdByContentId.set(match[1]!, p.id);
      }
    }

    const apiKey = process.env.TOUR_API_KEY ?? "";
    const baseUrl = "http://apis.data.go.kr/B551011/KorWithService2";

    // Step 1: Fetch the barrier-free catalog to find which contentIds have accessibility data
    console.log(JSON.stringify({ step: 1, message: "Fetching barrier-free catalog..." }));

    const barrierFreeIds = new Set<string>();
    let pageNo = 1;
    let totalCount = 0;

    do {
      if (pageNo > SYNC_CONFIG.CATALOG_PAGES) break;
      const url = new URL(`${baseUrl}/areaBasedSyncList2`);
      url.searchParams.set("serviceKey", apiKey);
      url.searchParams.set("numOfRows", "1000");
      url.searchParams.set("pageNo", String(pageNo));
      url.searchParams.set("MobileOS", "ETC");
      url.searchParams.set("MobileApp", "같이갈개");
      url.searchParams.set("_type", "json");

      const response = await fetch(url.toString());
      const json = await response.json();

      if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) {
        console.error(JSON.stringify({ step: 1, error: "Quota exceeded during catalog fetch", page: pageNo }));
        break;
      }

      const parsed = syncEnvelopeSchema.safeParse(json);
      if (!parsed.success) break;

      const body = parsed.data.response.body;
      totalCount = body.totalCount;
      const items = body.items === "" || body.items === null ? [] : (Array.isArray(body.items.item) ? body.items.item : [body.items.item]);

      for (const item of items) {
        if (ourContentIds.has(item.contentid)) {
          barrierFreeIds.add(item.contentid);
        }
      }

      console.log(JSON.stringify({ step: 1, page: pageNo, fetched: items.length, matched: barrierFreeIds.size, totalCount }));
      pageNo++;
      await new Promise((resolve) => setTimeout(resolve, SYNC_CONFIG.REQUEST_INTERVAL_MS));
    } while ((pageNo - 1) * 1000 < totalCount);

    console.log(JSON.stringify({ step: 1, done: true, barrierFreeMatched: barrierFreeIds.size, ourTotal: ourContentIds.size }));

    // Step 2: Fetch accessibility detail for matched contentIds only (sequential, no concurrency)
    const requestBudget = { remaining: SYNC_CONFIG.BATCH_SIZE };
    const provider = new BarrierFreeProvider({
      requestBudget,
      requestIntervalMs: SYNC_CONFIG.REQUEST_INTERVAL_MS,
    });

    const existingAccessibility = repository.getAccessibilityCount();
    const allMatched = [...barrierFreeIds];
    const toProcess = allMatched.slice(existingAccessibility, existingAccessibility + SYNC_CONFIG.BATCH_SIZE);

    console.log(JSON.stringify({ step: 2, matchedTotal: allMatched.length, batchStart: existingAccessibility, batchSize: toProcess.length }));

    let processed = 0;
    let saved = 0;
    let empty = 0;
    const fetchedAt = new Date().toISOString();

    for (const contentId of toProcess) {
      try {
        const detail = await provider.fetchAccessibility(contentId);
        processed++;

        if (detail) {
          const hasData = Object.values(detail).some((v) => typeof v === "string" && v.length > 0);
          if (hasData) {
            const placeId = placeIdByContentId.get(contentId)!;
            const filtered: Record<string, string | undefined> = {};
            for (const field of ACCESSIBILITY_FIELDS) {
              const val = (detail as Record<string, string | undefined>)[field];
              if (val !== undefined) filtered[field] = val;
            }
            repository.saveAccessibility(snapId, placeId, fetchedAt, filtered);
            saved++;
          } else {
            empty++;
          }
        } else {
          empty++;
        }

        if (processed % 50 === 0) {
          console.log(JSON.stringify({ step: 2, progress: true, processed, saved, empty, quotaRemaining: provider.remainingQuota }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.includes("quota") || message.includes("429") || message.includes("exhausted")) {
          console.error(JSON.stringify({ ok: false, error: message, processed, saved, empty }));
          break;
        }
        empty++;
      }
    }

    const finalCount = repository.getAccessibilityCount();

    console.log(JSON.stringify({
      ok: true,
      barrierFreeCatalogTotal: totalCount,
      matchedWithOurDb: barrierFreeIds.size,
      processed,
      saved,
      empty,
      quotaRemaining: provider.remainingQuota,
      totalAccessibility: finalCount,
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown barrier-free sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
