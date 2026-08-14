import { cookies } from "next/headers";
import { loadPlaceSnapshot } from "@/data/providers";
import { buildCatalogPage } from "@/data/catalog";
import { PageContent } from "@/app/PageContent";
import { buildRegionOptions } from "@/domain/regions";
import { LangProvider } from "@/i18n/LangContext";
import type { Lang } from "@/i18n/dictionary";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const savedLang = (await cookies()).get("pet-travel-planner-language")?.value;
  const initialLang: Lang = savedLang === "en" || savedLang === "zh" ? savedLang : "ko";
  const { snapshot, dataSource, notice } = await loadPlaceSnapshot();
  const catalog = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1 });
  const regionOptions = buildRegionOptions(snapshot.places);
  return (
    <LangProvider initialLang={initialLang}>
      <PageContent catalog={catalog} dataSource={dataSource} notice={notice} fetchedAt={snapshot.fetchedAt} auxiliaryPlaces={snapshot.auxiliaryPlaces} regionOptions={regionOptions} />
    </LangProvider>
  );
}
