import { resolve } from "node:path";
import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { GyeonggiPetFacilityProvider } from "../src/data/providers/gg-pet-provider";

async function main(): Promise<void> {
  const parkPath = process.argv[2] ? resolve(process.argv[2]) : resolve("자료/경기도_반려동물놀이시설공원_20260904.json");
  const vetPath = process.argv[3] ? resolve(process.argv[3]) : resolve("자료/경기도_반려동물의료복지시설_20260904.json");
  const provider = new GyeonggiPetFacilityProvider();
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    console.log(JSON.stringify({ starting: true, parkPath, vetPath }));
    const snapshotId = repository.latestSuccessfulSnapshotId();
    if (!snapshotId) {
      throw new Error("No successful snapshot found. Run sync-tour-db first.");
    }
    const { places, stats } = await provider.loadFromJsonFiles(parkPath, vetPath);
    const saved = repository.replaceGyeonggiAuxiliary(snapshotId, places);
    const auxiliaryTotal = repository.getCounts().auxiliaryPlaces;
    console.log(JSON.stringify({ ok: true, snapshotId, saved, stats, auxiliaryTotal }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown): void => {
  const message = error instanceof Error ? error.message : "Unknown Gyeonggi pet facility sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
