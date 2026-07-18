import type { ProviderSnapshot } from "@/data/contracts";
import { SqlitePlaceRepository } from "@/data/database/repository";
import type { PlaceProvider } from "@/data/providers/provider";

export type SyncResult = {
  runId: number;
  snapshotId: number;
  provider: ProviderSnapshot["provider"];
  fetchedAt: string;
  places: number;
  auxiliaryPlaces: number;
};

export async function syncProviderSnapshot(provider: PlaceProvider, repository: SqlitePlaceRepository): Promise<SyncResult> {
  if (provider.name === "database") throw new Error("A database provider cannot be used as a synchronization source.");
  const runId = repository.startSync(provider.name);
  try {
    const snapshot = await provider.getSnapshot();
    const snapshotId = repository.publishSnapshot(runId, snapshot);
    return {
      runId,
      snapshotId,
      provider: snapshot.provider,
      fetchedAt: snapshot.fetchedAt,
      places: snapshot.places.length,
      auxiliaryPlaces: snapshot.auxiliaryPlaces.length,
    };
  } catch (error) {
    repository.failSync(runId, error);
    throw error;
  }
}
