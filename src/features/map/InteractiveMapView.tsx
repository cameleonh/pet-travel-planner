"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline } from "leaflet";
import type { MatchEvaluation } from "@/domain/types";
import type { PlanPlace } from "@/domain/plan";
import { resolveDisplayCategory, displayCategoryIcon, displayCategoryLabel } from "@/domain/categories";
import { useLang } from "@/i18n/LangContext";
import "leaflet/dist/leaflet.css";

interface InteractiveMapViewProps {
  results: MatchEvaluation[];
  planPlaces: PlanPlace[];
  onTogglePlanPlace: (place: MatchEvaluation["place"]) => void;
  onFocusPlaceCard?: (placeId: string) => void;
}

const DEFAULT_CENTER: [number, number] = [36.5, 127.8];
const DEFAULT_ZOOM = 7;

export function InteractiveMapView({
  results,
  planPlaces,
  onTogglePlanPlace,
  onFocusPlaceCard,
}: InteractiveMapViewProps) {
  const { lang } = useLang();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(results[0]?.place.id ?? null);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, LeafletMarker>());
  const polylineRef = useRef<LeafletPolyline | null>(null);

  // Only coordinates inside the Korean peninsula are meaningful for the tiles.
  const mappedPlaces = useMemo(() => {
    return results.filter((evaluation) => {
      const coordinates = evaluation.place.coordinates;
      return coordinates && coordinates.latitude > 30 && coordinates.latitude < 40 && coordinates.longitude > 124 && coordinates.longitude < 132;
    });
  }, [results]);

  const planOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    planPlaces.forEach((place, index) => map.set(place.id, index + 1));
    return map;
  }, [planPlaces]);

  const selectedItem = useMemo(
    () => mappedPlaces.find((evaluation) => evaluation.place.id === selectedPlaceId) ?? mappedPlaces[0] ?? null,
    [mappedPlaces, selectedPlaceId],
  );

  const placeLatLngs = useMemo(
    () => mappedPlaces.map((evaluation) => [evaluation.place.coordinates.latitude, evaluation.place.coordinates.longitude] as [number, number]),
    [mappedPlaces],
  );

  const courseLatLngs = useMemo(
    () => planPlaces.filter((place) => place.coordinates).map((place) => [place.coordinates.latitude, place.coordinates.longitude] as [number, number]),
    [planPlaces],
  );

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | null = null;
    const markers = markersRef.current;
    void (async () => {
      const leafletModule = await import("leaflet");
      if (disposed || !containerRef.current) return;
      // The ESM build exposes named exports; the CJS interop shape nests them under `default`.
      const L = ((leafletModule as unknown as { default?: typeof import("leaflet") }).default ?? leafletModule);
      leafletRef.current = L;
      map = L.map(containerRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true });
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    })();
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markers.clear();
      polylineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();

    for (const evaluation of mappedPlaces) {
      const { latitude, longitude } = evaluation.place.coordinates;
      const category = resolveDisplayCategory(evaluation.place);
      const order = planOrderMap.get(evaluation.place.id);
      const isSelected = selectedItem?.place.id === evaluation.place.id;

      const content = document.createElement("div");
      content.className = `map-pin-content${isSelected ? " selected" : ""}${order ? " in-plan" : ""}`;
      const box = document.createElement("div");
      box.className = "pin-icon-box";
      box.textContent = order ? String(order) : displayCategoryIcon[category];
      const label = document.createElement("span");
      label.className = "pin-label-text";
      label.textContent = evaluation.place.name;
      content.append(box, label);

      const icon = L.divIcon({ className: "map-pin-divicon", html: content, iconSize: [0, 0], iconAnchor: [0, 0] });
      const marker = L.marker([latitude, longitude], { icon, title: evaluation.place.name });
      marker.on("click", () => {
        setSelectedPlaceId(evaluation.place.id);
        map.panTo([latitude, longitude], { animate: true });
      });
      marker.addTo(map);
      markersRef.current.set(evaluation.place.id, marker);
    }
  }, [mapReady, mappedPlaces, planOrderMap, selectedItem]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    if (placeLatLngs.length === 0) return;
    if (placeLatLngs.length === 1) {
      map.setView(placeLatLngs[0]!, 14);
      return;
    }
    map.fitBounds(L.latLngBounds(placeLatLngs), { padding: [42, 42], maxZoom: 15 });
  }, [mapReady, placeLatLngs]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    polylineRef.current?.remove();
    polylineRef.current = null;
    if (courseLatLngs.length >= 2) {
      polylineRef.current = L
        .polyline(courseLatLngs, { color: "#bd462f", weight: 4, dashArray: "8 8", opacity: 0.85 })
        .addTo(map);
    }
  }, [mapReady, courseLatLngs]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const resetView = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (placeLatLngs.length >= 2) map.fitBounds(L.latLngBounds(placeLatLngs), { padding: [42, 42], maxZoom: 15 });
    else if (placeLatLngs.length === 1) map.setView(placeLatLngs[0]!, 14);
    else map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  };

  return (
    <div className="interactive-map-wrapper" aria-label={lang === "ko" ? "반려견 동반 가능 장소 지도" : "Map of pet-friendly places"}>
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
          <button type="button" className="map-zoom-btn" onClick={zoomIn} title="확대" aria-label="지도 확대">
            ＋
          </button>
          <button type="button" className="map-zoom-btn" onClick={zoomOut} title="축소" aria-label="지도 축소">
            －
          </button>
          <button type="button" className="map-zoom-btn reset-btn" onClick={resetView} title="초기화" aria-label="지도 위치 초기화">
            ⟲
          </button>
        </div>
      </div>

      <div className="map-viewport">
        <div ref={containerRef} className="map-leaflet-canvas" role="application" aria-label={lang === "ko" ? "실제 지도" : "Interactive map"} />
        {mapReady && mappedPlaces.length === 0 ? (
          <p className="map-empty-note" role="status">
            {lang === "ko" ? "현재 결과에 지도로 표시할 좌표가 없어요." : "No mappable coordinates in the current results."}
          </p>
        ) : null}
      </div>

      {selectedItem && (
        <div className="map-place-sheet" role="region" aria-label="선택된 장소 상세 요약">
          <div className="sheet-place-header">
            <div className="sheet-title-row">
              <span className="sheet-cat-badge">
                {displayCategoryIcon[resolveDisplayCategory(selectedItem.place)]} {displayCategoryLabel[resolveDisplayCategory(selectedItem.place)]}
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
                {selectedItem.place.policySource?.sourceText || (lang === "ko" ? "반려견 동반 가능 (세부 규정 확인 권장)" : "Pet friendly")}
              </span>
            </div>
          </div>

          <div className="sheet-action-row">
            <button
              type="button"
              className={`sheet-plan-toggle-btn ${planOrderMap.has(selectedItem.place.id) ? "remove" : "add"}`}
              onClick={() => onTogglePlanPlace(selectedItem.place)}
            >
              {planOrderMap.has(selectedItem.place.id)
                ? lang === "ko" ? "✓ 코스에서 제외" : "✓ Remove from Plan"
                : lang === "ko" ? "＋ 내 여행 코스에 담기" : "＋ Add to Travel Plan"}
            </button>

            <a
              className="sheet-kakao-link"
              href={`https://map.kakao.com/link/map/${encodeURIComponent(selectedItem.place.name)},${selectedItem.place.coordinates.latitude},${selectedItem.place.coordinates.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              🗺️ {lang === "ko" ? "카카오맵 보기" : "Kakao Map"}
            </a>

            {onFocusPlaceCard && (
              <button type="button" className="sheet-view-card-btn" onClick={() => onFocusPlaceCard(selectedItem.place.id)}>
                {lang === "ko" ? "상세 증빙 보기 ↓" : "View Details ↓"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
