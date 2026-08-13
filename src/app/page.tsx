import { loadPlaceSnapshot } from "@/data/providers";
import { buildCatalogPage } from "@/data/catalog";
import { LangProvider } from "@/i18n/LangContext";
import { PageContent } from "@/app/PageContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { snapshot, dataSource, notice } = await loadPlaceSnapshot();
  const catalog = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1 });
  return (
    <LangProvider>
      <PageContent catalog={catalog} dataSource={dataSource} notice={notice} fetchedAt={snapshot.fetchedAt} auxiliaryPlaces={snapshot.auxiliaryPlaces} />
    </LangProvider>
  );
}
