import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { matchFarmstaysToFarmstays, type FarmstayCandidate } from "../src/domain/farmstay-policy-match";

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const candidates = repository.loadFarmstayCandidates();
    console.log(JSON.stringify({ step: 1, activeFarmstaysWithCoords: candidates.length }));

    const snapshot = repository.loadLatestSnapshot();
    if (!snapshot) {
      console.error(JSON.stringify({ ok: false, error: "No successful tour-api snapshot exists; run db:sync first." }));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ step: 2, snapshotPlaces: snapshot.places.length, accommodations: snapshot.places.filter((p) => p.category === "accommodation").length }));

    const matches = matchFarmstaysToFarmstays(
      candidates.map<FarmstayCandidate>((row) => ({
        farmstayId: row.farmstay_id,
        businessName: row.business_name,
        latitude: row.latitude,
        longitude: row.longitude,
      })),
      snapshot.places,
    );
    console.log(JSON.stringify({ step: 3, matched: matches.length }));

    const saved = repository.replaceFarmstayPetPolicies(matches, new Date().toISOString());
    console.log(JSON.stringify({
      ok: true,
      candidates: candidates.length,
      saved,
      sample: matches.slice(0, 5).map((m) => ({ farmstay: m.farmstayId, place: m.placeName, meters: m.distanceMeters })),
      totalWithPolicy: repository.getFarmstayPetPolicyCount(),
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown farmstay pet-policy match error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
