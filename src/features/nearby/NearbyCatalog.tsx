"use client";

import { useMemo, useState } from "react";
import type { AuxiliaryPlace } from "@/data/contracts";
import { orderNearbyPlaces, splitNearbyByPetStatus, type Coordinates, type NearbyPlace } from "@/domain/geo";
import type { PlanPlace } from "@/domain/plan";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

const categoryLabel: Record<AuxiliaryPlace["category"], string> = { museum: "박물관", park: "공원", parking: "주차", veterinary: "동물병원", toilet: "화장실" };

type Props = {
  places: AuxiliaryPlace[];
  fallbackOrigin: Coordinates;
  referenceName: string;
  selectedPlaceIds: ReadonlySet<string>;
  onTogglePlace: (place: PlanPlace) => void;
};

export function NearbyCatalog({ places, fallbackOrigin, referenceName, selectedPlaceIds, onTogglePlace }: Props) {
  const { lang, dict } = useLang();
  const [origin, setOrigin] = useState(fallbackOrigin);
  const [locationMessage, setLocationMessage] = useState(t(lang, "nearbyFromRef", { ref: referenceName }));
  const split = useMemo(() => splitNearbyByPetStatus(orderNearbyPlaces(places, origin)), [places, origin]);
  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) { setLocationMessage(t(lang, "nearbyFromRefFallback", { ref: referenceName })); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationMessage(dict.nearbyMyLocationMsg); },
      () => setLocationMessage(t(lang, "nearbyLocationDenied", { ref: referenceName })),
      { enableHighAccuracy: false, timeout: 4_000, maximumAge: 60_000 }
    );
  };
  const renderPlace = (place: NearbyPlace) => {
    const isSelected = selectedPlaceIds.has(place.id);
    const planPlace: PlanPlace = {
      id: place.id,
      name: place.name,
      address: place.address,
      category: place.category,
      coordinates: place.coordinates,
      policySourceText: place.evidence.sourceText,
      exact: place.petStatus === "confirmed",
    };
    return (
      <li key={place.id}>
        <span>{categoryLabel[place.category]}</span>
        <div><strong>{place.name}</strong><small>{place.distanceKm.toFixed(1)}km · {place.address}</small></div>
        <button
          type="button"
          className={`nearby-add-button ${isSelected ? "added" : ""}`}
          aria-pressed={isSelected}
          aria-label={t(lang, isSelected ? "planRemoveNamed" : "planAddNamed", { name: place.name })}
          onClick={() => onTogglePlace(planPlace)}
        >
          <span aria-hidden="true">{isSelected ? "✓" : "+"}</span>{isSelected ? dict.planAdded : dict.planAdd}
        </button>
      </li>
    );
  };
  return (
    <section className="extension-card nearby-card" aria-labelledby="nearby-title">
      <div className="extension-heading"><div><p className="section-kicker">{dict.nearbyTitle}</p><h2 id="nearby-title">{dict.nearbyHeading}</h2></div><button type="button" onClick={useCurrentLocation}>{dict.nearbyMyLocation}</button></div>
      <p className="distance-note" role="status">{locationMessage}. {dict.nearbyDistanceNote}</p>
      <div className="nearby-groups">
        <div><h3><span aria-hidden="true">✓</span> {dict.nearbyConfirmed}</h3>{split.confirmed.length ? <ul>{split.confirmed.map(renderPlace)}</ul> : <p className="empty-line">{dict.nearbyEmpty}</p>}</div>
        <div className="needs-confirmation"><h3><span aria-hidden="true">?</span> {dict.nearbyNeedsConfirm}</h3><p>{dict.nearbyConfirmDesc}</p><ul>{split.confirmationNeeded.map(renderPlace)}</ul></div>
      </div>
    </section>
  );
}
