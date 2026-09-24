"use client";

import { useMemo } from "react";
import type { AuxiliaryPlace } from "@/data/contracts";
import { orderNearbyPlaces, splitNearbyByPetStatus, type Coordinates, type NearbyPlace } from "@/domain/geo";
import type { PlanPlace } from "@/domain/plan";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

const categoryKey: Record<AuxiliaryPlace["category"], "auxCatMuseum" | "auxCatPark" | "auxCatParking" | "auxCatVeterinary" | "auxCatToilet"> = { museum: "auxCatMuseum", park: "auxCatPark", parking: "auxCatParking", veterinary: "auxCatVeterinary", toilet: "auxCatToilet" };

type Props = {
  places: AuxiliaryPlace[];
  fallbackOrigin: Coordinates;
  referenceName: string;
  selectedPlaceIds: ReadonlySet<string>;
  onTogglePlace: (place: PlanPlace) => void;
};

function hoursSummary(place: NearbyPlace, dict: { nearbyWeekday: string; nearbySaturday: string; nearbySunday: string; nearbyClosedOn: string }): string {
  const parts: string[] = [];
  if (place.weekdayHours) parts.push(`${dict.nearbyWeekday} ${place.weekdayHours}`);
  if (place.saturdayHours) parts.push(`${dict.nearbySaturday} ${place.saturdayHours}`);
  if (place.sundayHours) parts.push(`${dict.nearbySunday} ${place.sundayHours}`);
  if (place.closingDay) parts.push(`${dict.nearbyClosedOn}: ${place.closingDay}`);
  return parts.join(" · ");
}

export function NearbyCatalog({ places, fallbackOrigin, referenceName, selectedPlaceIds, onTogglePlace }: Props) {
  const { lang, dict } = useLang();
  const split = useMemo(() => splitNearbyByPetStatus(orderNearbyPlaces(places, fallbackOrigin)), [places, fallbackOrigin]);
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
    const hours = hoursSummary(place, dict);
    return (
      <li key={place.id}>
        <span>{dict[categoryKey[place.category]]}</span>
        <div>
          <strong>{place.name}</strong>
          <small>{place.distanceKm.toFixed(1)}km · {place.address}</small>
          {place.phone || hours || place.usageFee ? (
            <small className="nearby-contact">
              {place.phone ? <a href={`tel:${place.phone.replace(/[^0-9+]/g, "")}`} aria-label={t(lang, "nearbyCall", { name: place.name })}>{place.phone}</a> : null}
              {hours ? <span>{hours}</span> : null}
              {place.usageFee ? <span>{dict.nearbyFee}: {place.usageFee}</span> : null}
            </small>
          ) : null}
        </div>
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
      <div className="extension-heading"><div><p className="section-kicker">{dict.nearbyTitle}</p><h2 id="nearby-title">{dict.nearbyHeading}</h2></div></div>
      <p className="distance-note">{t(lang, "nearbyFromRef", { ref: referenceName })}. {dict.nearbyDistanceNote}</p>
      <div className="nearby-groups">
        <div><h3><span aria-hidden="true">✓</span> {dict.nearbyConfirmed}</h3>{split.confirmed.length ? <ul>{split.confirmed.map(renderPlace)}</ul> : <p className="empty-line">{dict.nearbyEmpty}</p>}</div>
        <div className="needs-confirmation"><h3><span aria-hidden="true">?</span> {dict.nearbyNeedsConfirm}</h3><p>{dict.nearbyConfirmDesc}</p><ul>{split.confirmationNeeded.map(renderPlace)}</ul></div>
      </div>
    </section>
  );
}
