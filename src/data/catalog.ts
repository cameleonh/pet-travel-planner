import type { ProviderSnapshot, RawPlace } from "@/data/contracts";
import { getRegionSearchTerm } from "@/domain/regions";
import { evaluatePlace } from "@/domain/match";
import { normalizePlaces } from "@/domain/normalize";
import { findMinimalRelaxation } from "@/domain/relax";
import type { MatchEvaluation, NormalizedPlace, PreparationFilterKey, SelectedConstraint } from "@/domain/types";

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
  preparationFilteredCount: number;
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
  preparationFilters?: PreparationFilterKey[];
};

const indoorPatterns = [/실내.{0,12}(가능|동반|출입|허용)/, /실내.{0,8}동반/];
const outdoorPatterns = [/야외.{0,12}(가능|동반|출입|허용)/, /일부\s?구역.{0,12}(가능|동반)/, /전구역.{0,12}(가능|동반)/];

const noiseNamePatterns = [
  /약국/,
  /안경/,
  /편의점/,
  /마트$/,
  /슈퍼$/,
  /슈퍼마켓/,
  /세탁소/,
  /수선점/,
  /사진관/,
  /복권/,
  /혼수/,
  /이불/,
  /침구/,
  /의원/,
  /성형외과/,
  /피부과/,
  /치과/,
  /안과$/,
  /내과/,
  /외과/,
  /산부인과/,
  /소아과/,
  /정형외과/,
  /신경과/,
  /이비인후과/,
  /한의원/,
  /가정의학/,
  /올리브영/,
  /다이소/,
  /ABC마트/,
  /은행$/,
  /ATM/,
  /도매$/,
  /유통/,
  /물산$/,
  /상사$/,
  /힐튼종합/,
];

const MAX_EVALUATION_CACHE_ENTRIES = 32;

type PreparedCatalog = {
  places: NormalizedPlace[];
  searchTextById: Map<string, string>;
  noisePlaceIds: Set<string>;
  detailCoverage: number;
  pendingDetailCount: number;
  failedDetailCount: number;
  evaluations: Map<string, MatchEvaluation[]>;
};

let preparedCatalogCache = new WeakMap<ProviderSnapshot, PreparedCatalog>();
let cacheStats = { preparations: 0, evaluationBuilds: 0 };

export function clearCatalogCache(): void {
  preparedCatalogCache = new WeakMap<ProviderSnapshot, PreparedCatalog>();
  cacheStats = { preparations: 0, evaluationBuilds: 0 };
}

export function getCatalogCacheStats(): Readonly<typeof cacheStats> {
  return { ...cacheStats };
}

function isNoisePlace(place: { name: string; category: string }): boolean {
  if (place.category !== "shopping") return false;
  return noiseNamePatterns.some((p) => p.test(place.name));
}

function prepareCatalog(snapshot: ProviderSnapshot): PreparedCatalog {
  const cached = preparedCatalogCache.get(snapshot);
  if (cached) return cached;

  const detailPlaces: RawPlace[] = [];
  let pendingDetailCount = 0;
  let failedDetailCount = 0;
  for (const place of snapshot.places) {
    const status = place.petDetailStatus ?? "fetched";
    if (status === "fetched") detailPlaces.push(place);
    else if (status === "not-fetched") pendingDetailCount += 1;
    else if (status === "failed") failedDetailCount += 1;
  }

  const places = normalizePlaces(detailPlaces);
  const prepared: PreparedCatalog = {
    places,
    searchTextById: new Map(places.map((place) => {
      const area = place.address.trim().split(/\s+/)[0] ?? "";
      return [place.id, `${place.address} ${place.name} ${getRegionSearchTerm(area)}`.toLocaleLowerCase("ko-KR")];
    })),
    noisePlaceIds: new Set(places.filter(isNoisePlace).map((place) => place.id)),
    detailCoverage: detailPlaces.length,
    pendingDetailCount,
    failedDetailCount,
    evaluations: new Map(),
  };
  preparedCatalogCache.set(snapshot, prepared);
  cacheStats.preparations += 1;
  return prepared;
}

function constraintCacheKey(constraints: SelectedConstraint[]): string {
  return JSON.stringify(constraints.map(({ key, label, kind, protectedCategory }) => [key, label, kind, protectedCategory]));
}

