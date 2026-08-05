import type { ProviderSnapshot } from "@/data/contracts";
import { resolveDatabasePath, SqlitePlaceRepository } from "@/data/database/repository";
import { EmptyDatabaseError, type PlaceProvider } from "@/data/providers/provider";

const SNAPSHOT_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedSnapshot = { snapshot: ProviderSnapshot; expiresAt: number };

const snapshotCache = new Map<string, CachedSnapshot>();

export function clearSnapshotCache(): void {
  snapshotCache.clear();
}

export class DatabasePlaceProvider implements PlaceProvider {
  readonly name = "database" as const;

  constructor(private readonly path?: string) {}

  async getSnapshot(): Promise<ProviderSnapshot> {
    const resolvedPath = this.path ?? resolveDatabasePath();
    if (resolvedPath !== ":memory:") {
      const cached = snapshotCache.get(resolvedPath);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.snapshot;
      }
    }

    const repository = new SqlitePlaceRepository(this.path);
    try {
      const snapshot = repository.loadLatestSnapshot();
      if (!snapshot) throw new EmptyDatabaseError();
      if (resolvedPath !== ":memory:") {
        snapshotCache.set(resolvedPath, { snapshot, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS });
      }
      return snapshot;
    } finally {
      repository.close();
    }
  }
}
