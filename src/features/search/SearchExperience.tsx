"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { AuxiliaryPlace, RawPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import type { RegionOption } from "@/domain/regions";
import { conditionKeys, type ConditionKey, type MatchEvaluation, type PreparationFilterKey, type SelectedConstraint } from "@/domain/types";
import { ConditionPicker } from "@/features/search/ConditionPicker";
import { PetProfilePanel } from "@/features/search/PetProfilePanel";
import { DestinationPanel } from "@/features/search/DestinationPanel";
import { ResultCard, type PublicClosureStatus } from "@/features/results/ResultCard";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";
import type { AccessibilityData } from "@/features/results/AccessibilitySection";
import type { PlanActivity, PlanPlace } from "@/domain/plan";
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
  const [planActivities, setPlanActivities] = useState<PlanActivity[]>([]);
  const [planGenerationRequest, setPlanGenerationRequest] = useState(0);
  const [courseConfirmed, setCourseConfirmed] = useState(false);
  const [trails, setTrails] = useState<TrailData[]>([]);
  const [festivals, setFestivals] = useState<FestivalData[]>([]);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryLoadedRegion, setDiscoveryLoadedRegion] = useState<string | null>(null);
  const [nearbyActivatedFor, setNearbyActivatedFor] = useState<string | null>(null);
  const [nearbyOpenFor, setNearbyOpenFor] = useState<string | null>(null);
  const [regionalReviewedFor, setRegionalReviewedFor] = useState<string | null>(null);
  const [nearbyReviewedFor, setNearbyReviewedFor] = useState<string | null>(null);
  const [selectionCompleted, setSelectionCompleted] = useState(false);
  const plannerDialogRef = useRef<HTMLDivElement>(null);
  const tripTrayRef = useRef<HTMLButtonElement>(null);
  const selectionCompleteRef = useRef<HTMLButtonElement>(null);
  const plannerReturnFocusRef = useRef<HTMLElement | null>(null);
  const supplementalChoicesRef = useRef<HTMLElement>(null);
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
  const nearbyAnchor = planPlaces[0];
  const selectedPlaceIds = useMemo(() => new Set(planPlaces.map((place) => place.id)), [planPlaces]);
  const auxiliaryPlaceIds = useMemo(() => new Set(auxiliaryPlaces.map((place) => place.id)), [auxiliaryPlaces]);
  const selectedActivityIds = useMemo(
    () => [...planActivities.map((activity) => activity.id), ...planPlaces.filter((place) => place.id.startsWith("festival:") || place.id.startsWith("trail:")).map((place) => place.id)],
    [planActivities, planPlaces],
  );
  const planItemCount = planPlaces.length + planActivities.length;
  const hasPlanItems = planItemCount > 0;
  const regionalSelectionCount = selectedActivityIds.length;
  const nearbySelectionCount = planPlaces.filter((place) => place.id.startsWith("nearby-service:") || auxiliaryPlaceIds.has(place.id)).length;
  const regionalReviewRequired = Boolean(region.trim());
  const nearbyReviewRequired = Boolean(nearbyAnchor);
  const regionalReviewComplete = !regionalReviewRequired || regionalReviewedFor === region.trim();
  const nearbyReviewComplete = !nearbyReviewRequired || nearbyReviewedFor === nearbyAnchor?.id;
  const supplementalReviewComplete = regionalReviewComplete && nearbyReviewComplete;
  const supplementalReviewTotal = Number(regionalReviewRequired) + Number(nearbyReviewRequired);
  const supplementalReviewDone = Number(regionalReviewComplete && regionalReviewRequired) + Number(nearbyReviewComplete && nearbyReviewRequired);
  const visibleResults = catalogIsCurrent ? catalog.results : [];
  const closePlanner = useCallback(() => {
    setPlannerOpen(false);
    globalThis.setTimeout(() => (plannerReturnFocusRef.current ?? tripTrayRef.current)?.focus(), 0);
  }, []);

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

        void closureTask;
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

  useEffect(() => {
    if (!discoveryOpen || !region.trim() || discoveryLoadedRegion === region.trim()) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setDiscoveryLoading(true);
    });
    const trailTask = fetch(`/api/trails?region=${encodeURIComponent(region.trim())}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ success: boolean; data?: { trails: TrailData[] } }>)
      .then((body) => { if (!controller.signal.aborted) setTrails(body.success && body.data ? body.data.trails : []); })
      .catch(() => { if (!controller.signal.aborted) setTrails([]); });
    const festivalTask = fetch(`/api/festivals?region=${encodeURIComponent(region.trim())}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ success: boolean; data?: { festivals: FestivalData[] } }>)
      .then((body) => { if (!controller.signal.aborted) setFestivals(body.success && body.data ? body.data.festivals : []); })
      .catch(() => { if (!controller.signal.aborted) setFestivals([]); });
    void Promise.all([trailTask, festivalTask]).finally(() => {
      if (!controller.signal.aborted) {
        setDiscoveryLoadedRegion(region.trim());
        setDiscoveryLoading(false);
      }
    });
    return () => controller.abort();
  }, [discoveryOpen, discoveryLoadedRegion, region]);

  useEffect(() => {
    if (!plannerOpen) return;
    const dialog = plannerDialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      // The planner can host the PDF alertdialog. While it is open, only the
      // inner dialog may consume Escape/Tab; otherwise both document-level
      // focus traps run and the drawer closes underneath it.
      if (document.querySelector(".plan-print-dialog-backdrop")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closePlanner();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], summary, [tabindex]:not([tabindex='-1'])"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [plannerOpen, closePlanner]);

  useEffect(() => {
    if (planGenerationRequest === 0) return;
    const timer = globalThis.setTimeout(() => {
      const target = plannerDialogRef.current;
      if (!target) return;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      if (isMobile) {
        target.scrollTo({ top: 0, behavior });
        return;
      }
      target.scrollIntoView({ behavior, block: "start" });
      globalThis.setTimeout(() => target.focus({ preventScroll: true }), behavior === "smooth" ? 450 : 0);
    }, 80);
    return () => globalThis.clearTimeout(timer);
  }, [planGenerationRequest]);

  const togglePrepFilter = (key: PreparationFilterKey) => {
    setPage(1);
    setPrepFilters((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };
  const selectSize = (key: ConditionKey | null) => {
    setPage(1);
    setPetSize(key);
    setHard((current) => {
      const withoutSize = current.filter((item) => !conditionKeys.includes(item));
      return key ? [...withoutSize, key] : withoutSize;
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

  const finishChoosing = useCallback(() => {
    if (!hasPlanItems) return;
    setSelectionCompleted(true);
    supplementalChoicesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    globalThis.setTimeout(() => supplementalChoicesRef.current?.focus({ preventScroll: true }), 350);
  }, [hasPlanItems]);

  const guideToSupplementalReview = useCallback(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = (selector: string) => globalThis.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(selector);
      target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      globalThis.setTimeout(() => target?.focus({ preventScroll: true }), reducedMotion ? 0 : 350);
    }, 0);
    setSelectionCompleted(true);
    if (!regionalReviewComplete && region.trim()) {
      setDiscoveryOpen(true);
      reveal(".supplemental-choices .context-disclosure:not(.nearby-disclosure) > summary");
      return;
    }
    if (!nearbyReviewComplete && nearbyAnchor) {
      setNearbyActivatedFor(nearbyAnchor.id);
      setNearbyOpenFor(nearbyAnchor.id);
      reveal(".supplemental-choices .nearby-disclosure > summary");
    }
  }, [nearbyAnchor, nearbyReviewComplete, region, regionalReviewComplete]);

  const togglePlanPlace = useCallback((result: MatchEvaluation) => {
    const place = result.place;
    const isRemovingLastPlace = planPlaces.length === 1 && planPlaces[0]?.id === place.id;
    const isRemovingNearbyAnchor = planPlaces[0]?.id === place.id;
    const planPlace: PlanPlace = {
      id: place.id,
      name: place.name,
      address: place.address,
      category: place.category,
      coordinates: place.coordinates,
      policySourceText: place.policySource.sourceText,
      exact: result.exact,
    };
    if (isRemovingNearbyAnchor) { setNearbyActivatedFor(null); setNearbyOpenFor(null); setNearbyReviewedFor(null); }
    if (isRemovingLastPlace) {
      if (planActivities.length === 0) closePlanner();
    }
    setSelectionCompleted(false);
    setCourseConfirmed(false);
    setPlanPlaces((current) => current.some((p) => p.id === place.id) ? current.filter((p) => p.id !== place.id) : [...current, planPlace]);
  }, [planPlaces, planActivities.length, closePlanner]);

  const removePlanPlace = useCallback((id: string) => {
    if (planPlaces[0]?.id === id) { setNearbyActivatedFor(null); setNearbyOpenFor(null); setNearbyReviewedFor(null); }
    if (id.startsWith("festival:") || id.startsWith("trail:")) setRegionalReviewedFor(null);
    if (id.startsWith("nearby-service:") || auxiliaryPlaceIds.has(id)) setNearbyReviewedFor(null);
    if (planPlaces.length === 1 && planPlaces[0]?.id === id) {
      if (planActivities.length === 0) closePlanner();
    }
    setCourseConfirmed(false);
    setPlanPlaces((current) => current.filter((p) => p.id !== id));
  }, [planPlaces, planActivities.length, closePlanner, auxiliaryPlaceIds]);
  const togglePlanActivity = useCallback((activity: PlanActivity) => {
    setRegionalReviewedFor(null);
    setCourseConfirmed(false);
    if (activity.coordinates) {
      const isRemoving = planPlaces.some((place) => place.id === activity.id);
      if (isRemoving && planPlaces[0]?.id === activity.id) { setNearbyActivatedFor(null); setNearbyOpenFor(null); setNearbyReviewedFor(null); }
      if (isRemoving && planPlaces.length === 1 && planActivities.length === 0) closePlanner();
      const festivalPlace: PlanPlace = {
        id: activity.id,
        name: activity.title,
        address: activity.address ?? activity.detail,
        category: activity.type,
        coordinates: activity.coordinates,
        policySourceText: activity.detail,
        exact: true,
      };
      setPlanPlaces((current) => current.some((place) => place.id === activity.id) ? current.filter((place) => place.id !== activity.id) : [...current, festivalPlace]);
      return;
    }
    setPlanActivities((current) => current.some((item) => item.id === activity.id) ? current.filter((item) => item.id !== activity.id) : [...current, activity]);
  }, [planActivities.length, planPlaces, closePlanner]);
  const toggleSupplementalPlace = useCallback((place: PlanPlace) => {
    setNearbyReviewedFor(null);
    setCourseConfirmed(false);
    setPlanPlaces((current) => current.some((item) => item.id === place.id) ? current.filter((item) => item.id !== place.id) : [...current, place]);
  }, []);
  const removePlanActivity = useCallback((id: string) => {
    if (planActivities.length === 1 && planActivities[0]?.id === id && planPlaces.length === 0) closePlanner();
    setRegionalReviewedFor(null);
    setCourseConfirmed(false);
    setPlanActivities((current) => current.filter((activity) => activity.id !== id));
  }, [planActivities, planPlaces.length, closePlanner]);
  const clearPlanPlaces = useCallback(() => {
    setPlanPlaces([]);
    setPlanActivities([]);
    setNearbyActivatedFor(null);
    setNearbyOpenFor(null);
    setRegionalReviewedFor(null);
    setNearbyReviewedFor(null);
    setSelectionCompleted(false);
    setCourseConfirmed(false);
    closePlanner();
  }, [closePlanner]);
  const invalidateCourse = useCallback(() => setCourseConfirmed(false), []);
  const applyCourseOrder = useCallback((orderedPlaceIds: string[]) => {
    setPlanPlaces((current) => {
      const placesById = new Map(current.map((place) => [place.id, place]));
      return orderedPlaceIds
        .map((id) => placesById.get(id))
        .filter((place): place is PlanPlace => Boolean(place));
    });
    setNearbyActivatedFor(null);
    setNearbyOpenFor(null);
    setCourseConfirmed(true);
    setPlanGenerationRequest((request) => request + 1);

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      if (document.activeElement instanceof HTMLElement) plannerReturnFocusRef.current = document.activeElement;
      setPlannerOpen(true);
    }
  }, []);

  return (
    <section className="search-workspace" id="search" aria-label={dict.findPlace}>
      <div className="control-panel">
        <header className="control-heading">
          <div><p className="section-kicker section-step">{dict.stepSearch}</p><h2>{dict.searchHeading}</h2></div>
          <p>{dict.searchDesc1} <span className="keep-together">{dict.searchDesc2}</span> <span className="keep-together">{dict.searchDesc3}</span></p>
        </header>
        <aside className="filter-panel">
          <PetProfilePanel selected={petSize} weight={petWeight} dangerousDog={dangerousDog} onSelect={selectSize} onWeightChange={changeWeight} onDangerousDogChange={setDangerousDog} />
          <ConditionPicker region={region} regionOptions={regionOptions} prepFilters={prepFilters} onRegionChange={(value) => { setPage(1); setRegion(value); setTrails([]); setFestivals([]); setDiscoveryLoadedRegion(null); setDiscoveryOpen(false); setRegionalReviewedFor(null); setCourseConfirmed(false); }} onTogglePrepFilter={togglePrepFilter} />
          <DestinationPanel selectedCategories={categories} onToggleCategory={toggleCategory} />
        </aside>
      </div>
      <div className="results-panel interactive-results" aria-busy={loading}>
        <div className={`results-layout ${plannerOpen ? "planner-open" : ""}`}>
          <div className="results-primary">
            <div className="result-heading">
              <div><p className="section-kicker section-step">{dict.stepResults}</p><h2>{!catalogIsCurrent ? dict.checkingConditions : isBrowsing ? t(lang, "browseCount", { n: resultCount.toLocaleString("ko-KR") }) : resultCount > 0 ? t(lang, "confirmedCount", { n: resultCount.toLocaleString("ko-KR") }) : dict.noConfirmedYet}</h2></div>
              {catalogIsCurrent ? <p className="result-count" aria-live="polite"><strong>{resultCount.toLocaleString("ko-KR")}</strong><span>{dict.places}</span></p> : null}
            </div>
            <details className="coverage-disclosure">
              <summary>{dict.dataDetails}</summary>
              <p className="catalog-coverage">{dict.coverageDetail} {catalog.searchableCount.toLocaleString("ko-KR")}{dict.places} · {dict.coverageSource} {catalog.sourceTotalCount.toLocaleString("ko-KR")}{dict.places} · {dict.coverageRate} {catalog.sourceTotalCount > 0 ? ((catalog.detailCoverage / catalog.sourceTotalCount) * 100).toFixed(1) : "0.0"}% · {dict.coverageNotFetched} {catalog.pendingDetailCount.toLocaleString("ko-KR")}{dict.places} · {dict.coverageFailed} {catalog.failedDetailCount.toLocaleString("ko-KR")}{dict.places}</p>
            </details>
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
                {catalog.results.length > 0 ? <div className="place-list">{visibleResults.map((result) => {
                  const isSaved = planPlaces.some((place) => place.id === result.place.id);
                  const accessibleName = translationByPlaceId[result.place.id]?.title || result.place.name;
                  return <div className="place-row" key={result.place.id}><ResultCard result={result} dangerousDog={dangerousDog} closureStatus={closureByPlaceId[result.place.id]} accessibility={accessibilityByPlaceId[result.place.id]} camping={campingByPlaceId[result.place.id]} congestion={congestionByPlaceId[result.place.id]} translation={translationByPlaceId[result.place.id]} lang={lang} /><button type="button" className={`plan-add-button ${isSaved ? "added" : ""}`} onClick={() => togglePlanPlace(result)} aria-label={t(lang, isSaved ? "planRemoveNamed" : "planAddNamed", { name: accessibleName })}><span aria-hidden="true">{isSaved ? "✓" : "+"}</span>{isSaved ? dict.planAdded : dict.planAdd}</button></div>;
                })}</div> : <ZeroResultRecovery proposal={catalog.proposal} unverifiedCount={catalog.unverifiedCount} onApply={() => catalog.proposal && setPreferences((current) => current.filter((key) => !catalog.proposal?.removedPreferences.some((item) => item.key === key)))} />}
                {catalog.results.length > 0 ? <div className="result-actions">
                  <button ref={selectionCompleteRef} type="button" className={`selection-complete-button ${hasPlanItems && !selectionCompleted ? "next-action-cue" : ""}`} disabled={!hasPlanItems} onClick={finishChoosing}><span>{dict.selectionDone}</span><small>{hasPlanItems ? t(lang, "selectionDoneCount", { n: planItemCount }) : dict.selectionDoneNeed}</small></button>
                </div> : null}
                {!isBrowsing && catalog.confirmedMatchCount > 0 && catalog.unverifiedCount > 0 ? <p className="unknown-note"><strong>{t(lang, "unknownNote", { n: catalog.unverifiedCount.toLocaleString("ko-KR") })}</strong></p> : null}
                <nav className="catalog-pagination" aria-label={dict.confirmedResults}>
                  <button type="button" disabled={loading || catalog.page <= 1} onClick={() => setPage(Math.max(1, catalog.page - 1))}>{dict.prevPage}</button>
                  <span><strong>{catalog.page.toLocaleString("ko-KR")}</strong> / {catalog.totalPages.toLocaleString("ko-KR")}{dict.pageOf}</span>
                  <button type="button" disabled={loading || catalog.page >= catalog.totalPages} onClick={() => setPage(Math.min(catalog.totalPages, catalog.page + 1))}>{dict.nextPage}</button>
                </nav>
              </>
            ) : null}
          </div>

          {plannerOpen ? <button type="button" className="drawer-backdrop" aria-label={dict.closeTripBoard} onClick={closePlanner} /> : null}
          <aside className="context-rail" aria-label={dict.tripBoardTitle}>
            {!hasPlanItems ? (
              <section className="trip-board-empty">
                <p className="section-kicker section-step">{dict.tripBoardTitle}</p>
                <span aria-hidden="true">＋</span>
                <h2>{dict.tripBoardEmpty}</h2>
                <p>{dict.tripBoardEmptyNote}</p>
              </section>
            ) : null}

            {hasPlanItems || region.trim() ? (
              <section ref={supplementalChoicesRef} tabIndex={-1} className="supplemental-choices" aria-labelledby="supplemental-choices-title">
                <header className="supplemental-heading">
                  <div className="supplemental-progress-line"><p className="section-kicker">{dict.supplementalTitle}</p><span>{t(lang, "supplementalProgress", { done: supplementalReviewDone, total: supplementalReviewTotal })}</span></div>
                  <h2 id="supplemental-choices-title">{dict.supplementalHeading}</h2>
                  <p>{dict.supplementalNote}</p>
                </header>

                {region.trim() ? (
                  <details key={region.trim()} className="context-disclosure" open={discoveryOpen}>
                    <summary className={selectionCompleted && !regionalReviewComplete && !discoveryOpen ? "next-action-cue" : undefined} onClick={(event) => { event.preventDefault(); setDiscoveryOpen((open) => !open); }}><span><strong>{dict.regionalDiscovery}</strong><small>{dict.regionalDiscoveryNote}</small>{regionalReviewComplete ? <em>{dict.supplementalReviewed}</em> : null}</span><b aria-hidden="true">{regionalReviewComplete ? "✓" : "＋"}</b></summary>
                    <div className="context-disclosure-body">
                      {discoveryLoading ? <p className="context-loading" role="status">{dict.loadingMessage}</p> : null}
                      {!discoveryLoading && trails.length === 0 && festivals.length === 0 ? <p className="context-empty">{dict.noRegionalDiscovery}</p> : null}
                      {trails.length > 0 ? <TrailSection trails={trails} region={region.trim()} selectedActivityIds={selectedActivityIds} onToggleActivity={togglePlanActivity} /> : null}
                      {festivals.length > 0 ? <FestivalSection festivals={festivals} selectedActivityIds={selectedActivityIds} onToggleActivity={togglePlanActivity} /> : null}
                      <button type="button" className={`supplemental-review-button ${selectionCompleted && !regionalReviewComplete ? "next-action-cue" : ""}`} disabled={discoveryLoading} onClick={() => { setRegionalReviewedFor(region.trim()); setDiscoveryOpen(false); }}>{regionalSelectionCount > 0 ? t(lang, "supplementalConfirmCount", { n: regionalSelectionCount }) : dict.supplementalConfirmNone}</button>
                    </div>
                  </details>
                ) : null}

                {nearbyAnchor ? (
                  <details key={nearbyAnchor.id} className="context-disclosure nearby-disclosure" open={nearbyOpenFor === nearbyAnchor.id}>
                    <summary className={selectionCompleted && regionalReviewComplete && !nearbyReviewComplete && nearbyOpenFor !== nearbyAnchor.id ? "next-action-cue" : undefined} onClick={(event) => { event.preventDefault(); const willOpen = nearbyOpenFor !== nearbyAnchor.id; setNearbyOpenFor(willOpen ? nearbyAnchor.id : null); if (willOpen) setNearbyActivatedFor(nearbyAnchor.id); }}><span><strong>{dict.nearbySaved}</strong><small>{dict.nearbySavedNote}</small>{nearbyReviewComplete ? <em>{dict.supplementalReviewed}</em> : null}</span><b aria-hidden="true">{nearbyReviewComplete ? "✓" : "＋"}</b></summary>
                    {nearbyActivatedFor === nearbyAnchor.id ? <div className="context-disclosure-body extensions">
                      {auxiliaryPlaces.length > 0 ? <NearbyCatalog places={auxiliaryPlaces} fallbackOrigin={nearbyAnchor.coordinates} referenceName={nearbyAnchor.name} selectedPlaceIds={selectedPlaceIds} onTogglePlace={toggleSupplementalPlace} /> : null}
                      <NearbyServices origin={nearbyAnchor.coordinates} referenceName={nearbyAnchor.name} selectedPlaceIds={selectedPlaceIds} onTogglePlace={toggleSupplementalPlace} />
                      <button type="button" className={`supplemental-review-button ${selectionCompleted && regionalReviewComplete && !nearbyReviewComplete ? "next-action-cue" : ""}`} onClick={() => { setNearbyReviewedFor(nearbyAnchor.id); setNearbyOpenFor(null); }}>{nearbySelectionCount > 0 ? t(lang, "supplementalConfirmCount", { n: nearbySelectionCount }) : dict.supplementalConfirmNone}</button>
                    </div> : null}
                  </details>
                ) : (
                  <section className="nearby-locked">
                    <span aria-hidden="true">⌖</span>
                    <div><strong>{dict.nearbyLocked}</strong><p>{dict.nearbyLockedNote}</p></div>
                  </section>
                )}
              </section>
            ) : (
              null
            )}

            {planPlaces.length > 0 ? (
              <CourseBuilder selectedPlaces={planPlaces} origin={planPlaces[0]!.coordinates} supplementalReviewComplete={courseConfirmed || supplementalReviewComplete} highlightAction={selectionCompleted && supplementalReviewComplete && !courseConfirmed} onApplyOrder={applyCourseOrder} onConfigurationChange={invalidateCourse} onReviewNeeded={guideToSupplementalReview} />
            ) : null}

            {hasPlanItems ? (
              <div ref={plannerDialogRef} tabIndex={-1} className="trip-board-plan" role={plannerOpen ? "dialog" : undefined} aria-modal={plannerOpen ? true : undefined} aria-label={dict.tripBoardTitle}>
                {plannerOpen ? <div className="mobile-planner-heading"><strong>{dict.tripBoardTitle}</strong><button type="button" autoFocus aria-label={dict.closeTripBoard} onClick={closePlanner}>×</button></div> : null}
                <PlanBuilder selectedPlaces={planPlaces} selectedActivities={planActivities} generateRequest={planGenerationRequest} courseConfirmed={courseConfirmed} onRemove={removePlanPlace} onRemoveActivity={removePlanActivity} onClear={clearPlanPlaces} />
              </div>
            ) : null}
          </aside>
        </div>
      </div>
      {hasPlanItems ? <button ref={tripTrayRef} type="button" className="saved-trip-tray" aria-label={dict.openTripBoard} onClick={() => { plannerReturnFocusRef.current = tripTrayRef.current; setPlannerOpen(true); }}><span><strong>{dict.savedTray}</strong><small>{planPlaces[0]?.name ?? planActivities[0]?.title}{planItemCount > 1 ? ` +${planItemCount - 1}` : ""}</small></span><b>{planItemCount}</b></button> : null}
    </section>
  );
}
