import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { BarrierFreeProvider } from "../src/data/providers/barrier-free-provider";

const SYNC_CONFIG = {
  BATCH_SIZE: 900,
  CONCURRENCY: 3,
  REQUEST_INTERVAL_MS: 200,
};

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const snapshot = repository.loadLatestSnapshot();
    if (!snapshot) {
      console.error(JSON.stringify({ ok: false, error: "No snapshot found. Run pet-tour sync first." }));
      process.exitCode = 1;
      return;
    }

    const existingAccessibility = repository.getAccessibilityCount();
    const totalPlaces = snapshot.places.length;
    const remaining = totalPlaces - existingAccessibility;

    console.log(JSON.stringify({
      starting: true,
      snapshotId: snapshot ? undefined : undefined,
      totalPlaces,
      existingAccessibility,
      remaining,
      batchSize: SYNC_CONFIG.BATCH_SIZE,
      concurrency: SYNC_CONFIG.CONCURRENCY,
    }));

    if (remaining <= 0) {
      console.log(JSON.stringify({ ok: true, message: "All places already have accessibility data.", count: existingAccessibility }));
      return;
    }

    const requestBudget = { remaining: SYNC_CONFIG.BATCH_SIZE };
    const provider = new BarrierFreeProvider({
      requestBudget,
      requestIntervalMs: SYNC_CONFIG.REQUEST_INTERVAL_MS,
    });

    // Extract numeric contentId from place_id (e.g., "tour-api:988449" → "988449")
    const placeContentIds = snapshot.places
      .map((p) => {
        const match = p.id.match(/:(\d+)$/);
        return match ? { placeId: p.id, contentId: match[1]! } : null;
      })
      .filter((p): p is { placeId: string; contentId: string } => p !== null);

    // Process in batches to respect quota
    const toProcess = placeContentIds.slice(existingAccessibility, existingAccessibility + SYNC_CONFIG.BATCH_SIZE);

    console.log(JSON.stringify({
      processing: true,
      batchStart: existingAccessibility,
      batchSize: toProcess.length,
    }));

    let processed = 0;
    let saved = 0;
    let empty = 0;
    const fetchedAt = new Date().toISOString();
    const snapshotId: number | null = repository.getLatestSnapshotId();

    if (snapshotId === null) {
      console.error(JSON.stringify({ ok: false, error: "Cannot resolve snapshot ID." }));
      process.exitCode = 1;
      return;
    }
    const snapId: number = snapshotId;

    // Process with concurrency control
    const concurrency = Math.min(SYNC_CONFIG.CONCURRENCY, toProcess.length);
    let index = 0;

    async function worker(): Promise<void> {
      while (index < toProcess.length) {
        const currentIndex = index++;
        const item = toProcess[currentIndex];
        if (!item) continue;

        try {
          const detail = await provider.fetchAccessibility(item.contentId);
          processed++;

          if (detail) {
            const hasData = Object.values(detail).some((v) => typeof v === "string" && v.length > 0);
            if (hasData) {
              repository.saveAccessibility(snapId, item.placeId, fetchedAt, detail as Record<string, string | undefined>);
              saved++;
            } else {
              empty++;
            }
          } else {
            empty++;
          }

          if (processed % 100 === 0) {
            console.log(JSON.stringify({ progress: true, processed, saved, empty, quotaRemaining: provider.remainingQuota }));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          if (message.includes("quota") || message.includes("429")) {
            console.error(JSON.stringify({ ok: false, error: message, processed, saved, empty }));
            return;
          }
          empty++;
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    const finalCount = repository.getAccessibilityCount();

    console.log(JSON.stringify({
      ok: true,
      processed,
      saved,
      empty,
      quotaRemaining: provider.remainingQuota,
      totalAccessibility: finalCount,
      totalPlaces,
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
