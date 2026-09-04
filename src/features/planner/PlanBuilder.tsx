"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { PlanActivity, PlanPlace, RouteSegment } from "@/domain/plan";
import { distanceKm } from "@/domain/geo";
import { buildDepartureCandidates, buildTravelSchedule, formatClock, formatDateInput } from "@/domain/travel-schedule";
import { DepartureTimePicker } from "@/features/planner/DepartureTimePicker";
import { track } from "@/domain/usage-client";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";
import { generateTravelPlan } from "@/domain/planning/orchestrator";
import { createDirectionsApiProvider } from "@/domain/planning/providers/directions-api";
import { planningRequestFromLegacy } from "@/features/search/planning-request-adapter";
import { SmartChecklist } from "@/features/planner/SmartChecklist";
import { ShareTripModal } from "@/features/planner/ShareTripModal";
import { TripWeatherCard } from "@/features/weather/TripWeatherCard";

type RouteApiResponse = {
  success: boolean;
  data: {
    summary: { distanceKm: number; durationMinutes: number; taxiFare: number | null; tollFee: number | null };
    congestion: { totalSegments: number; smooth: number; slow: number; congested: number; jammed: number; hasCongestion: boolean };
    congestedRoads: { name: string; distance: number; speed: number; stateLabel: string; stateColor: string }[];
    trafficBasis?: "live" | "forecast";
    departureTime?: string | null;
    mapLink: string;
    naviLink: string;
  } | null;
  error: { message: string } | null;
};

type DepartureRecommendation = {
  date: string;
  time: string;
  durationMinutes: number;
  comparisonCount: number;
};

function tomorrowInput(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateInput(tomorrow);
}

function localeFor(lang: "ko" | "en" | "zh"): string {
  return lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "ko-KR";
}

type Props = {
  selectedPlaces: PlanPlace[];
  selectedActivities: PlanActivity[];
  generateRequest: number;
  courseConfirmed: boolean;
  onRemove: (id: string) => void;
  onRemoveActivity: (id: string) => void;
  onDwellChange: (id: string, minutes: number | null) => void;
  onClear: () => void;
};

