import type { RawPlace } from "@/data/contracts";
import type { SqlitePlaceRepository } from "@/data/database/repository";
import { syncProviderSnapshot, type SyncResult } from "@/data/database/sync";
import type { PlaceProvider } from "@/data/providers/provider";

export type DetailCoverage = {
  fetched: number;
  pending: number;
  failed: number;
  total: number;
};

export type DetailEnrichmentResult = {
  batchesCompleted: number;
  stopReason: "complete" | "no-progress" | "batch-limit";
  before: DetailCoverage;
  after: DetailCoverage;
  lastSync: SyncResult | null;
};

export function summarizeDetailCoverage(places: RawPlace[]): DetailCoverage {
  const fetched = places.filter((place) => (place.petDetailStatus ?? "fetched") === "fetched").length;
  const failed = places.filter((place) => place.petDetailStatus === "failed").length;
  return { fetched, pending: places.length - fetched - failed, failed, total: places.length };
}

export async function runDetailEnrichment(options: {
  repository: SqlitePlaceRepository;
  maxBatches: number;
  createProvider: (cachedPlaces: RawPlace[]) => PlaceProvider;
}): Promise<DetailEnrichmentResult> {
  if (!Number.isInteger(options.maxBatches) || options.maxBatches < 1) {
    throw new Error("maxBatches must be a positive integer.");
  }

  let snapshot = options.repository.loadLatestSnapshot();
  const before = summarizeDetailCoverage(snapshot?.places ?? []);
  let current = before;
  let lastSync: SyncResult | null = null;

  for (let batch = 1; batch <= options.maxBatches; batch += 1) {
    lastSync = await syncProviderSnapshot(options.createProvider(snapshot?.places ?? []), options.repository);
    snapshot = options.repository.loadLatestSnapshot();
    if (!snapshot) throw new Error("A successful enrichment batch did not publish a snapshot.");
    const next = summarizeDetailCoverage(snapshot.places);

    if (next.fetched === next.total) {
      return { batchesCompleted: batch, stopReason: "complete", before, after: next, lastSync };
    }
    if (next.fetched <= current.fetched) {
      return { batchesCompleted: batch, stopReason: "no-progress", before, after: next, lastSync };
    }
    current = next;
  }

  return { batchesCompleted: options.maxBatches, stopReason: "batch-limit", before, after: current, lastSync };
}
