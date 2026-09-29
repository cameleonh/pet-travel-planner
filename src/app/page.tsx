import type { Metadata } from "next";
import { loadPlaceSnapshot } from "@/data/providers";
import { getCatalogCoverage, type CatalogPage } from "@/data/catalog";
import { PageContent } from "@/app/PageContent";
import { buildRegionOptions, getRegionPrefix } from "@/domain/regions";
import { LangProvider } from "@/i18n/LangContext";

// Regenerate the shell hourly instead of opt-ing out of caching entirely. The
// page keeps reading the live DB snapshot on each revalidation, but repeat
// visitors now get a cacheable HTML response instead of `no-store`.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const { snapshot, notice } = await loadPlaceSnapshot();
  const catalog: CatalogPage = {
    ...getCatalogCoverage(snapshot),
    filteredCount: 0,
    confirmedMatchCount: 0,
    confirmedNonMatchCount: 0,
    unverifiedCount: 0,
    unknownPlaceCount: 0,
    preparationFilteredCount: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    results: [],
    proposal: null,
  };
  const regionOptions = buildRegionOptions(snapshot.places);
  const placeCounts: Record<string, number> = {};
  for (const place of snapshot.places) {
    const prefix = getRegionPrefix(place.address);
    if (prefix) placeCounts[prefix] = (placeCounts[prefix] ?? 0) + 1;
  }
  return (
    <LangProvider initialLang="ko">
      <PageContent catalog={catalog} notice={notice} fetchedAt={snapshot.fetchedAt} regionOptions={regionOptions} placeCounts={placeCounts} />
    </LangProvider>
  );
}
