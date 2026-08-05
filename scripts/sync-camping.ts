import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { CampingProvider } from "../src/data/providers/camping-provider";

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const snapshotId: number | null = repository.getLatestSnapshotId();
    if (snapshotId === null) {
      console.error(JSON.stringify({ ok: false, error: "No snapshot found. Run pet-tour sync first." }));
      process.exitCode = 1;
      return;
    }
    const snapId: number = snapshotId;

    const provider = new CampingProvider({
      requestBudget: { remaining: 1000 },
      requestIntervalMs: 200,
      rows: 1000,
    });

    console.log(JSON.stringify({ starting: true, message: "Fetching GoCamping catalog..." }));

    const places = await provider.fetchAllCampingPlaces();
    const petAdmitted = places.filter((p) => p.petAdmitted);

    console.log(JSON.stringify({
      fetched: true,
      totalCampingSites: places.length,
      petAdmitted: petAdmitted.length,
    }));

    const fetchedAt = new Date().toISOString();
    let saved = 0;

    for (const place of petAdmitted) {
      const item = place.item;
      repository.saveCamping(snapId, place.rawPlace.id, fetchedAt, {
        animal_cmg_cl: item.animalCmgCl,
        induty: item.induty,
        sbrs_cl: item.sbrsCl,
        glamp_site_co: item.glampSiteCo,
        carav_site_co: item.caravSiteCo,
        gnrl_site_co: item.gnrlSiteCo,
        oper_pd_cl: item.operPdCl,
        oper_de_cl: item.operDeCl,
        resve_url: item.resveUrl,
        first_image_url: item.firstImageUrl,
      });
      saved++;
    }

    const finalCount = repository.getCampingCount();

    console.log(JSON.stringify({
      ok: true,
      totalCampingSites: places.length,
      petAdmittedCount: petAdmitted.length,
      saved,
      totalCamping: finalCount,
      quotaRemaining: provider.remainingQuota,
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown camping sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
