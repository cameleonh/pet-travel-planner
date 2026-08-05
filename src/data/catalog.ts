import type { ProviderSnapshot, RawPlace } from "@/data/contracts";
import { evaluatePlace } from "@/domain/match";
import { normalizePlaces } from "@/domain/normalize";
import { findMinimalRelaxation } from "@/domain/relax";
import type { MatchEvaluation, SelectedConstraint } from "@/domain/types";

export const CATALOG_PAGE_SIZE = 50;

export type CatalogRelaxation = {
  removedPreferences: SelectedConstraint[];
  recoveredCount: number;
};

export type CatalogPage = {
  sourceTotalCount: number;
  searchableCount: number;
  detailCoverage: number;
  pendingDetailCount: number;
  failedDetailCount: number;
  filteredCount: number;
  confirmedMatchCount: number;
  confirmedNonMatchCount: number;
  unverifiedCount: number;
  unknownPlaceCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: MatchEvaluation[];
  proposal: CatalogRelaxation | null;
};

export type CatalogQuery = {
  hard: SelectedConstraint[];
  preferences: SelectedConstraint[];
  page: number;
  region?: string;
  categories?: RawPlace["category"][];
};

export function buildCatalogPage(snapshot: ProviderSnapshot, query: CatalogQuery): CatalogPage {
  const detailPlaces: RawPlace[] = [];
  let pendingDetailCount = 0;
  let failedDetailCount = 0;
  for (const place of snapshot.places) {
    const status = place.petDetailStatus ?? "fetched";
    if (status === "fetched") detailPlaces.push(place);
    else if (status === "not-fetched") pendingDetailCount += 1;
    else if (status === "failed") failedDetailCount += 1;
  }
  const regionTerms = query.region?.trim().toLocaleLowerCase("ko-KR").split(/\s+/).filter(Boolean) ?? [];
  const categories = new Set(query.categories ?? []);
  const filteredPlaces = detailPlaces.filter((place) => {
    const searchText = `${place.address} ${place.name}`.toLocaleLowerCase("ko-KR");
    const regionMatches = regionTerms.every((term) => searchText.includes(term));
    const categoryMatches = categories.size === 0 || categories.has(place.category);
    return regionMatches && categoryMatches;
  });
  const places = normalizePlaces(filteredPlaces);
  const constraints = [...query.hard, ...query.preferences];
  const browsing = constraints.length === 0;
  const evaluations = places.map((place) => evaluatePlace(place, constraints));
  const exactMatches = browsing ? [] : evaluations.filter((evaluation) => evaluation.exact);
  const candidates = browsing ? evaluations : exactMatches;
  const confirmedMatchCount = browsing ? 0 : evaluations.filter((result) => result.status === "confirmed-match").length;
  const confirmedNonMatchCount = browsing ? 0 : evaluations.filter((result) => result.status === "confirmed-non-match").length;
  const unverifiedCount = browsing ? 0 : evaluations.filter((result) => result.status === "unverified").length;
  const totalPages = Math.max(1, Math.ceil(candidates.length / CATALOG_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(query.page)), totalPages);
  const start = (page - 1) * CATALOG_PAGE_SIZE;
  const relaxation = !browsing && exactMatches.length === 0
    ? findMinimalRelaxation(places, constraints)
    : null;

  return {
    sourceTotalCount: snapshot.sourceTotalCount ?? snapshot.places.length,
    searchableCount: places.length,
    detailCoverage: detailPlaces.length,
    pendingDetailCount,
    failedDetailCount,
    filteredCount: candidates.length,
    confirmedMatchCount,
    confirmedNonMatchCount,
    unverifiedCount,
    unknownPlaceCount: unverifiedCount,
    page,
    pageSize: CATALOG_PAGE_SIZE,
    totalPages,
    results: candidates.slice(start, start + CATALOG_PAGE_SIZE),
    proposal: relaxation
      ? { removedPreferences: relaxation.removedPreferences, recoveredCount: relaxation.matches.length }
      : null,
  };
}
