import { resolve } from "node:path";
import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { VillageProvider } from "../src/data/providers/village-provider";

async function main(): Promise<void> {
  const inputPath = process.argv[2] ? resolve(process.argv[2]) : resolve("자료/전국농어촌체험휴양마을표준데이터.json");
  const provider = new VillageProvider();
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    console.log(JSON.stringify({ starting: true, input: inputPath }));
    const { villages, rawCount, skipped } = await provider.loadFromJsonFile(inputPath);
    const fetchedAt = new Date().toISOString();
    const saved = repository.replaceVillages(villages, fetchedAt);
    console.log(JSON.stringify({
      ok: true,
      rawCount,
      skippedInvalid: skipped,
      savedVillages: saved.villages,
      savedPrograms: saved.programs,
      totalVillages: repository.getVillageCount(),
      totalPrograms: repository.getVillageProgramCount(),
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown village sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
