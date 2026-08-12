"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { AuxiliaryPlace, RawPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import { preparationFilterLabels, type ConditionKey, type MatchEvaluation, type PreparationFilterKey, type SelectedConstraint } from "@/domain/types";
import { ConditionPicker } from "@/features/search/ConditionPicker";
import { PetProfilePanel } from "@/features/search/PetProfilePanel";
import { DestinationPanel } from "@/features/search/DestinationPanel";
import { ResultCard, type PublicClosureStatus } from "@/features/results/ResultCard";
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

const labels: Record<ConditionKey, string> = { smallDog: "소형견", mediumDog: "중형견", largeDog: "대형견" };

function selected(key: ConditionKey, kind: SelectedConstraint["kind"]): SelectedConstraint {
  return { key, label: labels[key], kind, protectedCategory: kind === "hard" ? "admission" : null };
}

type CatalogApiResponse = {
  success: boolean;
  data: { catalog: CatalogPage; accessibility?: Record<string, AccessibilityData>; camping?: Record<string, CampingData>; congestion?: Record<string, CongestionData>; translations?: Record<string, TranslationData>; lang?: string } | null;
  error: { message: string } | null;
};

type ClosureApiResponse = { success: boolean; closures: Record<string, PublicClosureStatus["closures"]> };