function evaluatePreparedCatalog(prepared: PreparedCatalog, constraints: SelectedConstraint[]): MatchEvaluation[] {
  const key = constraintCacheKey(constraints);
  const cached = prepared.evaluations.get(key);
  if (cached) return cached;

  const evaluations = prepared.places.map((place) => evaluatePlace(place, constraints));
  if (prepared.evaluations.size >= MAX_EVALUATION_CACHE_ENTRIES) {
    const oldestKey = prepared.evaluations.keys().next().value as string | undefined;
    if (oldestKey !== undefined) prepared.evaluations.delete(oldestKey);
  }
  prepared.evaluations.set(key, evaluations);
  cacheStats.evaluationBuilds += 1;
  return evaluations;
}

function matchesPreparationFilter(evaluation: MatchEvaluation, filters: PreparationFilterKey[]): boolean {
  if (filters.length === 0) return true;
  const text = evaluation.place.policySource.sourceText ?? "";
  const hasPreparation = (key: PreparationFilterKey) => {
    if (key === "leash") return evaluation.place.requiredPreparations.some((p) => p.key === "leash");
    if (key === "carrier") return evaluation.place.requiredPreparations.some((p) => p.key === "carrier");
    if (key === "indoor") return indoorPatterns.some((p) => p.test(text));
    if (key === "outdoor") return outdoorPatterns.some((p) => p.test(text));
    return false;
  };
  return filters.every(hasPreparation);
}

export function buildCatalogPage(snapshot: ProviderSnapshot, query: CatalogQuery): CatalogPage {
  const prepared = prepareCatalog(snapshot);
  const regionTerms = query.region?.trim().toLocaleLowerCase("ko-KR").split(/\s+/).filter(Boolean) ?? [];
  const categories = new Set(query.categories ?? []);
  const constraints = [...query.hard, ...query.preferences];
  const allEvaluations = evaluatePreparedCatalog(prepared, constraints);
  const evaluations = allEvaluations.filter(({ place }) => {
    const searchText = prepared.searchTextById.get(place.id) ?? "";
    const regionMatches = regionTerms.every((term) => searchText.includes(term));
    const categoryMatches = categories.size === 0 || categories.has(place.category);
    if (!regionMatches || !categoryMatches) return false;
    const userPickedShopping = categories.has("shopping");
    if (userPickedShopping && prepared.noisePlaceIds.has(place.id)) return false;
    return true;
  });
  const places = evaluations.map((evaluation) => evaluation.place);
  const browsing = constraints.length === 0;
  const prepFilters = query.preparationFilters ?? [];
  const exactMatches = browsing ? [] : evaluations.filter((evaluation) => evaluation.exact);
  const prepFilteredExact = exactMatches.filter((evaluation) => matchesPreparationFilter(evaluation, prepFilters));
  const candidates = browsing ? evaluations.filter((evaluation) => matchesPreparationFilter(evaluation, prepFilters)) : prepFilteredExact;
  const confirmedMatchCount = browsing ? 0 : prepFilteredExact.length;
  const confirmedNonMatchCount = browsing ? 0 : evaluations.filter((result) => {
    if (result.status !== "confirmed-non-match") return false;
    if (!matchesPreparationFilter(result, prepFilters)) return false;
    return true;
  }).length;
  const unverifiedCount = browsing ? 0 : evaluations.filter((result) => {
    if (result.status !== "unverified") return false;
    if (!matchesPreparationFilter(result, prepFilters)) return false;
    return true;
  }).length;
  const totalPages = Math.max(1, Math.ceil(candidates.length / CATALOG_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(query.page)), totalPages);
  const start = (page - 1) * CATALOG_PAGE_SIZE;
  const relaxation = !browsing && exactMatches.length === 0
    ? findMinimalRelaxation(places, constraints)
    : null;

  return {
    sourceTotalCount: snapshot.sourceTotalCount ?? snapshot.places.length,
    searchableCount: places.length,
    detailCoverage: prepared.detailCoverage,
    pendingDetailCount: prepared.pendingDetailCount,
    failedDetailCount: prepared.failedDetailCount,
    filteredCount: candidates.length,
    confirmedMatchCount,
    confirmedNonMatchCount,
    unverifiedCount,
    unknownPlaceCount: unverifiedCount,
    preparationFilteredCount: prepFilters.length,
    page,
    pageSize: CATALOG_PAGE_SIZE,
    totalPages,
    results: candidates.slice(start, start + CATALOG_PAGE_SIZE),
    proposal: relaxation
      ? { removedPreferences: relaxation.removedPreferences, recoveredCount: relaxation.matches.length }
      : null,
  };
}
