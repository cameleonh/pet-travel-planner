"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { AuxiliaryPlace, RawPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import type { RegionOption } from "@/domain/regions";
import { type ConditionKey, type MatchEvaluation, type PreparationFilterKey, type SelectedConstraint } from "@/domain/types";
import { ConditionPicker } from "@/features/search/ConditionPicker";
import { PetProfilePanel } from "@/features/search/PetProfilePanel";
import { DestinationPanel } from "@/features/search/DestinationPanel";
import { ResultCard, type PublicClosureStatus } from "@/features/results/ResultCard";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";
import type { AccessibilityData } from "@/features/results/AccessibilitySection";
import type { PlanPlace } from "@/domain/plan";
import { PlanBuilder } from "@/features/planner/PlanBuilder";
import type { CampingData } from "@/features/results/CampingSection";
import type { CongestionData } from "@/features/results/CongestionSection";
import type { TranslationData } from "@/features/results/TranslationSection";
import { TrailSection, type TrailData } from "@/features/results/TrailSection";
import { FestivalSection, type FestivalData } from "@/features/results/FestivalSection";
import { ZeroResultRecovery } from "@/features/results/ZeroResultRecovery";
import { NearbyCatalog } from "@/features/nearby/NearbyCatalog";
import { NearbyServices } from "@/features/nearby/NearbyServices";
import { CourseBuilder } from "@/features/course/CourseBuilder";

const condLabelKeys: Record<ConditionKey, "smallDog" | "mediumDog" | "largeDog"> = { smallDog: "smallDog", mediumDog: "mediumDog", largeDog: "largeDog" };
const prepFilterKeys: Record<PreparationFilterKey, "leash" | "carrier" | "indoor" | "outdoor"> = { leash: "leash", carrier: "carrier", indoor: "indoor", outdoor: "outdoor" };

function selected(key: ConditionKey, kind: SelectedConstraint["kind"], lang: ReturnType<typeof useLang>["lang"]): SelectedConstraint {
  return { key, label: t(lang, condLabelKeys[key]), kind, protectedCategory: kind === "hard" ? "admission" : null };
}

type CatalogApiResponse = {
  success: boolean;
  data: { catalog: CatalogPage; accessibility?: Record<string, AccessibilityData>; camping?: Record<string, CampingData>; congestion?: Record<string, CongestionData>; translations?: Record<string, TranslationData>; lang?: string } | null;
  error: { message: string } | null;
};

type CatalogApiData = NonNullable<CatalogApiResponse["data"]>;

const MAX_CLIENT_CATALOG_CACHE_ENTRIES = 32;
const catalogResponseCache = new Map<string, CatalogApiData>();

function getCachedCatalog(url: string): CatalogApiData | undefined {
  const cached = catalogResponseCache.get(url);
  if (!cached) return undefined;
  catalogResponseCache.delete(url);
  catalogResponseCache.set(url, cached);
  return cached;
}

function cacheCatalog(url: string, data: CatalogApiData): void {
  catalogResponseCache.set(url, data);
  if (catalogResponseCache.size <= MAX_CLIENT_CATALOG_CACHE_ENTRIES) return;
  const oldest = catalogResponseCache.keys().next().value as string | undefined;
  if (oldest) catalogResponseCache.delete(oldest);
}

async function fetchCatalog(url: string, signal?: AbortSignal): Promise<CatalogApiData> {
  const cached = getCachedCatalog(url);
  if (cached) return cached;
  const response = await fetch(url, { signal });
  const body = await response.json() as CatalogApiResponse;
  if (!response.ok || !body.success || !body.data) throw new Error(body.error?.message ?? "Error");
  cacheCatalog(url, body.data);
  return body.data;
}

type ClosureApiResponse = { success: boolean; closures: Record<string, PublicClosureStatus["closures"]> };

