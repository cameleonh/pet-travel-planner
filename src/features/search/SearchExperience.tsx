"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { AuxiliaryPlace, RawPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import type { RegionOption } from "@/domain/regions";
import { getRegionSearchTerm } from "@/domain/regions";
import { conditionKeys, preparationFilterKeys, type ConditionKey, type MatchEvaluation, type PreparationFilterKey, type SelectedConstraint } from "@/domain/types";
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
import { RuralSection, type VillageData, type FarmstayData } from "@/features/results/RuralSection";
import { PetCafeSection, type PetCafeData } from "@/features/results/PetCafeSection";
import { FestivalSection, type FestivalData } from "@/features/results/FestivalSection";
import { ZeroResultRecovery } from "@/features/results/ZeroResultRecovery";
import { RecentlyViewed } from "@/features/results/RecentlyViewed";
import { recordViewedPlace, type ViewedPlaceSummary } from "@/domain/viewed-history";
import { NearbyCatalog } from "@/features/nearby/NearbyCatalog";
import { NearbyOriginPicker, type NearbyOrigin } from "@/features/nearby/NearbyOriginPicker";
import { NearbyServices } from "@/features/nearby/NearbyServices";
import { CourseBuilder } from "@/features/course/CourseBuilder";
import { ThemeCurations } from "@/features/search/ThemeCurations";
import { RegionCoursePicker } from "@/features/search/RegionCoursePicker";
import { THEME_PRESETS, type ThemePreset, type ThemePresetId } from "@/domain/themes";
import { track } from "@/domain/usage-client";
import { InteractiveMapView } from "@/features/map/InteractiveMapView";
import { FloatingQuickNav } from "@/features/navigation/FloatingQuickNav";
import { hasActiveFilters } from "@/domain/search-filters";
import { PetProfileModal } from "@/features/owner/PetProfileModal";
import { getSavedPetProfile, type PetProfile } from "@/domain/pet-profile";
import { WeatherSafeWidget } from "@/features/weather/WeatherSafeWidget";

const condLabelKeys: Record<ConditionKey, "smallDog" | "mediumDog" | "largeDog"> = { smallDog: "smallDog", mediumDog: "mediumDog", largeDog: "largeDog" };
const prepFilterKeys: Record<PreparationFilterKey, "leash" | "carrier" | "indoor" | "outdoor"> = { leash: "leash", carrier: "carrier", indoor: "indoor", outdoor: "outdoor" };

function selected(key: ConditionKey, kind: SelectedConstraint["kind"], lang: ReturnType<typeof useLang>["lang"]): SelectedConstraint {
  return { key, label: t(lang, condLabelKeys[key]), kind, protectedCategory: kind === "hard" ? "admission" : null };
}

const SEARCH_STATE_KEY = "gggo_search_state_v1";
const SEARCH_SCROLL_KEY = "gggo_search_scroll_v1";
const PLACE_CATEGORIES: RawPlace["category"][] = ["attraction", "restaurant", "cafe", "accommodation", "shopping"];
const THEME_IDS = new Set<string>(THEME_PRESETS.map((theme) => theme.id));
const PLACE_SET_IDS = new Set<string>(["night-spots", "rural-stays", "accessible"]);

type PersistedSearchState = {
  region: string;
  categories: RawPlace["category"][];
  hard: ConditionKey[];
  preferences: ConditionKey[];
  prepFilters: PreparationFilterKey[];
  petSize: ConditionKey | null;
  petWeight: string;
  activeThemeId: ThemePresetId | null;
  placeSet: "night-spots" | "rural-stays" | "accessible" | null;
};

// Restore the last search session (theme, filters, scroll) when the user comes
// back from a place-detail page. Values are validated on read so a stale or
// corrupted snapshot can never inject unknown filter keys into the UI.
function readPersistedSearchState(): PersistedSearchState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSearchState>;
    if (!parsed || typeof parsed !== "object") return null;
    const conditions = new Set<string>(conditionKeys);
    const preparations = new Set<string>(preparationFilterKeys);
    return {
      region: typeof parsed.region === "string" ? parsed.region : "",
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter((category) => PLACE_CATEGORIES.includes(category)) : [],
      hard: Array.isArray(parsed.hard) ? parsed.hard.filter((key) => conditions.has(key)) : [],
      preferences: Array.isArray(parsed.preferences) ? parsed.preferences.filter((key) => conditions.has(key)) : [],
      prepFilters: Array.isArray(parsed.prepFilters) ? parsed.prepFilters.filter((key) => preparations.has(key)) : [],
      petSize: typeof parsed.petSize === "string" && conditions.has(parsed.petSize) ? parsed.petSize as ConditionKey : null,
      petWeight: typeof parsed.petWeight === "string" ? parsed.petWeight : "",
      activeThemeId: typeof parsed.activeThemeId === "string" && THEME_IDS.has(parsed.activeThemeId) ? parsed.activeThemeId as ThemePresetId : null,
      placeSet: typeof parsed.placeSet === "string" && PLACE_SET_IDS.has(parsed.placeSet) ? parsed.placeSet as PersistedSearchState["placeSet"] : null,
    };
  } catch {
    return null;
  }
}

type CatalogApiResponse = {
  success: boolean;
  data: { catalog: CatalogPage; placeHours?: Record<string, { useTime: string | null; restDate: string | null; fetchedAt: string | null }>; accessibility?: Record<string, AccessibilityData>; camping?: Record<string, CampingData>; congestion?: Record<string, CongestionData>; translations?: Record<string, TranslationData>; lang?: string } | null;
  error: { message: string } | null;
};

type CatalogApiData = NonNullable<CatalogApiResponse["data"]>;

async function fetchCatalog(url: string, signal?: AbortSignal): Promise<CatalogApiData> {
  const response = await fetch(url, { signal });
  const body = await response.json() as CatalogApiResponse;
  if (!response.ok || !body.success || !body.data) throw new Error(body.error?.message ?? "Error");
  return body.data;
}

type ClosureApiResponse = { success: boolean; closures: Record<string, PublicClosureStatus["closures"]> };

