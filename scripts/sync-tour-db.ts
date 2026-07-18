import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { runDetailEnrichment } from "../src/data/database/enrichment";
import { TourApiPlaceProvider } from "../src/data/providers/tour-api-provider";

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Expected an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const rows = boundedInteger(process.env.TOUR_API_PAGE_SIZE, 1000, 1, 1000);
    const detailConcurrency = boundedInteger(process.env.TOUR_API_DETAIL_CONCURRENCY, 5, 1, 20);
    const detailLimit = boundedInteger(process.env.TOUR_API_DETAIL_LIMIT, 800, 0, 900);
    const maxBatches = boundedInteger(process.env.TOUR_API_SYNC_BATCHES, 1, 1, 20);
    const requestLimit = boundedInteger(process.env.TOUR_API_REQUEST_LIMIT, 900, 1, 25_000);
    const requestIntervalMs = boundedInteger(process.env.TOUR_API_REQUEST_INTERVAL_MS, 200, 0, 10_000);
    const rateLimitRetryDelayMs = boundedInteger(process.env.TOUR_API_RATE_LIMIT_RETRY_MS, 2_000, 0, 60_000);
    const requestBudget = { remaining: requestLimit };
    const result = await runDetailEnrichment({
      repository,
      maxBatches,
      createProvider: (cachedPlaces) => new TourApiPlaceProvider({
        apiKey: process.env.TOUR_API_KEY,
        baseUrl: process.env.TOUR_API_BASE_URL,
        rows,
        detailConcurrency,
        detailLimit,
        detailRetryOffset: repository.getCounts().successfulRuns,
        requestBudget,
        requestIntervalMs,
        rateLimitRetryDelayMs,
        fetchAllPages: true,
        cachedPlaces,
      }),
    });
    const snapshot = repository.loadLatestSnapshot();
    console.log(JSON.stringify({
      ok: true,
      config: { rows, detailConcurrency, detailLimit, maxBatches, requestLimit, requestIntervalMs, rateLimitRetryDelayMs },
      requestsUsed: requestLimit - requestBudget.remaining,
      sourceTotalCount: snapshot?.sourceTotalCount ?? result.after.total,
      batchesCompleted: result.batchesCompleted,
      stopReason: result.stopReason,
      before: result.before,
      after: result.after,
      sync: result.lastSync ? {
        runId: result.lastSync.runId,
        snapshotId: result.lastSync.snapshotId,
        fetchedAt: result.lastSync.fetchedAt,
      } : null,
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown synchronization error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});
