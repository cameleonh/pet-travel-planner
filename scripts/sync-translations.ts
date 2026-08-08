import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { MultilingualProvider, coordinateKey, type Language } from "../src/data/providers/multilingual-provider";

async function main(): Promise<void> {
  const language = (process.env.TRANSLATION_LANGUAGE ?? "en") as Language;
  if (language !== "en" && language !== "zh") {
    console.error(JSON.stringify({ ok: false, error: `Invalid language: ${language}. Use 'en' or 'zh'.` }));
    process.exitCode = 1;
    return;
  }

  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const snapshotId: number | null = repository.getLatestSnapshotId();
    if (snapshotId === null) {
      console.error(JSON.stringify({ ok: false, error: "No snapshot found." }));
      process.exitCode = 1;
      return;
    }
    const snapId: number = snapshotId;

    const snapshot = repository.loadLatestSnapshot();
    if (!snapshot) {
      console.error(JSON.stringify({ ok: false, error: "No snapshot found." }));
      process.exitCode = 1;
      return;
    }

    // Build coordinate → placeId map for matching (4 decimal places ≈ 11m precision)
    const coordinateToPlaceId = new Map<string, string>();
    for (const p of snapshot.places) {
      const key = coordinateKey(p.coordinates.latitude, p.coordinates.longitude);
      coordinateToPlaceId.set(key, p.id);
    }

    const langLabel = language === "en" ? "English" : "Chinese";
    console.log(JSON.stringify({ step: 1, message: `Fetching ${langLabel} translations, matching by coordinates (${coordinateToPlaceId.size} places)...` }));

    const budget = { remaining: 950 };
    const provider = new MultilingualProvider({ requestBudget: budget, requestIntervalMs: 200 });

    const translations = await provider.fetchTranslations(language, coordinateToPlaceId);

    console.log(JSON.stringify({ step: 2, matched: translations.size, quotaUsed: 950 - provider.remainingQuota }));

    const fetchedAt = new Date().toISOString();
    let saved = 0;
    for (const [placeId, translated] of translations) {
      repository.saveTranslation(snapId, placeId, language, fetchedAt, {
        title: translated.title,
        address: translated.address,
        overview: translated.overview,
      });
      saved++;
    }

    const totalCount = repository.getTranslationCount(language);

    console.log(JSON.stringify({
      ok: true,
      language,
      matched: translations.size,
      saved,
      totalTranslations: totalCount,
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown translation sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
