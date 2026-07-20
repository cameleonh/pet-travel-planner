import type { ProviderSnapshot, RawPlace } from "@/data/contracts";
import { evaluatePlace, findExactMatches } from "@/domain/match";
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
  const detailPlaces = snapshot.places.filter((place) => (place.petDetailStatus ?? "fetched") === "fetched");
  const pendingDetailCount = snapshot.places.filter((place) => place.petDetailStatus === "not-fetched").length;
  const failedDetailCount = snapshot.places.filter((place) => place.petDetailStatus === "failed").length;
  const region = query.region?.trim().toLocaleLowerCase("ko-KR") ?? "";
  const categories = new Set(query.categories ?? []);
  const filteredPlaces = detailPlaces.filter((place) => {
    const regionMatches = !region || `${place.address} ${place.name}`.toLocaleLowerCase("ko-KR").includes(region);
    const categoryMatches = categories.size === 0 || categories.has(place.category);
    return regionMatches && categoryMatches;
  });
  const places = normalizePlaces(filteredPlaces);
  const constraints = [...query.hard, ...query.preferences];
  const browsing = constraints.length === 0;
  const evaluations = places.map((place) => evaluatePlace(place, constraints));
  const exactMatches = browsing ? [] : findExactMatches(places, constraints);
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