export function SearchExperience({ initialCatalog, auxiliaryPlaces, regionOptions }: { initialCatalog: CatalogPage; auxiliaryPlaces: AuxiliaryPlace[]; regionOptions: RegionOption[] }) {
  const { lang, dict } = useLang();
  const [petSize, setPetSize] = useState<ConditionKey | null>(null);
  const [petWeight, setPetWeight] = useState("");
  const [dangerousDog, setDangerousDog] = useState(false);
  const [region, setRegion] = useState("");
  const [categories, setCategories] = useState<RawPlace["category"][]>([]);
  const [hard, setHard] = useState<ConditionKey[]>([]);
  const [preferences, setPreferences] = useState<ConditionKey[]>([]);
  const [prepFilters, setPrepFilters] = useState<PreparationFilterKey[]>([]);
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [catalogRequestKey, setCatalogRequestKey] = useState("||1||");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closureByPlaceId, setClosureByPlaceId] = useState<Record<string, PublicClosureStatus>>({});
  const [accessibilityByPlaceId, setAccessibilityByPlaceId] = useState<Record<string, AccessibilityData>>({});
  const [campingByPlaceId, setCampingByPlaceId] = useState<Record<string, CampingData>>({});
  const [congestionByPlaceId, setCongestionByPlaceId] = useState<Record<string, CongestionData>>({});
  const [translationByPlaceId, setTranslationByPlaceId] = useState<Record<string, TranslationData>>({});
  const [planPlaces, setPlanPlaces] = useState<PlanPlace[]>([]);
  const [trails, setTrails] = useState<TrailData[]>([]);
  const [festivals, setFestivals] = useState<FestivalData[]>([]);
  const constraints = useMemo(() => {
    const seen = new Set<string>();
    const result: SelectedConstraint[] = [];
    for (const key of hard) {
      const id = `${key}-hard`;
      if (!seen.has(id)) { seen.add(id); result.push(selected(key, "hard", lang)); }
    }
    for (const key of preferences) {
      const id = `${key}-preference`;
      if (!seen.has(id)) { seen.add(id); result.push(selected(key, "preference", lang)); }
    }
    return result;
  }, [hard, preferences, lang]);
  const isBrowsing = constraints.length === 0;
  const hardKeys = useMemo(() => constraints.filter((item) => item.kind === "hard").map((item) => item.key), [constraints]);
  const preferenceKeys = useMemo(() => constraints.filter((item) => item.kind === "preference").map((item) => item.key), [constraints]);
  const requestKey = `${hardKeys.join(",")}|${preferenceKeys.join(",")}|${page}|${region.trim()}|${categories.join(",")}|${prepFilters.join(",")}|${lang}`;
  const catalogIsCurrent = catalogRequestKey === requestKey;
  const exactPageResults = catalogIsCurrent ? catalog.results.filter((result) => result.exact) : [];
  const allPagePlaces = catalogIsCurrent ? catalog.results.map((r) => r.place) : [];
  const centroid = allPagePlaces.length > 0 ? {
    latitude: allPagePlaces.reduce((sum, p) => sum + p.coordinates.latitude, 0) / allPagePlaces.length,
    longitude: allPagePlaces.reduce((sum, p) => sum + p.coordinates.longitude, 0) / allPagePlaces.length,
  } : null;
  const referencePlace = exactPageResults[0]?.place ?? (catalogIsCurrent ? catalog.results[0]?.place : undefined);

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams({ page: String(page) });
    if (hardKeys.length > 0) parameters.set("hard", hardKeys.join(","));
    if (preferenceKeys.length > 0) parameters.set("preferences", preferenceKeys.join(","));
    if (region.trim()) parameters.set("region", region.trim());
    if (categories.length > 0) parameters.set("categories", categories.join(","));
    if (prepFilters.length > 0) parameters.set("prep", prepFilters.join(","));
    if (lang !== "ko") parameters.set("lang", lang);
    const catalogUrl = `/api/places?${parameters}`;
    const cachedCatalog = getCachedCatalog(catalogUrl);
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(!cachedCatalog);
      setErrorMessage(null);
    });
    (cachedCatalog ? Promise.resolve(cachedCatalog) : fetchCatalog(catalogUrl, controller.signal))
      .then((data) => {
        if (controller.signal.aborted) return;
        setCatalog(data.catalog);
        setAccessibilityByPlaceId(data.accessibility ?? {});
        setCampingByPlaceId(data.camping ?? {});
        setCongestionByPlaceId(data.congestion ?? {});
        setTranslationByPlaceId(data.translations ?? {});
        setClosureByPlaceId({});
        setCatalogRequestKey(requestKey);
        const placeIds = data.catalog.results.map((result) => result.place.id);

        const closureTask = placeIds.length === 0 ? Promise.resolve() : (async () => {
          const closureParameters = new URLSearchParams({ ids: placeIds.join(",") });
          const closureResponse = await fetch(`/api/places/closures?${closureParameters}`, { signal: controller.signal });
          const closureBody = await closureResponse.json() as ClosureApiResponse;
          if (closureResponse.ok && closureBody.success) setClosureByPlaceId(Object.fromEntries(Object.entries(closureBody.closures).map(([placeId, closures]) => [placeId, { closures }])));
        })().catch(() => { if (!controller.signal.aborted) setClosureByPlaceId({}); });

        const trailTask = region.trim() ? (async () => {
          const trailResponse = await fetch(`/api/trails?region=${encodeURIComponent(region.trim())}`, { signal: controller.signal });
          const trailBody = await trailResponse.json() as { success: boolean; data?: { trails: TrailData[] } };
          if (trailResponse.ok && trailBody.success && trailBody.data) setTrails(trailBody.data.trails as TrailData[]);
          else setTrails([]);
        })().catch(() => { if (!controller.signal.aborted) setTrails([]); }) : Promise.resolve().then(() => { if (!controller.signal.aborted) setTrails([]); });

        const festivalTask = (async () => {
          const festivalParams = new URLSearchParams();
          if (region.trim()) festivalParams.set("region", region.trim());
          const festivalResponse = await fetch(`/api/festivals?${festivalParams}`, { signal: controller.signal });
          const festivalBody = await festivalResponse.json() as { success: boolean; data?: { festivals: FestivalData[] } };
          if (festivalResponse.ok && festivalBody.success && festivalBody.data) setFestivals(festivalBody.data.festivals as FestivalData[]);
          else setFestivals([]);
        })().catch(() => { if (!controller.signal.aborted) setFestivals([]); });

        void Promise.all([closureTask, trailTask, festivalTask]);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage(dict.errorMessage);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hardKeys, preferenceKeys, page, region, categories, prepFilters, lang, requestKey, dict]);

  const togglePrepFilter = (key: PreparationFilterKey) => {
    setPage(1);
    setPrepFilters((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };
  const selectSize = (key: ConditionKey | null) => {
    setPage(1);
    setPetSize(key);
    setHard((current) => {
      const next = key ? (current.includes(key) ? current : [...current, key]) : current.filter((item) => item !== petSize);
      return [...new Set(next)];
    });
  };
  const changeWeight = (value: string) => {
    setPage(1);
    setPetWeight(value);
    const weight = Number(value);
    const newSize: ConditionKey | null = !value || !Number.isFinite(weight) || weight <= 0 ? null : weight < 10 ? "smallDog" : weight < 25 ? "mediumDog" : "largeDog";
    setHard((current) => {
      const withoutOld = petSize && petSize !== newSize ? current.filter((item) => item !== petSize) : current;
      const next = newSize && !withoutOld.includes(newSize) ? [...withoutOld, newSize] : withoutOld;
      return [...new Set(next)];
    });
    setPetSize(newSize);
  };
  const toggleCategory = (category: RawPlace["category"]) => {
    setPage(1);
    setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  };
  const resultCount = isBrowsing ? catalog.searchableCount : catalog.confirmedMatchCount;

  const togglePlanPlace = useCallback((result: MatchEvaluation) => {
    const place = result.place;
    const planPlace: PlanPlace = {
      id: place.id,
      name: place.name,
      address: place.address,
      category: place.category,
      coordinates: place.coordinates,
      policySourceText: place.policySource.sourceText,
      exact: result.exact,
    };
    setPlanPlaces((current) => current.some((p) => p.id === place.id) ? current.filter((p) => p.id !== place.id) : [...current, planPlace]);
  }, []);

  const removePlanPlace = useCallback((id: string) => setPlanPlaces((current) => current.filter((p) => p.id !== id)), []);
  const clearPlanPlaces = useCallback(() => setPlanPlaces([]), []);

  return (
    <section className="search-workspace" id="search" aria-label={dict.findPlace}>
      <div className="control-panel">
        <header className="control-heading">
          <div><p className="section-kicker">{dict.findPlace}</p><h2>{dict.searchHeading}</h2></div>
          <p>{dict.searchDesc1} <span className="keep-together">{dict.searchDesc2}</span> <span className="keep-together">{dict.searchDesc3}</span></p>
        </header>
        <aside className="filter-panel">
          <PetProfilePanel selected={petSize} weight={petWeight} dangerousDog={dangerousDog} onSelect={selectSize} onWeightChange={changeWeight} onDangerousDogChange={setDangerousDog} />
          <ConditionPicker region={region} regionOptions={regionOptions} prepFilters={prepFilters} onRegionChange={(value) => { setPage(1); setRegion(value); }} onTogglePrepFilter={togglePrepFilter} />
          <DestinationPanel selectedCategories={categories} onToggleCategory={toggleCategory} />
        </aside>
      </div>
      <div className="results-panel interactive-results" aria-busy={loading}>
        <div className="result-heading">
          <div><p className="section-kicker">{isBrowsing ? dict.nationwidePlaces : dict.confirmedResults}</p><h2>{!catalogIsCurrent ? dict.checkingConditions : isBrowsing ? `${resultCount.toLocaleString("ko-KR")}${dict.browseAll}` : resultCount > 0 ? t(lang, "confirmedCount", { n: resultCount.toLocaleString("ko-KR") }) : dict.noConfirmedYet}</h2></div>
          {catalogIsCurrent ? <p className="result-count" aria-live="polite"><strong>{resultCount.toLocaleString("ko-KR")}</strong><span>{dict.places}</span></p> : null}
        </div>
        <p className="catalog-coverage">{dict.coverageDetail} {catalog.searchableCount.toLocaleString("ko-KR")}{dict.places} · {dict.coverageSource} {catalog.sourceTotalCount.toLocaleString("ko-KR")}{dict.places} · {dict.coverageRate} {catalog.sourceTotalCount > 0 ? ((catalog.detailCoverage / catalog.sourceTotalCount) * 100).toFixed(1) : "0.0"}% · {dict.coverageNotFetched} {catalog.pendingDetailCount.toLocaleString("ko-KR")}{dict.places} · {dict.coverageFailed} {catalog.failedDetailCount.toLocaleString("ko-KR")}{dict.places}</p>
        {!isBrowsing && catalogIsCurrent ? <dl className="decision-summary" aria-label={dict.confirmedMatch}>
          <div><dt>{dict.confirmedMatch}</dt><dd>{catalog.confirmedMatchCount.toLocaleString("ko-KR")}</dd></div>
          <div><dt>{dict.confirmedNonMatch}</dt><dd>{catalog.confirmedNonMatchCount.toLocaleString("ko-KR")}</dd></div>
          <div><dt>{dict.unverified}</dt><dd>{catalog.unverifiedCount.toLocaleString("ko-KR")}</dd></div>
        </dl> : null}
        <div className="match-bar"><strong>{isBrowsing ? dict.browsingFilter : dict.allApplied}</strong><div className="active-query" aria-label={dict.currentConditions}>{region.trim() ? <span key="region">{region.trim()}</span> : null}{categories.map((category) => <span key={`cat-${category}`}>{category}</span>)}{isBrowsing && !region.trim() && categories.length === 0 && prepFilters.length === 0 ? <span key="all">{dict.allPlaces}</span> : constraints.map((item, idx) => <span key={`c-${idx}`}>{item.label}{item.kind === "preference" ? <small>{dict.preference}</small> : null}</span>)}{prepFilters.map((key) => <span key={`prep-${key}`}>{t(lang, prepFilterKeys[key])}</span>)}</div></div>
        {(loading || !catalogIsCurrent) && !errorMessage ? <p className="catalog-status" role="status">{dict.loadingMessage}</p> : null}
        {errorMessage ? <p className="catalog-error" role="alert">{errorMessage}</p> : null}
        {catalogIsCurrent ? (
          <>
            {catalogIsCurrent && festivals.length > 0 ? (
              <div className="discovery-row">
                {region.trim() && trails.length > 0 ? <TrailSection trails={trails} region={region.trim()} /> : null}
                <FestivalSection festivals={festivals} />
              </div>
            ) : null}
            {catalog.results.length > 0 ? <div className="place-list">{catalog.results.map((result) => <div className="place-row" key={result.place.id}><ResultCard result={result} dangerousDog={dangerousDog} closureStatus={closureByPlaceId[result.place.id]} accessibility={accessibilityByPlaceId[result.place.id]} camping={campingByPlaceId[result.place.id]} congestion={congestionByPlaceId[result.place.id]} translation={translationByPlaceId[result.place.id]} lang={lang} /><button type="button" className={`plan-add-button ${planPlaces.some((p) => p.id === result.place.id) ? "added" : ""}`} onClick={() => togglePlanPlace(result)} aria-label={planPlaces.some((p) => p.id === result.place.id) ? dict.planRemove : dict.planAdd}>{planPlaces.some((p) => p.id === result.place.id) ? dict.planAdded : dict.planAdd}</button></div>)}</div> : <ZeroResultRecovery proposal={catalog.proposal} unverifiedCount={catalog.unverifiedCount} onApply={() => catalog.proposal && setPreferences((current) => current.filter((key) => !catalog.proposal?.removedPreferences.some((item) => item.key === key)))} />}
            {!isBrowsing && catalog.confirmedMatchCount > 0 && catalog.unverifiedCount > 0 ? <p className="unknown-note"><strong>{t(lang, "unknownNote", { n: catalog.unverifiedCount.toLocaleString("ko-KR") })}</strong></p> : null}
            <nav className="catalog-pagination" aria-label={dict.confirmedResults}>
              <button type="button" disabled={loading || catalog.page <= 1} onClick={() => setPage(Math.max(1, catalog.page - 1))}>{dict.prevPage}</button>
              <span><strong>{catalog.page.toLocaleString("ko-KR")}</strong> / {catalog.totalPages.toLocaleString("ko-KR")}{dict.pageOf}</span>
              <button type="button" disabled={loading || catalog.page >= catalog.totalPages} onClick={() => setPage(Math.min(catalog.totalPages, catalog.page + 1))}>{dict.nextPage}</button>
            </nav>
            {planPlaces.length > 0 ? (
              <PlanBuilder selectedPlaces={planPlaces} onRemove={removePlanPlace} onClear={clearPlanPlaces} />
            ) : null}
            {!isBrowsing && exactPageResults.length > 0 ? (
              <CourseBuilder key={constraints.map((item) => `${item.key}:${item.kind}`).join("|")} matches={exactPageResults} origin={referencePlace?.coordinates ?? exactPageResults[0]!.place.coordinates} />
            ) : null}
            {(referencePlace || centroid) ? (
              <div className="extensions">
                {region.trim() ? (
                  <>
                    {auxiliaryPlaces.length > 0 && referencePlace ? <NearbyCatalog places={auxiliaryPlaces} fallbackOrigin={referencePlace.coordinates} referenceName={referencePlace.name} /> : null}
                    <NearbyServices origin={centroid ?? referencePlace!.coordinates} referenceName={region.trim()} />
                  </>
                ) : (
                  <div className="nearby-hint">
                    <p>{dict.nearbyHintTitle}</p>
                    <p className="hint-example">{dict.nearbyHintExample}</p>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