export function SearchExperience({ initialCatalog, auxiliaryPlaces }: { initialCatalog: CatalogPage; auxiliaryPlaces: AuxiliaryPlace[] }) {
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
  const [lang, setLang] = useState<string>("ko");
  const [planPlaces, setPlanPlaces] = useState<PlanPlace[]>([]);
  const [trails, setTrails] = useState<TrailData[]>([]);
  const [festivals, setFestivals] = useState<FestivalData[]>([]);
  const constraints = useMemo(() => {
    const seen = new Set<string>();
    const result: SelectedConstraint[] = [];
    for (const key of hard) {
      const id = `${key}-hard`;
      if (!seen.has(id)) { seen.add(id); result.push(selected(key, "hard")); }
    }
    for (const key of preferences) {
      const id = `${key}-preference`;
      if (!seen.has(id)) { seen.add(id); result.push(selected(key, "preference")); }
    }
    return result;
  }, [hard, preferences]);
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
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setErrorMessage(null);
    });
    fetch(`/api/places?${parameters}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as CatalogApiResponse;
        if (!response.ok || !body.success || !body.data) throw new Error(body.error?.message ?? "장소를 불러오지 못했어요.");
        setCatalog(body.data.catalog);
        setAccessibilityByPlaceId(body.data.accessibility ?? {});
        setCampingByPlaceId(body.data.camping ?? {});
        setCongestionByPlaceId(body.data.congestion ?? {});
        setTranslationByPlaceId(body.data.translations ?? {});
        const placeIds = body.data.catalog.results.map((result) => result.place.id);

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

        await Promise.all([closureTask, trailTask, festivalTask]);
        setCatalogRequestKey(requestKey);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage("조건 결과를 새로 불러오지 못했어요. 잠시 후 조건을 다시 눌러주세요.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hardKeys, preferenceKeys, page, region, categories, prepFilters, lang, requestKey]);

  const toggle = (items: ConditionKey[], key: ConditionKey, update: (next: ConditionKey[]) => void) => {
    setPage(1);
    update(items.includes(key) ? items.filter((item) => item !== key) : [...new Set([...items, key])]);
  };
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
    <section className="search-workspace" id="search" aria-label="반려견 동반 장소 조건 검색">
      <div className="lang-toggle" role="group" aria-label="언어 선택">
        <button type="button" className={lang === "ko" ? "active" : ""} onClick={() => setLang("ko")}>한국어</button>
        <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
        <button type="button" className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button>
      </div>
      <div className="control-panel">
        <header className="control-heading">
          <div><p className="section-kicker">장소 찾기</p><h2>어떤 곳을 찾고 있나요?</h2></div>
          <p>크기와 조건을 고르면 <span className="keep-together">전체 저장 데이터에서</span> <span className="keep-together">바로 다시 찾아요.</span></p>
        </header>
        <aside className="filter-panel">
          <PetProfilePanel selected={petSize} weight={petWeight} dangerousDog={dangerousDog} onSelect={selectSize} onWeightChange={changeWeight} onDangerousDogChange={setDangerousDog} />
          <DestinationPanel region={region} selectedCategories={categories} onRegionChange={(value) => { setPage(1); setRegion(value); }} onToggleCategory={toggleCategory} />
          <ConditionPicker hard={hard} preferences={preferences} prepFilters={prepFilters} onToggleHard={(key) => toggle(hard, key, setHard)} onTogglePreference={(key) => toggle(preferences, key, setPreferences)} onTogglePrepFilter={togglePrepFilter} />
        </aside>
      </div>
      <div className="results-panel interactive-results" aria-busy={loading}>
        <div className="result-heading">
          <div><p className="section-kicker">{isBrowsing ? "전국 등록 장소" : "확인된 결과"}</p><h2>{!catalogIsCurrent ? "조건을 확인하고 있어요" : isBrowsing ? `${resultCount.toLocaleString("ko-KR")}곳을 둘러보세요` : resultCount > 0 ? `현재 ${resultCount.toLocaleString("ko-KR")}곳에서 가능을 확인했어요` : "아직 가능이 확인된 곳은 없어요"}</h2></div>
          {catalogIsCurrent ? <p className="result-count" aria-live="polite"><strong>{resultCount.toLocaleString("ko-KR")}</strong><span>곳</span></p> : null}
        </div>
        <p className="catalog-coverage">현재 상세정보 확인 가능 {catalog.searchableCount.toLocaleString("ko-KR")}곳 · 전국 원천 {catalog.sourceTotalCount.toLocaleString("ko-KR")}곳 · 상세 수집률 {catalog.sourceTotalCount > 0 ? ((catalog.detailCoverage / catalog.sourceTotalCount) * 100).toFixed(1) : "0.0"}% · 미수집 {catalog.pendingDetailCount.toLocaleString("ko-KR")}곳 · 실패 {catalog.failedDetailCount.toLocaleString("ko-KR")}곳</p>
        {!isBrowsing && catalogIsCurrent ? <dl className="decision-summary" aria-label="조건 판정 현황">
          <div><dt>가능 명시 확인</dt><dd>{catalog.confirmedMatchCount.toLocaleString("ko-KR")}</dd></div>
          <div><dt>확인 불가</dt><dd>{catalog.confirmedNonMatchCount.toLocaleString("ko-KR")}</dd></div>
          <div><dt>정보 미확인</dt><dd>{catalog.unverifiedCount.toLocaleString("ko-KR")}</dd></div>
        </dl> : null}
        <div className="match-bar"><strong>{isBrowsing ? "탐색 필터" : "모두 적용"}</strong><div className="active-query" aria-label="현재 적용 조건">{region.trim() ? <span key="region">{region.trim()}</span> : null}{categories.map((category) => <span key={`cat-${category}`}>{category}</span>)}{isBrowsing && !region.trim() && categories.length === 0 && prepFilters.length === 0 ? <span key="all">전체 장소</span> : constraints.map((item, idx) => <span key={`c-${idx}`}>{item.label}{item.kind === "preference" ? <small>선호</small> : null}</span>)}{prepFilters.map((key) => <span key={`prep-${key}`}>{preparationFilterLabels[key]}</span>)}</div></div>
        {(loading || !catalogIsCurrent) && !errorMessage ? <p className="catalog-status" role="status">전체 저장 데이터에서 조건에 맞는 곳을 확인하고 있어요.</p> : null}
        {errorMessage ? <p className="catalog-error" role="alert">{errorMessage}</p> : null}
        {catalogIsCurrent ? (
          <>
            {catalogIsCurrent && festivals.length > 0 ? (
              <div className="discovery-row">
                {region.trim() && trails.length > 0 ? <TrailSection trails={trails} region={region.trim()} /> : null}
                <FestivalSection festivals={festivals} />
              </div>
            ) : null}
            {catalog.results.length > 0 ? <div className="place-list">{catalog.results.map((result) => <div className="place-row" key={result.place.id}><ResultCard result={result} dangerousDog={dangerousDog} closureStatus={closureByPlaceId[result.place.id]} accessibility={accessibilityByPlaceId[result.place.id]} camping={campingByPlaceId[result.place.id]} congestion={congestionByPlaceId[result.place.id]} translation={translationByPlaceId[result.place.id]} lang={lang} /><button type="button" className={`plan-add-button ${planPlaces.some((p) => p.id === result.place.id) ? "added" : ""}`} onClick={() => togglePlanPlace(result)} aria-label={planPlaces.some((p) => p.id === result.place.id) ? "계획서에서 제거" : "계획서에 추가"}>{planPlaces.some((p) => p.id === result.place.id) ? "✓ 추가됨" : "+ 계획서"}</button></div>)}</div> : <ZeroResultRecovery proposal={catalog.proposal} unverifiedCount={catalog.unverifiedCount} onApply={() => catalog.proposal && setPreferences((current) => current.filter((key) => !catalog.proposal?.removedPreferences.some((item) => item.key === key)))} />}
            {!isBrowsing && catalog.confirmedMatchCount > 0 && catalog.unverifiedCount > 0 ? <p className="unknown-note"><strong>정보 미확인 {catalog.unverifiedCount.toLocaleString("ko-KR")}곳은 불가능하다고 판정한 곳이 아니에요.</strong> 정책을 확인하면 조건에 맞을 수도 있어요.</p> : null}
            <nav className="catalog-pagination" aria-label="장소 결과 페이지">
              <button type="button" disabled={loading || catalog.page <= 1} onClick={() => setPage(Math.max(1, catalog.page - 1))}>이전 50곳</button>
              <span><strong>{catalog.page.toLocaleString("ko-KR")}</strong> / {catalog.totalPages.toLocaleString("ko-KR")}페이지</span>
              <button type="button" disabled={loading || catalog.page >= catalog.totalPages} onClick={() => setPage(Math.min(catalog.totalPages, catalog.page + 1))}>다음 50곳</button>
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
                    <p>📍 지역을 입력하면 그 지역의 동물병원·펫샵·동반 식당을 보여드려요.</p>
                    <p className="hint-example">예: 속초, 제주, 부산 해운대</p>
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