export function PlanBuilder({ selectedPlaces, selectedActivities, generateRequest, courseConfirmed, onRemove, onRemoveActivity, onDwellChange, onClear }: Props) {
  const { lang, dict } = useLang();
  const [routes, setRoutes] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tripDate, setTripDate] = useState(tomorrowInput);
  const [preferredDeparture, setPreferredDeparture] = useState("09:00");
  const [stayMinutes, setStayMinutes] = useState(90);
  const [departureRecommendation, setDepartureRecommendation] = useState<DepartureRecommendation | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const handledGenerateRequest = useRef(0);
  const printDialogRef = useRef<HTMLDivElement>(null);
  const printButtonRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const computedFingerprintRef = useRef<string | null>(null);

  // Inputs that fully determine the computed plan; used to decide whether a
  // prefetched result can be revealed as-is when the analysis button is pressed.
  const planFingerprint = useCallback(() => JSON.stringify([
    tripDate,
    preferredDeparture,
    stayMinutes,
    selectedPlaces.map((place) => [place.id, place.dwellMinutes ?? null]),
    selectedActivities.map((activity) => activity.id),
  ]), [tripDate, preferredDeparture, stayMinutes, selectedPlaces, selectedActivities]);

  const scrollToResults = useCallback(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, []);

  const generatePlan = useCallback(async () => {
    if (selectedPlaces.length < 2) return;
    const fingerprint = planFingerprint();
    setLoading(true);
    setError(null);
    setNotice(null);
    setRoutes([]);
    setDepartureRecommendation(null);
    try {
      const fetchRoadSegment = async (from: PlanPlace, to: PlanPlace, departureTime?: string): Promise<RouteSegment> => {
        const origin = `${from.coordinates.longitude},${from.coordinates.latitude}`;
        const destination = `${to.coordinates.longitude},${to.coordinates.latitude}`;
        const parameters = new URLSearchParams({ origin, destination, originName: from.name, destName: to.name });
        if (departureTime) parameters.set("departureTime", departureTime);
        const res = await fetch(`/api/directions?${parameters}`, { signal: AbortSignal.timeout(7_000) });
        const json: RouteApiResponse = await res.json();
        if (!res.ok || !json.success || !json.data) throw new Error(json.error?.message ?? dict.planError);
        return {
          fromPlaceId: from.id, toPlaceId: to.id, fromName: from.name, toName: to.name,
          distanceKm: json.data.summary.distanceKm, durationMinutes: json.data.summary.durationMinutes, routeMode: "road",
          hasCongestion: json.data.congestion.hasCongestion, congestedRoads: json.data.congestedRoads,
          smoothSegments: json.data.congestion.smooth, slowSegments: json.data.congestion.slow,
          congestedSegments: json.data.congestion.congested, jammedSegments: json.data.congestion.jammed,
          mapLink: json.data.mapLink, naviLink: json.data.naviLink,
        };
      };
      const fallbackSegment = (from: PlanPlace, to: PlanPlace): RouteSegment => {
        const fromName = encodeURIComponent(from.name);
        const toName = encodeURIComponent(to.name);
        return {
          fromPlaceId: from.id, toPlaceId: to.id, fromName: from.name, toName: to.name,
          distanceKm: Math.round(distanceKm(from.coordinates, to.coordinates) * 10) / 10,
          durationMinutes: null, routeMode: "approximate", hasCongestion: false, congestedRoads: [],
          smoothSegments: 0, slowSegments: 0, congestedSegments: 0, jammedSegments: 0,
          mapLink: `https://map.kakao.com/link/from/${fromName},${from.coordinates.latitude},${from.coordinates.longitude}/to/${toName},${to.coordinates.latitude},${to.coordinates.longitude}`,
          naviLink: `https://map.kakao.com/?sName=${fromName}&eName=${toName}`,
        };
      };
      const planningRequest = planningRequestFromLegacy({
        planId: `ui-plan-${generateRequest}`,
        region: "",
        places: selectedPlaces,
        activities: selectedActivities,
        qualificationContext: {
          queryFingerprint: "legacy-ui-selection",
          dataSnapshotId: "legacy-ui",
          matchRuleVersion: "legacy-ui-v1",
          petProfileRevision: 0,
          hardConstraintKeys: [],
          preferenceKeys: [],
          categoryKeys: [],
          preparationFilterKeys: [],
          petProfile: { size: null, weightKg: null, dangerousDog: false },
        },
        settings: { tripDate, startTime: preferredDeparture, defaultDwellMinutes: stayMinutes },
      });
      const engineTask = (async (): Promise<RouteSegment[]> => {
        const envelope = await generateTravelPlan(planningRequest, { routingProvider: createDirectionsApiProvider() });
        if (envelope.outcome.kind !== "generated") throw new Error(dict.planError);
        const byId = new Map(envelope.outcome.plan.legs.map((leg) => [leg.id, leg]));
        return selectedPlaces.slice(0, -1).map((from, index) => {
          const to = selectedPlaces[index + 1]!;
          const leg = byId.get(`${from.id}->${to.id}`);
          if (!leg) return fallbackSegment(from, to);
          return {
            fromPlaceId: from.id,
            toPlaceId: to.id,
            fromName: from.name,
            toName: to.name,
            distanceKm: leg.distanceKm,
            durationMinutes: leg.durationMinutes,
            routeMode: leg.basis === "provider-road" ? "road" : "approximate",
            hasCongestion: leg.congestedRoads.length > 0,
            congestedRoads: leg.congestedRoads.map((road) => ({ name: road.name, distance: road.distanceMeters, speed: road.speedKph, stateLabel: road.state, stateColor: "#b45309" })),
            smoothSegments: 0,
            slowSegments: 0,
            congestedSegments: leg.congestedRoads.length,
            jammedSegments: leg.congestedRoads.filter((road) => road.state === "jammed").length,
            mapLink: leg.mapLink,
            naviLink: leg.naviLink,
          } satisfies RouteSegment;
        });
      })();
      const recommendationTask = (async (): Promise<DepartureRecommendation | null> => {
        const from = selectedPlaces[0];
        const to = selectedPlaces[1];
        if (!from || !to) return null;
        const candidates = buildDepartureCandidates(tripDate, preferredDeparture);
        const comparisons = await Promise.all(candidates.map(async (candidate) => {
          try {
            const route = await fetchRoadSegment(from, to, candidate.providerValue);
            return route.durationMinutes === null ? null : { candidate, route };
          } catch {
            return null;
          }
        }));
        const valid = comparisons.filter((item): item is NonNullable<typeof item> => item !== null);
        const best = valid.sort((left, right) => {
          const durationDifference = left.route.durationMinutes! - right.route.durationMinutes!;
          if (durationDifference !== 0) return durationDifference;
          const leftPreferred = left.candidate.label === preferredDeparture ? 0 : 1;
          const rightPreferred = right.candidate.label === preferredDeparture ? 0 : 1;
          return leftPreferred - rightPreferred || left.candidate.date.getTime() - right.candidate.date.getTime();
        })[0];
        return best ? {
          date: tripDate,
          time: best.candidate.label,
          durationMinutes: best.route.durationMinutes!,
          comparisonCount: valid.length,
        } : null;
      })();
      const [segments, recommendation] = await Promise.all([engineTask, recommendationTask]);
      setRoutes(segments);
      setDepartureRecommendation(recommendation);
      if (segments.some((segment) => segment.routeMode === "approximate")) setNotice(dict.planFallback);
      computedFingerprintRef.current = fingerprint;
      track("plan_generate", String(selectedPlaces.length));
    } catch (routeError) {
      const isTimeout = routeError instanceof DOMException && routeError.name === "TimeoutError";
      setError(isTimeout ? dict.planTimeout : routeError instanceof Error ? routeError.message : dict.planError);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaces, selectedActivities, generateRequest, dict, tripDate, preferredDeparture, stayMinutes, planFingerprint]);

  // Prefetch: once the course is confirmed, the plan is (re)computed in the
  // background after a short debounce — on confirm itself and whenever the
  // date / departure time / stay length changes — so the analysis button can
  // reveal instantly instead of recomputing from scratch.
  useEffect(() => {
    if (!courseConfirmed || selectedPlaces.length < 2) return;
    if (generateRequest > handledGenerateRequest.current) handledGenerateRequest.current = generateRequest;
    const timer = globalThis.setTimeout(() => void generatePlan(), 500);
    return () => globalThis.clearTimeout(timer);
  }, [courseConfirmed, generateRequest, generatePlan, selectedPlaces.length]);

  // Reveal instantly when a fresh prefetched plan already matches the current
  // inputs; otherwise compute on demand. Either way, land on the results.
  const handleGenerateClick = useCallback(() => {
    if (routes.length > 0 && computedFingerprintRef.current === planFingerprint()) {
      scrollToResults();
      return;
    }
    void (async () => {
      await generatePlan();
      scrollToResults();
    })();
  }, [routes.length, planFingerprint, generatePlan, scrollToResults]);

  const plannedDeparture = departureRecommendation?.time ?? preferredDeparture;
  const dwellByPlaceId = useMemo(
    () => Object.fromEntries(selectedPlaces.filter((place) => place.dwellMinutes != null).map((place) => [place.id, place.dwellMinutes!])),
    [selectedPlaces],
  );
  const schedule = useMemo(
    () => buildTravelSchedule(routes, tripDate, plannedDeparture, stayMinutes, departureRecommendation?.durationMinutes, dwellByPlaceId),
    [routes, tripDate, plannedDeparture, stayMinutes, departureRecommendation?.durationMinutes, dwellByPlaceId],
  );
  const tripDateLabel = useMemo(() => {
    const date = new Date(`${tripDate}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? tripDate
      : date.toLocaleDateString(localeFor(lang), { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  }, [tripDate, lang]);
  const finalArrival = formatClock(schedule.at(-1)?.arrivalAt ?? null);
  const incompleteRouteCount = routes.filter((route) => route.routeMode === "approximate" || route.durationMinutes === null).length;
  const resetGeneratedPlan = () => {
    setRoutes([]);
    setDepartureRecommendation(null);
    setNotice(null);
    setError(null);
  };

  const closePrintDialog = useCallback(() => {
    setPrintDialogOpen(false);
    globalThis.setTimeout(() => printButtonRef.current?.focus({ preventScroll: true }), 0);
  }, []);

  const openPrintDialog = () => setPrintDialogOpen(true);

  const printCurrentPlan = () => {
    setPrintDialogOpen(false);
    globalThis.setTimeout(() => window.print(), 0);
  };

  const retryBeforePrint = () => {
    setPrintDialogOpen(false);
    void generatePlan();
  };

  useEffect(() => {
    if (!printDialogOpen) return;
    const dialog = printDialogRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePrintDialog();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled)"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
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
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [closePrintDialog, printDialogOpen]);

  if (selectedPlaces.length === 0 && selectedActivities.length === 0) return null;

  return (
    <section className="extension-card plan-builder-card" aria-labelledby="plan-builder-title">
      <header className="plan-print-header">
        <div className="plan-print-brand"><span>같이</span><strong>갈개</strong></div>
        <p>{dict.planPrintSubtitle}</p>
      </header>
      <div className="extension-heading">
        <div>
          <p className="section-kicker">{dict.planTitle}</p>
          <h2 id="plan-builder-title">{t(lang, "planBoardSummary", { places: selectedPlaces.length, activities: selectedActivities.length })}</h2>
        </div>
        <button type="button" className="clear-button" onClick={onClear}>{dict.planClear}</button>
      </div>

      <section className="plan-time-settings" aria-labelledby="plan-time-settings-title">
        <div>
          <h3 id="plan-time-settings-title">{dict.planTimeSettings}</h3>
          <p>{dict.planTimeSettingsNote}</p>
        </div>
        <div className="plan-time-fields">
          <label>
            <span>{dict.planTravelDate}</span>
            <input type="date" min={formatDateInput(new Date())} value={tripDate} onChange={(event) => { setTripDate(event.target.value); resetGeneratedPlan(); }} />
          </label>
          <label>
            <span>{dict.planPreferredDeparture}</span>
            <DepartureTimePicker
              value={preferredDeparture}
              onChange={(next) => { setPreferredDeparture(next); resetGeneratedPlan(); }}
              ariaLabel={dict.planPreferredDeparture}
            />
          </label>
          <label>
            <span>{dict.planStayMinutes}</span>
            <select value={stayMinutes} onChange={(event) => { setStayMinutes(Number(event.target.value)); resetGeneratedPlan(); }}>
              {[60, 90, 120, 180].map((minutes) => <option key={minutes} value={minutes}>{t(lang, "planStayOption", { n: minutes })}</option>)}
            </select>
          </label>
        </div>
      </section>

      {courseConfirmed && routes.length > 0 ? (
        <section className={`departure-recommendation ${departureRecommendation ? "forecast" : "selected-time"}`} aria-label={departureRecommendation ? dict.planTrafficRecommendation : dict.planPlannedDeparture}>
          <div className="departure-recommendation-heading">
            <p>{departureRecommendation ? dict.planTrafficRecommendation : dict.planPlannedDeparture}</p>
            <span>{tripDateLabel}</span>
          </div>
          <div className="departure-recommendation-main">
            <time dateTime={`${tripDate}T${plannedDeparture}`}>{plannedDeparture}</time>
            <div><strong>{selectedPlaces[0]?.name} → {selectedPlaces[1]?.name}</strong><small>{departureRecommendation ? t(lang, "planRecommendationCompared", { n: departureRecommendation.comparisonCount, minutes: departureRecommendation.durationMinutes }) : dict.planRecommendationUnavailable}</small></div>
          </div>
          <dl>
            <div><dt>{dict.planFirstLeg}</dt><dd>{schedule[0]?.durationMinutes == null ? dict.planTimeUnknown : t(lang, "planDuration", { minutes: schedule[0].durationMinutes })}</dd></div>
            <div><dt>{dict.planEstimatedTripEnd}</dt><dd>{finalArrival ?? dict.planTimeUnknown}</dd></div>
          </dl>
          <p className="departure-recommendation-note">{dict.planForecastBasis}</p>
        </section>
      ) : null}

      {courseConfirmed && routes.length > 0 ? (
        <section className="plan-print-overview" aria-labelledby="plan-print-overview-title">
          <div className="plan-report-heading">
            <div>
              <p className="plan-report-eyebrow">{dict.planReportTitle}</p>
              <h3 id="plan-print-overview-title">{dict.planReportSummary}</h3>
            </div>
            <span>{dict.planReportStatus}</span>
          </div>
          <dl className="plan-report-meta">
            <div><dt>{dict.planReportDate}</dt><dd>{tripDateLabel}</dd></div>
            <div><dt>{dict.planReportStops}</dt><dd>{selectedPlaces.length}</dd></div>
            <div><dt>{dict.planReportEnd}</dt><dd>{finalArrival ?? dict.planTimeUnknown}</dd></div>
          </dl>
          <TripWeatherCard tripDate={tripDate} coordinates={selectedPlaces[0]?.coordinates ?? null} />
          <table className="plan-report-table">
            <thead>
              <tr>
                <th scope="col">{dict.planReportOrder}</th>
                <th scope="col">{dict.planReportDestination}</th>
                <th scope="col">{dict.planReportArrival}</th>
                <th scope="col">{dict.planReportDeparture}</th>
                <th scope="col">{dict.planReportDistance}</th>
                <th scope="col">{dict.planReportDuration}</th>
              </tr>
            </thead>
            <tbody>
              {selectedPlaces.map((place, index) => {
                const incoming = schedule[index - 1];
                const outgoing = schedule[index];
                const arrival = index === 0 ? "—" : formatClock(incoming?.arrivalAt ?? null) ?? dict.planTimeUnknown;
                const departure = index === selectedPlaces.length - 1 ? "—" : formatClock(outgoing?.departureAt ?? null) ?? dict.planTimeUnknown;
                const distance = incoming ? `${incoming.route.distanceKm}km` : "—";
                const duration = incoming
                  ? incoming.durationMinutes === null
                    ? dict.planStraightDistance
                    : t(lang, "planDuration", { minutes: incoming.durationMinutes })
                  : "—";
                return (
                  <tr key={`report-${place.id}`}>
                    <th scope="row">{index + 1}</th>
                    <td><strong>{place.name}</strong><small>{place.address}</small></td>
                    <td>{arrival}</td>
                    <td>{departure}</td>
                    <td>{distance}</td>
                    <td>{duration}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <h3 className="plan-stops-title">{dict.courseChooseStops}</h3>
      <ol className="plan-place-list">
        {selectedPlaces.map((place, idx) => (
          <li key={place.id}>
            <span className="plan-order">{idx + 1}</span>
            <div className="plan-place-info">
              <strong>{place.name}</strong>
              <small>{place.address}</small>
              {place.policySourceText ? <small className="plan-policy">{place.policySourceText.slice(0, 60)}</small> : null}
            </div>
            <label
              className="plan-dwell-control"
              title={lang === "ko" ? "이 장소에서 머무는 시간" : "How long to stay here"}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 11, color: "#64748b" }}
            >
              <span>{lang === "ko" ? "체류" : "Stay"}</span>
              <select
                value={place.dwellMinutes ?? ""}
                aria-label={`${lang === "ko" ? `${place.name} 체류 시간` : `Stay duration at ${place.name}`}`}
                style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 6px", fontSize: 12, background: "#fff", color: "#1e293b" }}
                onChange={(event) => {
                  onDwellChange(place.id, event.target.value === "" ? null : Number(event.target.value));
                  resetGeneratedPlan();
                }}
              >
                <option value="">{lang === "ko" ? `기본 ${stayMinutes}분` : `Default ${stayMinutes}m`}</option>
                {[60, 90, 120, 180, 240].map((minutes) => (
                  <option key={minutes} value={minutes}>{t(lang, "planStayOption", { n: minutes })}</option>
                ))}
              </select>
            </label>
            <button type="button" className="remove-button" aria-label={t(lang, "planRemoveNamed", { name: place.name })} onClick={() => onRemove(place.id)}>✕</button>
          </li>
        ))}
      </ol>

      {selectedActivities.length > 0 ? (
        <div className="plan-activities">
          <h3>{dict.planActivities}</h3>
          <p>{dict.planActivityNote}</p>
          <ul>
            {selectedActivities.map((activity) => (
              <li key={activity.id}>
                <span aria-hidden="true">{activity.type === "festival" ? "축" : "길"}</span>
                <div><strong>{activity.title}</strong><small>{activity.detail}</small>{activity.url ? <a href={activity.url} target="_blank" rel="noreferrer">{dict.activityDetails}</a> : null}</div>
                <button type="button" className="remove-button" aria-label={t(lang, "activityRemoveNamed", { name: activity.title })} onClick={() => onRemoveActivity(activity.id)}>×</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" className="plan-generate-button" disabled={selectedPlaces.length < 2 || loading || !courseConfirmed} onClick={handleGenerateClick}>
        {loading ? dict.planLoading : selectedPlaces.length < 2 ? dict.planNeedMore : !courseConfirmed ? dict.planConfirmCourseFirst : t(lang, "planGenerate", { n: selectedPlaces.length })}
      </button>

      {error ? <p className="plan-error" role="alert">{error}</p> : null}
      {notice ? <p className="plan-notice" role="status">{notice}</p> : null}

      {courseConfirmed && routes.length > 0 ? (
        <div className="plan-routes" ref={resultsRef}>
          <div className="plan-routes-heading"><span>{dict.planSchedule}</span><h3>{dict.planRoutes}</h3></div>
          {schedule.map(({ route, departureAt, arrivalAt, durationMinutes }, i) => {
            const departureClock = formatClock(departureAt);
            const arrivalClock = formatClock(arrivalAt);
            const nextDepartureClock = formatClock(schedule[i + 1]?.departureAt ?? null);
            return <article key={`${route.fromPlaceId}-${route.toPlaceId}`} className="plan-route-segment">
              <div className="route-timeline">
                <div className="route-stop route-stop-from">
                  <span>{i + 1}</span>
                  <div><small>{departureClock ? t(lang, "planDepartTime", { time: departureClock }) : dict.planTimeUnknown}</small><strong>{route.fromName}</strong></div>
                </div>
                <div className="route-movement">
                  <span aria-hidden="true">↓</span>
                  <div><small>{dict.planDrive}</small><strong>{route.distanceKm}km · {durationMinutes === null ? dict.planStraightDistance : t(lang, "planDuration", { minutes: durationMinutes })}</strong></div>
                </div>
                <div className="route-stop route-stop-to">
                  <span>{i + 2}</span>
                  <div>
                    <small>{arrivalClock ? t(lang, "planArrivalTime", { time: arrivalClock }) : dict.planTimeUnknown}</small>
                    <strong>{route.toName}</strong>
                    <em>{i === schedule.length - 1 ? dict.planFinalArrival : nextDepartureClock ? t(lang, "planStayThen", { minutes: dwellByPlaceId[route.toPlaceId] ?? stayMinutes, time: nextDepartureClock }) : dict.planTimeUnknown}</em>
                  </div>
                </div>
              </div>
              {route.routeMode === "approximate" ? <p className="congestion-ok">{dict.planStraightDistanceNote}</p> : route.hasCongestion ? (
                <div className="route-congestion">
                  <p className="congestion-warning">{t(lang, "planCongestionWarn", { n: route.congestedSegments + route.jammedSegments })}</p>
                  <ul className="congested-roads">
                    {route.congestedRoads.slice(0, 3).map((road, j) => (
                      <li key={j}>
                        <span className="road-name">{road.name}</span>
                        <span style={{ color: road.stateColor }}>{road.stateLabel}</span>
                        <span className="road-speed">{road.speed}km/h</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="congestion-ok">{dict.planCongestionOk}</p>
              )}
              <div className="route-links">
                <a href={route.mapLink} target="_blank" rel="noreferrer">{dict.planKakaoMap}</a>
                <a href={route.naviLink} target="_blank" rel="noreferrer">{dict.planNavi}</a>
              </div>
            </article>;
          })}
          <SmartChecklist places={selectedPlaces} />
          <div className="plan-actions">
            <button type="button" onClick={() => setShareDialogOpen(true)} className="btn-save" style={{ marginRight: "0.5rem" }}>
              📲 {lang === "ko" ? "카카오톡/코스 공유" : "Share Itinerary"}
            </button>
            <button ref={printButtonRef} type="button" onClick={openPrintDialog} className="print-button">{dict.planPrint}</button>
          </div>
          <ShareTripModal
            isOpen={shareDialogOpen}
            onClose={() => setShareDialogOpen(false)}
            places={selectedPlaces}
            routes={routes}
            tripDate={tripDate}
            departureTime={departureRecommendation?.time ?? preferredDeparture}
            finalArrival={finalArrival}
          />
        </div>
      ) : null}
      {printDialogOpen ? (
        <div className="plan-print-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closePrintDialog(); }}>
          <div
            ref={printDialogRef}
            className="plan-print-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="plan-print-dialog-title"
            aria-describedby="plan-print-dialog-description"
          >
            <span className={`plan-print-dialog-icon ${incompleteRouteCount > 0 ? "waiting" : "ready"}`} aria-hidden="true">
              {incompleteRouteCount > 0 ? "!" : "✓"}
            </span>
            <div>
              <p className="section-kicker">PDF</p>
              <h3 id="plan-print-dialog-title">
                {incompleteRouteCount > 0 ? dict.planPrintDialogTitleIncomplete : dict.planPrintDialogTitleReady}
              </h3>
              <p id="plan-print-dialog-description">
                {incompleteRouteCount > 0
                  ? t(lang, "planPrintDialogIncomplete", { n: incompleteRouteCount })
                  : dict.planPrintDialogReady}
              </p>
              <p className="plan-print-dialog-tip">{dict.planPrintInstruction}</p>
            </div>
            <div className="plan-print-dialog-actions">
              {incompleteRouteCount > 0 ? (
                <>
                  <button type="button" className="plan-print-dialog-primary" onClick={retryBeforePrint}>{dict.planPrintRetry}</button>
                  <button type="button" className="plan-print-dialog-secondary" onClick={printCurrentPlan}>{dict.planPrintAnyway}</button>
                </>
              ) : (
                <button type="button" className="plan-print-dialog-primary" onClick={printCurrentPlan}>{dict.planPrintOpen}</button>
              )}
              <button type="button" className="plan-print-dialog-cancel" onClick={closePrintDialog}>{dict.planPrintCancel}</button>
            </div>
          </div>
        </div>
      ) : null}
      <p className="plan-print-footer">{dict.footerNotice}</p>
    </section>
  );
}
