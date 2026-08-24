"use client";

import { useState, useMemo, useRef } from "react";
import type { MatchEvaluation } from "@/domain/types";
import type { PlanPlace } from "@/domain/plan";
import { resolveDisplayCategory, displayCategoryIcon, displayCategoryLabel } from "@/domain/categories";
import { useLang } from "@/i18n/LangContext";

interface InteractiveMapViewProps {
  results: MatchEvaluation[];
  planPlaces: PlanPlace[];
  onTogglePlanPlace: (place: MatchEvaluation["place"]) => void;
  onFocusPlaceCard?: (placeId: string) => void;
}

export function InteractiveMapView({
  results,
  planPlaces,
  onTogglePlanPlace,
  onFocusPlaceCard,
}: InteractiveMapViewProps) {
  const { lang } = useLang();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    results[0]?.place.id ?? null
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Valid coordinates places
  const mappedPlaces = useMemo(() => {
    return results.filter(
      (r) =>
        r.place.coordinates &&
        r.place.coordinates.latitude > 30 &&
        r.place.coordinates.latitude < 40 &&
        r.place.coordinates.longitude > 124 &&
        r.place.coordinates.longitude < 132
    );
  }, [results]);

  // Bounding box
  const bounds = useMemo(() => {
    if (mappedPlaces.length === 0) {
      return { minLat: 34.0, maxLat: 38.5, minLng: 126.0, maxLng: 129.8 };
    }
    let minLat = 90,
      maxLat = -90,
      minLng = 180,
      maxLng = -180;
    for (const r of mappedPlaces) {
      const { latitude, longitude } = r.place.coordinates;
      if (latitude < minLat) minLat = latitude;
      if (latitude > maxLat) maxLat = latitude;
      if (longitude < minLng) minLng = longitude;
      if (longitude > maxLng) maxLng = longitude;
    }
    const latPad = Math.max((maxLat - minLat) * 0.1, 0.05);
    const lngPad = Math.max((maxLng - minLng) * 0.1, 0.05);
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [mappedPlaces]);

  // Transform lat/lng to SVG coordinate percentage (0 - 100)
  const project = useMemo(() => {
    const latSpan = bounds.maxLat - bounds.minLat || 1;
    const lngSpan = bounds.maxLng - bounds.minLng || 1;
    return (lat: number, lng: number) => {
      const x = ((lng - bounds.minLng) / lngSpan) * 100;
      const y = (1 - (lat - bounds.minLat) / latSpan) * 100;
      return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
    };
  }, [bounds]);

  // Course Route Segments Coordinates
  const planOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    planPlaces.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [planPlaces]);

  const courseLinePoints = useMemo(() => {
    const pts: { x: number; y: number; id: string; name: string }[] = [];
    for (const p of planPlaces) {
      if (p.coordinates) {
        const { x, y } = project(p.coordinates.latitude, p.coordinates.longitude);
        pts.push({ x, y, id: p.id, name: p.name });
      }
    }
    return pts;
  }, [planPlaces, project]);

  const selectedItem = useMemo(() => {
    return mappedPlaces.find((r) => r.place.id === selectedPlaceId) ?? mappedPlaces[0] ?? null;
  }, [mappedPlaces, selectedPlaceId]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="interactive-map-wrapper" aria-label="반려견 동반 가능 장소 인터랙티브 지도">
      {/* Map Header & Controls */}
      <div className="map-view-header">
        <div className="map-stats-badge">
          <span className="map-live-dot"></span>
          <span>
            {lang === "ko"
              ? `지도 위 ${mappedPlaces.length}개 장소 표시 중`
              : `Showing ${mappedPlaces.length} places on map`}
          </span>
          {planPlaces.length > 0 && (
            <span className="map-plan-badge">
              🛣️ {lang === "ko" ? `${planPlaces.length}곳 코스 연결됨` : `${planPlaces.length} in Route`}
            </span>
          )}
        </div>

        <div className="map-zoom-controls">
          <button
            type="button"
            className="map-zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 2.5))}
            title="확대"
            aria-label="지도 확대"
          >
            ＋
          </button>
          <button
            type="button"
            className="map-zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
            title="축소"
            aria-label="지도 축소"
          >
            －
          </button>
          <button
            type="button"
            className="map-zoom-btn reset-btn"
            onClick={resetView}
            title="초기화"
            aria-label="지도 위치 초기화"
          >
            ⟲
          </button>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div
        className={`map-viewport ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="map-transform-layer"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* Stylized Topographic Map Background Grid & Landform Outline */}
          <svg className="map-svg-canvas" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(24, 88, 77, 0.05)" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bd462f" />
                <stop offset="100%" stopColor="#18584d" />
              </linearGradient>
            </defs>

            <rect width="100" height="100" fill="url(#grid-pattern)" />

            {/* Approximate Road Network Grid Lines */}
            <path
              d="M 20,10 Q 50,40 80,90 M 10,60 Q 40,50 90,40 M 30,90 Q 60,70 85,20"
              fill="none"
              stroke="rgba(24, 88, 77, 0.08)"
              strokeWidth="0.8"
              strokeDasharray="1.5,1.5"
            />

            {/* Polyline Route for Selected Course */}
            {courseLinePoints.length >= 2 && (
              <polyline
                points={courseLinePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="url(#route-gradient)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="2,1.2"
                className="map-route-polyline"
              />
            )}
          </svg>

          {/* Place Pin Markers */}
          {mappedPlaces.map((r) => {
            const { latitude, longitude } = r.place.coordinates;
            const { x, y } = project(latitude, longitude);
            const isSelected = selectedItem?.place.id === r.place.id;
            const planOrder = planOrderMap.get(r.place.id);
            const isPlanItem = Boolean(planOrder);
            const category = resolveDisplayCategory(r.place);
            const icon = displayCategoryIcon[category];

            return (
              <button
                key={r.place.id}
                type="button"
                className={`map-pin-marker ${isSelected ? "selected" : ""} ${
                  isPlanItem ? "in-plan" : ""
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlaceId(r.place.id);
                }}
                aria-label={`${r.place.name} - ${displayCategoryLabel[category]}`}
              >
                <div className="pin-icon-box">
                  {isPlanItem ? (
                    <span className="pin-order-num">{planOrder}</span>
                  ) : (
                    <span className="pin-category-icon">{icon}</span>
                  )}
                </div>
                <span className="pin-label-text">{r.place.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Place Popover Card / Bottom Sheet */}
      {selectedItem && (
        <div className="map-place-sheet" role="region" aria-label="선택된 장소 상세 요약">
          <div className="sheet-place-header">
            <div className="sheet-title-row">
              <span className="sheet-cat-badge">
                {displayCategoryIcon[resolveDisplayCategory(selectedItem.place)]}{" "}
                {displayCategoryLabel[resolveDisplayCategory(selectedItem.place)]}
              </span>
              {planOrderMap.has(selectedItem.place.id) && (
                <span className="sheet-plan-tag">
                  ★ {lang === "ko" ? `내 코스 ${planOrderMap.get(selectedItem.place.id)}번째 방문` : `Step ${planOrderMap.get(selectedItem.place.id)} in Plan`}
                </span>
              )}
            </div>

            <h4 className="sheet-place-name">{selectedItem.place.name}</h4>
            <p className="sheet-place-address">{selectedItem.place.address}</p>
          </div>

          <div className="sheet-place-policy">
            <div className="sheet-policy-badge">
              <span className="policy-icon">🐾</span>
              <span className="policy-text">
                {selectedItem.place.policySource?.sourceText ||
                  (lang === "ko" ? "반려견 동반 가능 (세부 규정 확인 권장)" : "Pet friendly")}
              </span>
            </div>
          </div>

          <div className="sheet-action-row">
            <button
              type="button"
              className={`sheet-plan-toggle-btn ${
                planOrderMap.has(selectedItem.place.id) ? "remove" : "add"
              }`}
              onClick={() => onTogglePlanPlace(selectedItem.place)}
            >
              {planOrderMap.has(selectedItem.place.id)
                ? lang === "ko"
                  ? "✓ 코스에서 제외"
                  : "✓ Remove from Plan"
                : lang === "ko"
                ? "＋ 내 여행 코스에 담기"
                : "＋ Add to Travel Plan"}
            </button>

            {onFocusPlaceCard && (
              <button
                type="button"
                className="sheet-view-card-btn"
                onClick={() => onFocusPlaceCard(selectedItem.place.id)}
              >
                {lang === "ko" ? "상세 증빙 보기 ↓" : "View Details ↓"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
