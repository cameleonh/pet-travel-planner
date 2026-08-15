import { loadPlaceSnapshot } from "@/data/providers";
import { buildCatalogPage } from "@/data/catalog";
import { PageContent } from "@/app/PageContent";
import { buildRegionOptions } from "@/domain/regions";
import { LangProvider } from "@/i18n/LangContext";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { snapshot, notice } = await loadPlaceSnapshot();
  const catalog = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1 });
  const regionOptions = buildRegionOptions(snapshot.places);
  return (
    <LangProvider initialLang="ko">
      <PageContent catalog={catalog} notice={notice} fetchedAt={snapshot.fetchedAt} auxiliaryPlaces={snapshot.auxiliaryPlaces} regionOptions={regionOptions} />
    </LangProvider>
  );
}
