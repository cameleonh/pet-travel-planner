import type { Metadata } from "next";
import { loadPlaceSnapshot } from "@/data/providers";
import { getCatalogCoverage, type CatalogPage } from "@/data/catalog";
import { PageContent } from "@/app/PageContent";
import { buildRegionOptions, getRegionPrefix } from "@/domain/regions";
import { normalizePlace } from "@/domain/normalize";
import type { CompanionCandidate } from "@/domain/companion";
import type { RawPlace } from "@/data/contracts";
import { LangProvider } from "@/i18n/LangContext";

// Regenerate the shell hourly instead of opt-ing out of caching entirely. The
// page keeps reading the live DB snapshot on each revalidation, but repeat
// visitors now get a cacheable HTML response instead of `no-store`.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const COMPANION_CANDIDATE_LIMIT = 30;

/**
 * A small, bounded sample of confirmed-admission places for the companion dog to
 * recommend. Even sampling across the catalog keeps the suggested regions varied
 * without normalizing every stored row on each request.
 */
function buildCompanionCandidates(places: RawPlace[]): CompanionCandidate[] {
  if (places.length === 0) return [];
  const candidates: CompanionCandidate[] = [];
  const stride = Math.max(1, Math.floor(places.length / 400));
  for (let index = 0; index < places.length && candidates.length < COMPANION_CANDIDATE_LIMIT; index += stride) {
    const place = places[index];
    if (!place) continue;
    const facts = normalizePlace(place).facts;
    const admitted = facts.smallDog.value === "true" || facts.mediumDog.value === "true" || facts.largeDog.value === "true";
    if (!admitted) continue;
    candidates.push({ id: place.id, name: place.name, region: getRegionPrefix(place.address) ?? "", confirmed: true });
  }
  return candidates;
}

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
  const companionCandidates = buildCompanionCandidates(snapshot.places);
  const placeCounts: Record<string, number> = {};
  for (const place of snapshot.places) {
    const prefix = getRegionPrefix(place.address);
    if (prefix) placeCounts[prefix] = (placeCounts[prefix] ?? 0) + 1;
  }
  return (
    <LangProvider initialLang="ko">
      <PageContent catalog={catalog} notice={notice} fetchedAt={snapshot.fetchedAt} regionOptions={regionOptions} placeCounts={placeCounts} companionCandidates={companionCandidates} />
    </LangProvider>
  );
}
