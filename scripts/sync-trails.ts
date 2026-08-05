import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { TrailProvider } from "../src/data/providers/trail-provider";

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const provider = new TrailProvider({ requestIntervalMs: 300 });

    console.log(JSON.stringify({ starting: true, message: "Fetching Durunubi trails..." }));

    const trails = await provider.fetchAllCourses();
    const fetchedAt = new Date().toISOString();

    console.log(JSON.stringify({ fetched: true, totalCourses: trails.length }));

    let saved = 0;
    for (const trail of trails) {
      repository.saveTrail(trail, fetchedAt);
      saved++;
    }

    const finalCount = repository.getTrailCount();
    const walking = trails.filter((t) => t.brd_div === "DNWW").length;
    const cycling = trails.filter((t) => t.brd_div === "DNBW").length;
    const easy = trails.filter((t) => t.crs_level === 1).length;
    const moderate = trails.filter((t) => t.crs_level === 2).length;
    const hard = trails.filter((t) => t.crs_level === 3).length;

    console.log(JSON.stringify({
      ok: true,
      totalCourses: trails.length,
      saved,
      totalInDb: finalCount,
      walking,
      cycling,
      byLevel: { easy, moderate, hard },
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown trail sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