export function SearchExperience({ initialCatalog, initialAuxiliaryPlaces, regionOptions, placeCounts }: { initialCatalog: CatalogPage; initialAuxiliaryPlaces?: AuxiliaryPlace[]; regionOptions: RegionOption[]; placeCounts?: Record<string, number> }) {
  const { lang, dict } = useLang();
  const [restoredSearchState] = useState(readPersistedSearchState);
  // Capture the scroll target at mount: incoming scroll events from the
  // router's own restoration would otherwise overwrite the stored value.
  const [restoredScrollTop] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const value = Number(sessionStorage.getItem(SEARCH_SCROLL_KEY) ?? "0");
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  });
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
  const [catalogRequestKey, setCatalogRequestKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closureByPlaceId, setClosureByPlaceId] = useState<Record<string, PublicClosureStatus>>({});
  const [placeHoursById, setPlaceHoursById] = useState<NonNullable<CatalogApiData["placeHours"]>>({});
  const [accessibilityByPlaceId, setAccessibilityByPlaceId] = useState<Record<string, AccessibilityData>>({});
  const [campingByPlaceId, setCampingByPlaceId] = useState<Record<string, CampingData>>({});
  const [congestionByPlaceId, setCongestionByPlaceId] = useState<Record<string, CongestionData>>({});
  const [translationByPlaceId, setTranslationByPlaceId] = useState<Record<string, TranslationData>>({});
  const [planPlaces, setPlanPlaces] = useState<PlanPlace[]>([]);
  const [planActivities, setPlanActivities] = useState<PlanActivity[]>([]);
  const [planGenerationRequest, setPlanGenerationRequest] = useState(0);
  const [courseConfirmed, setCourseConfirmed] = useState(false);
  const [trails, setTrails] = useState<TrailData[]>([]);
  const [ruralVillages, setRuralVillages] = useState<VillageData[]>([]);
  const [ruralFarmstays, setRuralFarmstays] = useState<FarmstayData[]>([]);
  const [petCafes, setPetCafes] = useState<PetCafeData[]>([]);
  const [festivals, setFestivals] = useState<FestivalData[]>([]);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryLoadedRegion, setDiscoveryLoadedRegion] = useState<string | null>(null);
  const [nearbyActivatedFor, setNearbyActivatedFor] = useState<string | null>(null);
  const [nearbyOpenFor, setNearbyOpenFor] = useState<string | null>(null);
  // Manual origin (address search or geolocation) applied by the nearby picker.
  const [nearbyOrigin, setNearbyOrigin] = useState<{ anchorId: string; origin: NearbyOrigin } | null>(null);
  const [regionalReviewedFor, setRegionalReviewedFor] = useState<string | null>(null);
  const [nearbyReviewedFor, setNearbyReviewedFor] = useState<string | null>(null);
  const [selectionCompleted, setSelectionCompleted] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<ThemePresetId | null>(null);
  const [placeSet, setPlaceSet] = useState<"night-spots" | "rural-stays" | "accessible" | null>(null);
  const [todaySafety, setTodaySafety] = useState<"safe" | "caution" | "indoor" | "unknown">("unknown");
  const [themeResultPulse, setThemeResultPulse] = useState(false);
  const [plannerTripDate, setPlannerTripDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [petProfile, setPetProfile] = useState<PetProfile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  // The ~1k nearby auxiliary places are not needed for first paint; they are
  // fetched from /api/auxiliary the first time the nearby panel is opened so
  // they stay out of the initial HTML/RSC payload.
  const [auxiliaryPlaces, setAuxiliaryPlaces] = useState<AuxiliaryPlace[]>(initialAuxiliaryPlaces ?? []);
  const [auxiliaryLoaded, setAuxiliaryLoaded] = useState(Boolean(initialAuxiliaryPlaces && initialAuxiliaryPlaces.length));
  const themeFilterSnapshotRef = useRef<{
    petSize: ConditionKey | null;
    petWeight: string;
    hard: ConditionKey[];
    preferences: ConditionKey[];
    categories: RawPlace["category"][];
    prepFilters: PreparationFilterKey[];
    placeSet: "night-spots" | "rural-stays" | "accessible" | null;
  } | null>(null);
  const plannerDialogRef = useRef<HTMLDivElement>(null);
  const tripTrayRef = useRef<HTMLButtonElement>(null);
  const selectionCompleteRef = useRef<HTMLButtonElement>(null);
  const plannerReturnFocusRef = useRef<HTMLElement | null>(null);
  const supplementalChoicesRef = useRef<HTMLElement>(null);
  const resultsPanelRef = useRef<HTMLDivElement>(null);
  const themeCatalogCacheRef = useRef(new Map<string, CatalogApiData>());
  const themePrefetchKeyRef = useRef<string | null>(null);
  const searchStatePersistSkipRef = useRef(false);
  const initialScrollRestoredRef = useRef(false);
  const scrollRestorePendingRef = useRef(true);

  // Apply the restored session after hydration. Doing this in an effect keeps
  // the server-rendered markup identical to the first client render.
  useEffect(() => {
    if (restoredSearchState) {
      queueMicrotask(() => {
        setRegion(restoredSearchState.region);
        setCategories(restoredSearchState.categories);
        setHard(restoredSearchState.hard);
        setPreferences(restoredSearchState.preferences);
        setPrepFilters(restoredSearchState.prepFilters);
        setPetSize(restoredSearchState.petSize);
        setPetWeight(restoredSearchState.petWeight);
        setActiveThemeId(restoredSearchState.activeThemeId);
        setPlaceSet(restoredSearchState.placeSet);
      });
      return;
    }
    try {
      const legacyRegion = sessionStorage.getItem("gggo_region");
      if (legacyRegion) queueMicrotask(() => setRegion(legacyRegion));
    } catch {}
  }, [restoredSearchState]);

  // Persist the visible search session so browser back from a place page
  // restores the theme and filters instead of the first-visit defaults.
  useEffect(() => {
    if (!searchStatePersistSkipRef.current) {
      searchStatePersistSkipRef.current = true;
      if (restoredSearchState) return;
    }
    try {
      sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify({
        region, categories, hard, preferences, prepFilters, petSize, petWeight, activeThemeId, placeSet,
      } satisfies PersistedSearchState));
      sessionStorage.setItem("gggo_region", region);
    } catch {}
  }, [region, categories, hard, preferences, prepFilters, petSize, petWeight, activeThemeId, placeSet, restoredSearchState]);

  useEffect(() => {
    let frame = 0;
    // Once an internal link is clicked the router scrolls the outgoing page to
    // the top; freezing further writes keeps the pre-navigation position.
    let frozen = false;
    const persistScroll = () => {
      if (scrollRestorePendingRef.current) return;
      try { sessionStorage.setItem(SEARCH_SCROLL_KEY, String(Math.round(window.scrollY))); } catch {}
    };
    const onScroll = () => {
      if (frozen || frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; if (!frozen) persistScroll(); });
    };
    const onDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const href = anchor?.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return;
      // Navigating away: stop pending restoration and save immediately.
      scrollRestorePendingRef.current = false;
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      persistScroll();
      frozen = true;
    };
    // Failsafe: never block scroll persistence if the catalog request stalls.
    const failsafe = globalThis.setTimeout(() => { scrollRestorePendingRef.current = false; }, 4000);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onDocumentClick, true);
      if (frame) window.cancelAnimationFrame(frame);
      globalThis.clearTimeout(failsafe);
    };
  }, []);

  // Load nearby auxiliary places on demand (first nearby activation) so the
  // initial RSC payload stays small. A failure simply leaves the nearby list
  // empty, which the existing zero-state copy already covers.
  useEffect(() => {
    if (!nearbyActivatedFor || auxiliaryLoaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auxiliary");
        const body = await response.json() as { success: boolean; data: AuxiliaryPlace[] | null };
        if (!cancelled && response.ok && body.success && Array.isArray(body.data)) {
          setAuxiliaryPlaces(body.data);
          setAuxiliaryLoaded(true);
        }
      } catch {
        // Keep the panel usable; a later activation retries.
      }
    })();
    return () => { cancelled = true; };
  }, [nearbyActivatedFor, auxiliaryLoaded]);

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
  const requestKey = `${hardKeys.join(",")}|${preferenceKeys.join(",")}|${page}|${region.trim()}|${categories.join(",")}|${prepFilters.join(",")}|${lang}|${placeSet ?? ""}`;
  const catalogIsCurrent = catalogRequestKey === requestKey;

  // Restore the previous scroll position once the restored results render.
  useEffect(() => {
    if (!restoredSearchState) {
      scrollRestorePendingRef.current = false;
      return;
    }
    if (initialScrollRestoredRef.current || !catalogIsCurrent || loading) return;
    initialScrollRestoredRef.current = true;
    if (!restoredScrollTop) {
      scrollRestorePendingRef.current = false;
      return;
    }

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      scrollRestorePendingRef.current = false;
    };
    const applyScroll = () => {
      if (cancelled) return;
      if (Math.abs(window.scrollY - restoredScrollTop) > 24) {
        window.scrollTo({ top: restoredScrollTop, behavior: "auto" });
      }
    };
    const interactionEvents: Array<keyof WindowEventMap> = ["wheel", "touchstart", "pointerdown", "keydown"];
    for (const eventName of interactionEvents) window.addEventListener(eventName, cancel, { passive: true, once: true });
    // The list can grow as data and images settle; keep re-applying the target
    // until the layout is stable or the user takes over.
    const timers = [0, 120, 500, 1200].map((delay) => globalThis.setTimeout(() => {
      applyScroll();
      if (delay === 1200) scrollRestorePendingRef.current = false;
    }, delay));

    return () => {
      cancelled = true;
      for (const eventName of interactionEvents) window.removeEventListener(eventName, cancel);
      for (const timer of timers) globalThis.clearTimeout(timer);
      scrollRestorePendingRef.current = false;
    };
  }, [restoredSearchState, restoredScrollTop, catalogIsCurrent, loading]);
  const nearbyAnchor = planPlaces[0];
  const activeNearbyOrigin = nearbyAnchor && nearbyOrigin?.anchorId === nearbyAnchor.id ? nearbyOrigin.origin : null;
  const nearbyReferenceName = activeNearbyOrigin?.name ?? nearbyAnchor?.name ?? "";
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
  const supplementalReviewTotal = Number(regionalReviewRequired) + Number(nearbyReviewRequired);
  const supplementalReviewDone = Number(regionalReviewComplete && regionalReviewRequired) + Number(nearbyReviewComplete && nearbyReviewRequired);
  const hasEnoughPlaces = planPlaces.length >= 1;
  const visibleResults = catalogIsCurrent ? catalog.results : [];
  const openPlanner = useCallback(() => {
    plannerReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : tripTrayRef.current;
    setPlannerOpen(true);
  }, []);
  const closePlanner = useCallback(() => {
    setPlannerOpen(false);
    globalThis.setTimeout(() => (plannerReturnFocusRef.current ?? tripTrayRef.current)?.focus(), 0);
  }, []);

  const getThemeRequestKey = useCallback((theme: ThemePreset) => {
    return `${theme.petSize ?? ""}||1|${region.trim()}|${theme.categories.join(",")}|${theme.prepFilters.join(",")}|${lang}|${theme.placeSet ?? ""}`;
  }, [lang, region]);

  useEffect(() => {
    const controller = new AbortController();
    const cachedThemeData = activeThemeId ? themeCatalogCacheRef.current.get(requestKey) : undefined;
    if (cachedThemeData) {
      queueMicrotask(() => {
        if (controller.signal.aborted) return;
        setCatalog(cachedThemeData.catalog);
        setCatalogRequestKey(requestKey);
        setPlaceHoursById(cachedThemeData.placeHours ?? {});
        setAccessibilityByPlaceId(cachedThemeData.accessibility ?? {});
        setCampingByPlaceId(cachedThemeData.camping ?? {});
        setCongestionByPlaceId(cachedThemeData.congestion ?? {});
        setTranslationByPlaceId(cachedThemeData.translations ?? {});
        setClosureByPlaceId({});
        setLoading(false);
        setErrorMessage(null);
      });
      return () => controller.abort();
    }
    const parameters = new URLSearchParams({ page: String(page) });
    if (hardKeys.length > 0) parameters.set("hard", hardKeys.join(","));
    if (preferenceKeys.length > 0) parameters.set("preferences", preferenceKeys.join(","));
    if (region.trim()) parameters.set("region", region.trim());
    if (categories.length > 0) parameters.set("categories", categories.join(","));
    if (prepFilters.length > 0) parameters.set("prep", prepFilters.join(","));
    if (placeSet) parameters.set("placeSet", placeSet);
    if (lang !== "ko") parameters.set("lang", lang);
    const catalogUrl = `/api/places?${parameters}`;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setErrorMessage(null);
    });
    fetchCatalog(catalogUrl, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setCatalog(data.catalog);
        setCatalogRequestKey(requestKey);
        setPlaceHoursById(data.placeHours ?? {});
        if (activeThemeId) themeCatalogCacheRef.current.set(requestKey, data);
        setAccessibilityByPlaceId(data.accessibility ?? {});
        setCampingByPlaceId(data.camping ?? {});
        setCongestionByPlaceId(data.congestion ?? {});
        setTranslationByPlaceId(data.translations ?? {});
        setClosureByPlaceId({});
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
  }, [activeThemeId, hardKeys, preferenceKeys, page, region, categories, prepFilters, lang, placeSet, requestKey, dict]);

  useEffect(() => {
    if (activeThemeId || themePrefetchKeyRef.current === `${region.trim()}|${lang}`) return;
    themePrefetchKeyRef.current = `${region.trim()}|${lang}`;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        for (const theme of THEME_PRESETS) {
          if (controller.signal.aborted) return;
          const key = getThemeRequestKey(theme);
          if (themeCatalogCacheRef.current.has(key)) continue;
          const parameters = new URLSearchParams({ page: "1" });
          if (theme.petSize) parameters.set("hard", theme.petSize);
          if (region.trim()) parameters.set("region", region.trim());
          if (theme.categories.length > 0) parameters.set("categories", theme.categories.join(","));
          if (theme.prepFilters.length > 0) parameters.set("prep", theme.prepFilters.join(","));
          if (theme.placeSet) parameters.set("placeSet", theme.placeSet);
          if (lang !== "ko") parameters.set("lang", lang);
          try {
            const data = await fetchCatalog(`/api/places?${parameters}`, controller.signal);
            if (!controller.signal.aborted) themeCatalogCacheRef.current.set(key, data);
          } catch {
            if (controller.signal.aborted) return;
          }
          await new Promise<void>((resolve) => window.setTimeout(resolve, 350));
        }
      })();
    }, 1800);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeThemeId, getThemeRequestKey, lang, region]);

  const inFlightDiscoveryRef = useRef<string | null>(null);
  useEffect(() => {
    if (!discoveryOpen || !region.trim() || discoveryLoadedRegion === region.trim() || inFlightDiscoveryRef.current === region.trim()) return;
    const controller = new AbortController();
    inFlightDiscoveryRef.current = region.trim();
    setDiscoveryLoading(true);
    const trailTask = fetch(`/api/trails?region=${encodeURIComponent(region.trim())}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ success: boolean; data?: { trails: TrailData[] } }>)
      .then((body) => { if (!controller.signal.aborted) setTrails(body.success && body.data ? body.data.trails : []); })
      .catch(() => { if (!controller.signal.aborted) setTrails([]); });
    const festivalTask = fetch(`/api/festivals?region=${encodeURIComponent(region.trim())}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ success: boolean; data?: { festivals: FestivalData[] } }>)
      .then((body) => { if (!controller.signal.aborted) setFestivals(body.success && body.data ? body.data.festivals : []); })
      .catch(() => { if (!controller.signal.aborted) setFestivals([]); });
    const ruralTask = fetch(`/api/rural?region=${encodeURIComponent(region.trim())}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ success: boolean; data?: { villages: VillageData[]; farmstays: FarmstayData[] } }>)
      .then((body) => {
        if (!controller.signal.aborted) {
          setRuralVillages(body.success && body.data ? body.data.villages : []);
          setRuralFarmstays(body.success && body.data ? body.data.farmstays : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) { setRuralVillages([]); setRuralFarmstays([]); }
      });
    const cafeSelected = categories.includes("cafe");
    const petCafeTask = cafeSelected
      ? fetch(`/api/pet-cafes?region=${encodeURIComponent(region.trim())}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ success: boolean; data?: { cafes: PetCafeData[] } }>)
        .then((body) => { if (!controller.signal.aborted) setPetCafes(body.success && body.data ? body.data.cafes : []); })
        .catch(() => { if (!controller.signal.aborted) setPetCafes([]); })
      : Promise.resolve();
    void Promise.all([trailTask, festivalTask, ruralTask, petCafeTask]).finally(() => {
      inFlightDiscoveryRef.current = null;
      if (!controller.signal.aborted) {
        setDiscoveryLoadedRegion(region.trim());
        setDiscoveryLoading(false);
      }
    });
    return () => {
      inFlightDiscoveryRef.current = null;
      controller.abort();
    };
  }, [discoveryOpen, discoveryLoadedRegion, region, categories]);

  useEffect(() => {
    if (!plannerOpen) return;
    const dialog = plannerDialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex='-1'])"));
      if (focusable[0]) {
        focusable[0].focus();
      } else {
        dialog.focus();
      }
    };

    focusFirst();

    const handleFocusIn = (event: FocusEvent) => {
      if (document.querySelector(".plan-print-dialog-backdrop")) return;
      if (dialog && !dialog.contains(event.target as Node)) {
        event.preventDefault();
        focusFirst();
      }
    };

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
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex='-1'])"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
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
  const selectSize = useCallback((key: ConditionKey | null) => {
    setPage(1);
    setPetSize(key);
    setHard((current) => {
      const withoutSize = current.filter((item) => !conditionKeys.includes(item));
      return key ? [...withoutSize, key] : withoutSize;
    });
  }, []);
  const changeWeight = useCallback((value: string) => {
    setPage(1);
    setPetWeight(value);
    const weight = Number(value);
    const newSize: ConditionKey | null = !value || !Number.isFinite(weight) || weight <= 0 ? null : weight < 10 ? "smallDog" : weight < 25 ? "mediumDog" : "largeDog";
    setHard((current) => {
      const withoutSize = current.filter((item) => !conditionKeys.includes(item));
      return newSize ? [...withoutSize, newSize] : withoutSize;
    });
    setPetSize(newSize);
  }, []);
  const toggleCategory = (category: RawPlace["category"]) => {
    setPage(1);
    setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  };
  const handleApplyTheme = useCallback((theme: ThemePreset) => {
    track("theme_apply", theme.id);
    if (!activeThemeId) {
      themeFilterSnapshotRef.current = {
        petSize,
        petWeight,
        hard: [...hard],
        preferences: [...preferences],
        categories: [...categories],
        prepFilters: [...prepFilters],
        placeSet,
      };
    }
    setActiveThemeId(theme.id);
    setPlaceSet(theme.placeSet ?? null);
    setPage(1);
    setPetSize(theme.petSize);
    setPetWeight("");
    setHard(theme.petSize ? [theme.petSize] : []);
    setPreferences([]);
    setCategories(theme.categories);
    setPrepFilters(theme.prepFilters);
    setThemeResultPulse(true);
    globalThis.setTimeout(() => setThemeResultPulse(false), 900);
    globalThis.setTimeout(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultsPanelRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }, 80);
  }, [activeThemeId, categories, hard, petSize, petWeight, placeSet, preferences, prepFilters]);
  const handleClearTheme = useCallback(() => {
    const snapshot = themeFilterSnapshotRef.current;
    setActiveThemeId(null);
    setPage(1);
    setPetSize(snapshot?.petSize ?? null);
    setPetWeight(snapshot?.petWeight ?? "");
    setHard(snapshot?.hard ?? []);
    setPreferences(snapshot?.preferences ?? []);
    setCategories(snapshot?.categories ?? []);
    setPrepFilters(snapshot?.prepFilters ?? []);
    setPlaceSet(snapshot?.placeSet ?? null);
    themeFilterSnapshotRef.current = null;
  }, []);

  const filtersActive = hasActiveFilters({ region, categories, hard, preferences, prepFilters, page });
  const recordView = useCallback((place: Pick<RawPlace, "id" | "name" | "address" | "category">) => {
    track("place_view", place.id);
    recordViewedPlace({
      id: place.id,
      name: place.name,
      category: place.category,
      region: getRegionSearchTerm(place.address.trim().split(/\s+/)[0] ?? ""),
    });
  }, []);
  const handleOpenViewed = useCallback((entry: ViewedPlaceSummary) => {
    const card = document.querySelector(`[data-place-id="${CSS.escape(entry.id)}"]`);
    if (card) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setViewMode("list");
      globalThis.setTimeout(() => {
        card.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
        card.classList.add("highlight-pulse");
        globalThis.setTimeout(() => card.classList.remove("highlight-pulse"), 2000);
      }, 80);
      return;
    }
    setPage(1);
    if (entry.region) setRegion(entry.region);
    setCategories([entry.category]);
  }, []);
  const handleResetFilters = useCallback(() => {
    setPage(1);
    setRegion("");
    setCategories([]);
    setHard([]);
    setPreferences([]);
    setPrepFilters([]);
    setPetSize(null);
    setPetWeight("");
    setActiveThemeId(null);
    setPlaceSet(null);
    themeFilterSnapshotRef.current = null;
    setTrails([]);
    setFestivals([]);
    setRuralVillages([]);
    setRuralFarmstays([]);
    setPetCafes([]);
    setDiscoveryLoadedRegion(null);
    setDiscoveryOpen(false);
    setRegionalReviewedFor(null);
    setCourseConfirmed(false);
  }, []);

  useEffect(() => {
    const saved = getSavedPetProfile();
    if (!saved) return;
    queueMicrotask(() => {
      setPetProfile(saved);
      // A restored session keeps the theme/manual size the user left behind;
      // the saved profile only prefills a fresh visit.
      if (!restoredSearchState) {
        if (saved.weight) {
          changeWeight(saved.weight);
        } else if (saved.size) {
          selectSize(saved.size);
        }
      }
      if (saved.dangerousDog) {
        setDangerousDog(true);
      }
    });
  }, [changeWeight, selectSize, restoredSearchState]);

  const handleSavePetProfile = useCallback((profile: PetProfile) => {
    setPetProfile(profile);
    if (profile.weight) {
      changeWeight(profile.weight);
    } else if (profile.size) {
      selectSize(profile.size);
    }
    setDangerousDog(profile.dangerousDog);
  }, [changeWeight, selectSize]);

  const resultCount = isBrowsing ? catalog.filteredCount : catalog.confirmedMatchCount;

  const finishChoosing = useCallback(() => {
    if (!hasEnoughPlaces) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSelectionCompleted(true);
    globalThis.setTimeout(() => {
      const target = supplementalChoicesRef.current;
      if (!target) return;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      globalThis.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 350);
    }, 0);
  }, [hasEnoughPlaces]);

  const focusSupplementalTarget = useCallback((selector: string) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    globalThis.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) return;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      globalThis.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 350);
    }, 0);
  }, []);

  const completeRegionalReview = useCallback(() => {
    setRegionalReviewedFor(region.trim());
    setDiscoveryOpen(false);
    if (!nearbyReviewComplete && nearbyAnchor) {
      setNearbyActivatedFor(nearbyAnchor.id);
      setNearbyOpenFor(nearbyAnchor.id);
      focusSupplementalTarget(".supplemental-choices .nearby-disclosure > summary");
      return;
    }
    if (selectionCompleted && planPlaces.length > 0) focusSupplementalTarget(".course-card .course-button");
  }, [focusSupplementalTarget, nearbyAnchor, nearbyReviewComplete, planPlaces.length, region, selectionCompleted]);

  const completeNearbyReview = useCallback(() => {
    if (!nearbyAnchor) return;
    setNearbyReviewedFor(nearbyAnchor.id);
    setNearbyOpenFor(null);
    if (selectionCompleted && planPlaces.length > 0) focusSupplementalTarget(".course-card .course-button");
  }, [focusSupplementalTarget, nearbyAnchor, planPlaces.length, selectionCompleted]);

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
      policySourceUrl: place.policySource.sourceUrl,
      policyObservedAt: place.policySource.observedAt,
      exact: result.exact,
      operatingHours: placeHoursById[place.id] ?? null,
    };
    if (isRemovingNearbyAnchor) { setNearbyActivatedFor(null); setNearbyOpenFor(null); setNearbyReviewedFor(null); }
    if (isRemovingLastPlace) {
      if (planActivities.length === 0) closePlanner();
    }
    setSelectionCompleted(false);
    setCourseConfirmed(false);
    setPlanPlaces((current) => current.some((p) => p.id === place.id) ? current.filter((p) => p.id !== place.id) : [...current, planPlace]);
  }, [planPlaces, planActivities.length, closePlanner, placeHoursById]);

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
  const changePlaceDwell = useCallback((placeId: string, minutes: number | null) => {
    setPlanPlaces((current) => current.map((place) => place.id === placeId ? { ...place, dwellMinutes: minutes } : place));
  }, []);
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

    if (document.activeElement instanceof HTMLElement) plannerReturnFocusRef.current = document.activeElement;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      setPlannerOpen(true);
    }
  }, []);

  return (
    <section className="search-workspace" id="search" aria-label={dict.findPlace}>
      <div className="control-panel">
        {petProfile ? (
          <div className="pet-profile-bar" role="region" aria-label="내 반려견 맞춤 설정">
            <div className="pet-profile-info">
              {petProfile.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL, optimization is pointless
                <img
                  src={petProfile.photo}
                  alt={petProfile.name}
                  style={{ width: "2.4em", height: "2.4em", objectFit: "cover", borderRadius: "50%", flexShrink: 0 }}
                />
              ) : (
                <span className="pet-profile-avatar">{petProfile.avatar || "🐶"}</span>
              )}
              <div>
                <h3 className="pet-profile-name">{petProfile.name}{petProfile.breed ? ` (${petProfile.breed})` : ""} 맞춤 추천 중 ✨</h3>
                <p className="pet-profile-meta">{petProfile.weight ? `${petProfile.weight}kg · ` : ""}{petProfile.size === "smallDog" ? "소형견" : petProfile.size === "mediumDog" ? "중형견" : petProfile.size === "largeDog" ? "대형견" : "모든 견종"} 입장 가능 장소 자동 탐색</p>
              </div>
            </div>
            <button type="button" className="pet-profile-edit-btn" onClick={() => setProfileModalOpen(true)}>
              ⚙️ 프로필 수정
            </button>
          </div>
        ) : (
          <div className="pet-profile-bar" role="region" aria-label="내 반려견 등록">
            <div className="pet-profile-info">
              <span className="pet-profile-avatar">🐾</span>
              <div>
                <h3 className="pet-profile-name">{lang === "ko" ? "내 반려견을 등록해보세요!" : "Register your pet!"}</h3>
                <p className="pet-profile-meta">{lang === "ko" ? "이름과 체중을 저장하면 매번 필터링할 필요 없이 딱 맞는 장소만 추천해 드려요." : "Save name and weight for automatic tailored place filtering."}</p>
              </div>
            </div>
            <button type="button" className="pet-profile-edit-btn" onClick={() => setProfileModalOpen(true)}>
              ＋ {lang === "ko" ? "댕댕이 등록" : "Register"}
            </button>
          </div>
        )}
        <header className="control-heading">
          <div><p className="section-kicker section-step">{dict.stepSearch}</p><h2>{dict.searchHeading}</h2></div>
          <p>{dict.searchDesc1} <span className="keep-together">{dict.searchDesc2}</span> <span className="keep-together">{dict.searchDesc3}</span></p>
        </header>
        <ThemeCurations activeThemeId={activeThemeId} onApplyTheme={handleApplyTheme} onClearTheme={handleClearTheme} todaySafetyLevel={todaySafety} />
        {placeCounts ? (
          <RegionCoursePicker region={region} regionOptions={regionOptions} placeCounts={placeCounts} onRegionChange={(value) => { setPage(1); track("region_search", value); setRegion(value); setTrails([]); setFestivals([]); setRuralVillages([]); setRuralFarmstays([]); setPetCafes([]); setDiscoveryLoadedRegion(null); setDiscoveryOpen(false); setRegionalReviewedFor(null); setCourseConfirmed(false); }} />
        ) : null}
        <WeatherSafeWidget region={region} themeActive={activeThemeId !== null} petName={petProfile?.name} targetDate={plannerTripDate ?? undefined} onSafetyLevel={setTodaySafety} />
        <aside className="filter-panel">
          <ConditionPicker region={region} regionOptions={regionOptions} prepFilters={prepFilters} onRegionChange={(value) => { setPage(1); track("region_search", value); setRegion(value); setTrails([]); setFestivals([]); setRuralVillages([]); setRuralFarmstays([]); setPetCafes([]); setDiscoveryLoadedRegion(null); setDiscoveryOpen(false); setRegionalReviewedFor(null); setCourseConfirmed(false); }} onTogglePrepFilter={togglePrepFilter} />
          <PetProfilePanel selected={petSize} weight={petWeight} dangerousDog={dangerousDog} onSelect={selectSize} onWeightChange={changeWeight} onDangerousDogChange={setDangerousDog} />
          <DestinationPanel selectedCategories={categories} onToggleCategory={toggleCategory} />
        </aside>
      </div>
      <div ref={resultsPanelRef} className={`results-panel interactive-results ${themeResultPulse ? "theme-result-pulse" : ""}`} aria-busy={loading}>
        <div className={`results-layout ${plannerOpen ? "planner-open" : ""}`}>
          <div className="results-primary">
            <div className="result-heading">
              <div><p className="section-kicker section-step">{dict.stepResults}</p><h2>{errorMessage ? dict.loadingErrorTitle : !catalogIsCurrent ? dict.checkingConditions : isBrowsing ? t(lang, "browseCount", { n: resultCount.toLocaleString("ko-KR") }) : resultCount > 0 ? t(lang, "confirmedCount", { n: resultCount.toLocaleString("ko-KR") }) : dict.noConfirmedYet}</h2></div>
              {catalogIsCurrent ? <p className="result-count" aria-live="polite"><strong>{resultCount.toLocaleString("ko-KR")}</strong><span>{dict.places}</span></p> : null}
            </div>
            <div className="view-mode-toggle-bar">
              <div className="view-mode-segmented" role="tablist" aria-label="결과 보기 방식">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "list"}
                  className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <span>📋</span>
                  <span>{lang === "ko" ? "목록으로 보기" : "List View"}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "map"}
                  className={`view-mode-btn ${viewMode === "map" ? "active" : ""}`}
                  onClick={() => setViewMode("map")}
                >
                  <span>🗺️</span>
                  <span>{lang === "ko" ? "지도에서 탐색" : "Interactive Map"}</span>
                </button>
              </div>
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
            <div className="match-bar-row">
              <div className="match-bar"><strong>{isBrowsing ? dict.browsingFilter : dict.allApplied}</strong><div className="active-query" aria-label={dict.currentConditions}>{region.trim() ? <span key="region">{region.trim()}</span> : null}{categories.map((category) => <span key={`cat-${category}`}>{category}</span>)}{isBrowsing && !region.trim() && categories.length === 0 && prepFilters.length === 0 ? <span key="all">{dict.allPlaces}</span> : constraints.map((item, idx) => <span key={`c-${idx}`}>{item.label}{item.kind === "preference" ? <small>{dict.preference}</small> : null}</span>)}{prepFilters.map((key) => <span key={`prep-${key}`}>{t(lang, prepFilterKeys[key])}</span>)}</div>{filtersActive ? <button type="button" className="filter-reset-button" onClick={handleResetFilters}>⟲ <span>{dict.resetFilters}</span></button> : null}</div>
              <RecentlyViewed onOpen={handleOpenViewed} />
            </div>
            {(loading || !catalogIsCurrent) && !errorMessage ? <p className="catalog-status" role="status">{dict.loadingMessage}</p> : null}
            {errorMessage ? <p className="catalog-error" role="alert">{errorMessage}</p> : null}
            {catalogIsCurrent ? (
              <>
                {catalog.results.length > 0 ? (
                  viewMode === "map" ? (
                    <InteractiveMapView
                      results={visibleResults}
                      planPlaces={planPlaces}
                      onTogglePlanPlace={(place) => {
                        const match = visibleResults.find((r) => r.place.id === place.id);
                        if (match) togglePlanPlace(match);
                      }}
                      onFocusPlaceCard={(placeId) => {
                        setViewMode("list");
                        globalThis.setTimeout(() => {
                          const target = document.querySelector(`[data-place-id="${placeId}"]`);
                          if (target) {
                            target.scrollIntoView({ behavior: "smooth", block: "center" });
                            target.classList.add("highlight-pulse");
                            globalThis.setTimeout(() => target.classList.remove("highlight-pulse"), 2000);
                          }
                        }, 80);
                      }}
                    />
                  ) : (
                    <div className="place-list">
                      {visibleResults.map((result) => {
                        const isSaved = planPlaces.some((place) => place.id === result.place.id);
                        const accessibleName = translationByPlaceId[result.place.id]?.title || result.place.name;
                        return (
                          <div
                            className="place-row"
                            data-place-id={result.place.id}
                            key={result.place.id}
                            onClickCapture={() => recordView(result.place)}
                          >
                            <ResultCard result={result} dangerousDog={dangerousDog} closureStatus={closureByPlaceId[result.place.id]} accessibility={accessibilityByPlaceId[result.place.id]} camping={campingByPlaceId[result.place.id]} congestion={congestionByPlaceId[result.place.id]} translation={translationByPlaceId[result.place.id]} lang={lang} />
                            <div className="place-action-row">
                              <Link
                                className="plan-add-button"
                                href={`/night-view?lat=${result.place.coordinates.latitude}&lng=${result.place.coordinates.longitude}&name=${encodeURIComponent(result.place.name)}`}
                                title={lang === "ko" ? "이 장소를 3D로 둘러보기" : "Explore this spot in 3D"}
                                style={{ textDecoration: "none", textAlign: "center", background: "#1e2a4a", borderColor: "#31437a", color: "#dbe4ff" }}
                              >
                                🏙️ {lang === "ko" ? "3D 보기" : "3D View"}
                              </Link>
                              <Link className="plan-add-button" href={`/place/${encodeURIComponent(result.place.id)}`} title={lang === "ko" ? "장소 상세 정보" : "Place details"} style={{ textDecoration: "none", textAlign: "center", background: "#fff", color: "#334155" }}>🔎 {lang === "ko" ? "상세" : "Info"}</Link>
                              <button type="button" className={`plan-add-button ${isSaved ? "added" : ""}`} onClick={() => togglePlanPlace(result)} aria-pressed={isSaved} aria-label={t(lang, isSaved ? "planRemoveNamed" : "planAddNamed", { name: accessibleName })}><span aria-hidden="true">{isSaved ? "✓" : "+"}</span>{isSaved ? dict.planAdded : dict.planAdd}</button>
                            </div>
                            {isSaved ? (
                              <div className="place-direct-finish-row">
                                <button
                                  type="button"
                                  className="place-direct-finish-button"
                                  onClick={finishChoosing}
                                  disabled={!hasEnoughPlaces}
                                  title={!hasEnoughPlaces ? dict.selectionDoneNeedMore : undefined}
                                  aria-label={t(lang, "planQuickDoneNamed", { name: accessibleName })}
                                >
                                  <span aria-hidden="true">➜</span>
                                  <span>{hasEnoughPlaces ? dict.planQuickDone : dict.selectionDoneNeedMore}</span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : <ZeroResultRecovery proposal={catalog.proposal} unverifiedCount={catalog.unverifiedCount} onApply={() => catalog.proposal && setPreferences((current) => current.filter((key) => !catalog.proposal?.removedPreferences.some((item) => item.key === key)))} />}
                {planPlaces.length > 0 && !selectionCompleted ? (
                  <div className="floating-trip-bar" aria-label={dict.tripBoardTitle}>
                    <button
                      type="button"
                      className={`floating-trip-btn ${hasEnoughPlaces ? "next-action-cue" : ""}`}
                      onClick={finishChoosing}
                      disabled={!hasEnoughPlaces}
                      aria-label={hasEnoughPlaces ? t(lang, "floatingTripCount", { n: planPlaces.length }) : dict.selectionDoneNeedMore}
                    >
                      <span>{hasEnoughPlaces ? t(lang, "floatingTripCount", { n: planPlaces.length }) : `🐾 ${dict.selectionDoneNeedMore}`}</span>
                    </button>
                  </div>
                ) : null}
                {catalog.results.length > 0 ? (
                  <div className="result-actions">
                    <button ref={selectionCompleteRef} type="button" className={`selection-complete-button ${hasEnoughPlaces && !selectionCompleted ? "next-action-cue" : ""}`} disabled={!hasEnoughPlaces} onClick={finishChoosing}><span>{dict.selectionDone}</span><small>{planPlaces.length === 0 ? dict.selectionDoneNeed : !hasEnoughPlaces ? dict.selectionDoneNeedMore : t(lang, "selectionDoneCount", { n: planItemCount })}</small></button>
                    <p className="sr-only" role="status" aria-live="polite">{planItemCount > 0 ? t(lang, "savedTrayCount", { n: planItemCount }) : dict.selectionDoneNeed}</p>
                  </div>
                ) : null}
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

            {selectionCompleted || region.trim() ? (
              <section ref={supplementalChoicesRef} tabIndex={-1} className="supplemental-choices" aria-labelledby="supplemental-choices-title">
                <header className="supplemental-heading">
                  <div className="supplemental-progress-line"><p className="section-kicker">{dict.supplementalTitle}</p><span>{t(lang, "supplementalProgress", { done: supplementalReviewDone, total: supplementalReviewTotal })}</span></div>
                  <h2 id="supplemental-choices-title">{dict.supplementalHeading}</h2>
                  <p>{dict.supplementalNote}</p>
                </header>

                {region.trim() ? (
                  <details key={region.trim()} className="context-disclosure" open={discoveryOpen}>
                    <summary onClick={(event) => { event.preventDefault(); setDiscoveryOpen((open) => !open); }}><span><strong>{dict.regionalDiscovery}</strong><small>{dict.regionalDiscoveryNote}</small>{regionalReviewComplete ? <em>{dict.supplementalReviewed}</em> : null}</span><b aria-hidden="true">{regionalReviewComplete ? "✓" : "＋"}</b></summary>
                    <div className="context-disclosure-body">
                      {discoveryLoading ? <p className="context-loading" role="status">{dict.loadingMessage}</p> : null}
                      {!discoveryLoading && trails.length === 0 && festivals.length === 0 && ruralVillages.length === 0 && ruralFarmstays.length === 0 ? <p className="context-empty">{dict.noRegionalDiscovery}</p> : null}
                      {trails.length > 0 ? <TrailSection trails={trails} region={region.trim()} selectedActivityIds={selectedActivityIds} onToggleActivity={togglePlanActivity} /> : null}
                      {ruralVillages.length > 0 || ruralFarmstays.length > 0 ? <RuralSection villages={ruralVillages} farmstays={ruralFarmstays} region={region.trim()} /> : null}
                      {categories.includes("cafe") && petCafes.length > 0 ? <PetCafeSection cafes={petCafes} region={region.trim()} /> : null}
                      {festivals.length > 0 ? <FestivalSection festivals={festivals} selectedActivityIds={selectedActivityIds} onToggleActivity={togglePlanActivity} /> : null}
                      <button type="button" className={`supplemental-review-button ${selectionCompleted && !regionalReviewComplete ? "next-action-cue" : ""}`} disabled={discoveryLoading} onClick={completeRegionalReview}>{regionalSelectionCount > 0 ? t(lang, "supplementalConfirmCount", { n: regionalSelectionCount }) : dict.supplementalConfirmNone}</button>
                    </div>
                  </details>
                ) : null}

                {nearbyAnchor ? (
                  <details key={nearbyAnchor.id} className="context-disclosure nearby-disclosure" open={nearbyOpenFor === nearbyAnchor.id}>
                    <summary onClick={(event) => { event.preventDefault(); const willOpen = nearbyOpenFor !== nearbyAnchor.id; setNearbyOpenFor(willOpen ? nearbyAnchor.id : null); if (willOpen) setNearbyActivatedFor(nearbyAnchor.id); }}><span><strong>{dict.nearbySaved}</strong><small>{dict.nearbySavedNote}</small>{nearbyReviewComplete ? <em>{dict.supplementalReviewed}</em> : null}</span><b aria-hidden="true">{nearbyReviewComplete ? "✓" : "＋"}</b></summary>
                    {nearbyActivatedFor === nearbyAnchor.id ? <div className="context-disclosure-body extensions">
                      <NearbyOriginPicker
                        referenceName={nearbyAnchor.name}
                        activeOrigin={activeNearbyOrigin}
                        onOriginChange={(origin) => setNearbyOrigin(origin ? { anchorId: nearbyAnchor.id, origin } : null)}
                      />
                      {auxiliaryPlaces.length > 0 ? <NearbyCatalog places={auxiliaryPlaces} fallbackOrigin={activeNearbyOrigin?.coordinates ?? nearbyAnchor.coordinates} referenceName={nearbyReferenceName} selectedPlaceIds={selectedPlaceIds} onTogglePlace={toggleSupplementalPlace} /> : null}
                      <NearbyServices origin={activeNearbyOrigin?.coordinates ?? nearbyAnchor.coordinates} referenceName={nearbyReferenceName} selectedPlaceIds={selectedPlaceIds} onTogglePlace={toggleSupplementalPlace} />
                      <button type="button" className="supplemental-review-button" onClick={completeNearbyReview}>{nearbySelectionCount > 0 ? t(lang, "supplementalConfirmCount", { n: nearbySelectionCount }) : dict.supplementalConfirmNone}</button>
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

            {selectionCompleted && planPlaces.length > 0 ? (
              <CourseBuilder selectedPlaces={planPlaces} origin={planPlaces[0]!.coordinates} highlightAction={selectionCompleted && !courseConfirmed} onApplyOrder={applyCourseOrder} onConfigurationChange={invalidateCourse} />
            ) : null}

            {courseConfirmed && hasPlanItems ? (
              <div ref={plannerDialogRef} tabIndex={-1} className="trip-board-plan" role={plannerOpen ? "dialog" : undefined} aria-modal={plannerOpen ? true : undefined} aria-label={dict.tripBoardTitle}>
                {plannerOpen ? <div className="mobile-planner-heading"><strong>{dict.tripBoardTitle}</strong><button type="button" autoFocus aria-label={dict.closeTripBoard} onClick={closePlanner}>×</button></div> : null}
                <PlanBuilder selectedPlaces={planPlaces} selectedActivities={planActivities} generateRequest={planGenerationRequest} courseConfirmed={courseConfirmed} onRemove={removePlanPlace} onRemoveActivity={removePlanActivity} onDwellChange={changePlaceDwell} onTripDateChange={setPlannerTripDate} onClear={clearPlanPlaces} />
              </div>
            ) : null}
          </aside>
        </div>
      </div>
      {hasPlanItems ? <button ref={tripTrayRef} type="button" className="saved-trip-tray" disabled={!hasEnoughPlaces && !courseConfirmed} aria-label={courseConfirmed ? dict.openTripBoard : hasEnoughPlaces ? dict.selectionDone : t(lang, "savedTrayCount", { n: planItemCount })} onClick={courseConfirmed ? openPlanner : finishChoosing}><span><strong>{dict.savedTray}</strong><small>{planPlaces[0]?.name ?? planActivities[0]?.title}{planItemCount > 1 ? ` +${planItemCount - 1}` : ""} · {planPlaces.length === 0 ? dict.selectionDoneNeed : !hasEnoughPlaces ? dict.selectionDoneNeedMore : courseConfirmed ? dict.openTripBoard : selectionCompleted ? dict.savedTrayNext : dict.selectionDone}</small></span><b>{planItemCount}</b></button> : null}
      <FloatingQuickNav viewMode={viewMode} onToggleViewMode={() => setViewMode((mode) => mode === "list" ? "map" : "list")} />
      <PetProfileModal
        initialProfile={petProfile}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSavePetProfile}
      />
    </section>
  );
}
