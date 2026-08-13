"use client";

import { useState, useCallback } from "react";
import type { PlanPlace, RouteSegment } from "@/domain/plan";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

type RouteApiResponse = {
  success: boolean;
  data: {
    summary: { distanceKm: number; durationMinutes: number; taxiFare: number | null; tollFee: number | null };
    congestion: { totalSegments: number; smooth: number; slow: number; congested: number; jammed: number; hasCongestion: boolean };
    congestedRoads: { name: string; distance: number; speed: number; stateLabel: string; stateColor: string }[];
    mapLink: string;
    naviLink: string;
  } | null;
  error: { message: string } | null;
};

type Props = {
  selectedPlaces: PlanPlace[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function PlanBuilder({ selectedPlaces, onRemove, onClear }: Props) {
  const { lang, dict } = useLang();
  const [routes, setRoutes] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    if (selectedPlaces.length < 2) return;
    setLoading(true);
    setError(null);
    setRoutes([]);
    try {
      const segments: RouteSegment[] = [];
      for (let i = 0; i < selectedPlaces.length - 1; i++) {
        const from = selectedPlaces[i]!;
        const to = selectedPlaces[i + 1]!;
        const origin = `${from.coordinates.longitude},${from.coordinates.latitude}`;
        const destination = `${to.coordinates.longitude},${to.coordinates.latitude}`;
        const res = await fetch(`/api/directions?origin=${origin}&destination=${destination}&originName=${encodeURIComponent(from.name)}&destName=${encodeURIComponent(to.name)}`);
        const json: RouteApiResponse = await res.json();
        if (json.success && json.data) {
          segments.push({
            fromPlaceId: from.id,
            toPlaceId: to.id,
            fromName: from.name,
            toName: to.name,
            distanceKm: json.data.summary.distanceKm,
            durationMinutes: json.data.summary.durationMinutes,
            hasCongestion: json.data.congestion.hasCongestion,
            congestedRoads: json.data.congestedRoads,
            smoothSegments: json.data.congestion.smooth,
            slowSegments: json.data.congestion.slow,
            congestedSegments: json.data.congestion.congested,
            jammedSegments: json.data.congestion.jammed,
            mapLink: json.data.mapLink,
            naviLink: json.data.naviLink,
          });
        }
      }
      setRoutes(segments);
    } catch {
      setError(dict.planError);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaces, dict]);

  if (selectedPlaces.length === 0) return null;

  return (
    <section className="extension-card plan-builder-card" aria-labelledby="plan-builder-title">
      <div className="extension-heading">
        <div>
          <p className="section-kicker">{dict.planTitle}</p>
          <h2 id="plan-builder-title">{t(lang, "planHeading", { n: selectedPlaces.length })}</h2>
        </div>
        <button type="button" className="clear-button" onClick={onClear}>{dict.planClear}</button>
      </div>

      <ol className="plan-place-list">
        {selectedPlaces.map((place, idx) => (
          <li key={place.id}>
            <span className="plan-order">{idx + 1}</span>
            <div className="plan-place-info">
              <strong>{place.name}</strong>
              <small>{place.address}</small>
              {place.policySourceText ? <small className="plan-policy">{place.policySourceText.slice(0, 60)}</small> : null}
            </div>
            <button type="button" className="remove-button" onClick={() => onRemove(place.id)}>✕</button>
          </li>
        ))}
      </ol>

      <button type="button" className="plan-generate-button" disabled={selectedPlaces.length < 2 || loading} onClick={generatePlan}>
        {loading ? dict.planLoading : selectedPlaces.length < 2 ? dict.planNeedMore : t(lang, "planGenerate", { n: selectedPlaces.length })}
      </button>

      {error ? <p className="plan-error" role="alert">{error}</p> : null}

      {routes.length > 0 ? (
        <div className="plan-routes">
          <h3>{dict.planRoutes}</h3>
          {routes.map((route, i) => (
            <div key={i} className="plan-route-segment">
              <div className="route-header">
                <strong>{route.fromName} → {route.toName}</strong>
                <span>{route.distanceKm}km · 약 {route.durationMinutes}분</span>
              </div>
              {route.hasCongestion ? (
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
            </div>
          ))}
          <div className="plan-actions">
            <button type="button" onClick={() => window.print()} className="print-button">{dict.planPrint}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
