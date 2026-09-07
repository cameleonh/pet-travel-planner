import { loadPlaceSnapshot } from "@/data/providers";
import { buildCatalogPage } from "@/data/catalog";
import { PageContent } from "@/app/PageContent";
import { buildRegionOptions, getRegionPrefix } from "@/domain/regions";
import { LangProvider } from "@/i18n/LangContext";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { snapshot, notice } = await loadPlaceSnapshot();
  const catalog = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1 });
  const regionOptions = buildRegionOptions(snapshot.places);
  const placeCounts: Record<string, number> = {};
  for (const place of snapshot.places) {
    const prefix = getRegionPrefix(place.address);
    if (prefix) placeCounts[prefix] = (placeCounts[prefix] ?? 0) + 1;
  }
  return (
    <LangProvider initialLang="ko">
      <PageContent catalog={catalog} notice={notice} fetchedAt={snapshot.fetchedAt} auxiliaryPlaces={snapshot.auxiliaryPlaces} regionOptions={regionOptions} placeCounts={placeCounts} />
    </LangProvider>
  );
}
