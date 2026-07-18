import type { ProviderSnapshot } from "@/data/contracts";
import { SqlitePlaceRepository } from "@/data/database/repository";
import { EmptyDatabaseError, type PlaceProvider } from "@/data/providers/provider";

export class DatabasePlaceProvider implements PlaceProvider {
  readonly name = "database" as const;

  constructor(private readonly path?: string) {}

  async getSnapshot(): Promise<ProviderSnapshot> {
    const repository = new SqlitePlaceRepository(this.path);
    try {
      const snapshot = repository.loadLatestSnapshot();
      if (!snapshot) throw new EmptyDatabaseError();
      return snapshot;
    } finally {
      repository.close();
    }
  }
}
