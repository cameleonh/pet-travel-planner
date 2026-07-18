import fixtureData from "@/data/fixtures/places.json";
import { providerSnapshotSchema, type ProviderSnapshot } from "@/data/contracts";
import type { PlaceProvider } from "@/data/providers/provider";
export class FixturePlaceProvider implements PlaceProvider {
  readonly name = "fixture" as const;
  async getSnapshot(): Promise<ProviderSnapshot> {
    const snapshot = providerSnapshotSchema.parse(fixtureData);
    return providerSnapshotSchema.parse({
      ...snapshot,
      sourceTotalCount: snapshot.places.length,
      places: snapshot.places.map((place) => ({ ...place, sourceModifiedAt: null, petDetailStatus: "fetched" })),
    });
  }
}
