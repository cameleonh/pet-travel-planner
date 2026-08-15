"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordinates } from "@/domain/geo";
import type { PlanPlace } from "@/domain/plan";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

type Service = {
  id: string;
  name: string;
  address: string;
  roadAddress: string | null;
  phone: string | null;
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  placeUrl: string | null;
};

type Props = {
  origin: Coordinates;
  referenceName: string;
  selectedPlaceIds: ReadonlySet<string>;
  onTogglePlace: (place: PlanPlace) => void;
};

type ServiceKind = "restaurant" | "veterinary" | "pet-shop";

export function NearbyServices({ origin, referenceName, selectedPlaceIds, onTogglePlace }: Props) {
  const { lang, dict } = useLang();
  const [vets, setVets] = useState<Service[]>([]);
  const [shops, setShops] = useState<Service[]>([]);
  const [restaurants, setRestaurants] = useState<Service[]>([]);
  const [vetLoading, setVetLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [vetError, setVetError] = useState(false);
  const [shopError, setShopError] = useState(false);
  const [restaurantError, setRestaurantError] = useState(false);

  const fetchVets = useCallback(async (signal?: AbortSignal) => {
    setVetLoading(true);
    setVetError(false);
    try {
      const res = await fetch(`/api/veterinary?lat=${origin.latitude}&lng=${origin.longitude}&radius=5000`, { signal });
      const json = await res.json();
      if (json.success) setVets(json.data.hospitals ?? []);
      else setVetError(true);
    } catch (fetchError) { if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) setVetError(true); }
    finally { if (!signal?.aborted) setVetLoading(false); }
  }, [origin.latitude, origin.longitude]);

  const fetchShops = useCallback(async (signal?: AbortSignal) => {
    setShopLoading(true);
    setShopError(false);
    try {
      const res = await fetch(`/api/pet-shops?lat=${origin.latitude}&lng=${origin.longitude}&radius=5000`, { signal });
      const json = await res.json();
      if (json.success) setShops(json.data.shops ?? []);
      else setShopError(true);
    } catch (fetchError) { if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) setShopError(true); }
    finally { if (!signal?.aborted) setShopLoading(false); }
  }, [origin.latitude, origin.longitude]);

  const fetchRestaurants = useCallback(async (signal?: AbortSignal) => {
    setRestaurantLoading(true);
    setRestaurantError(false);
    try {
      const res = await fetch(`/api/pet-restaurants?lat=${origin.latitude}&lng=${origin.longitude}&radius=5000`, { signal });
      const json = await res.json();
      if (json.success) setRestaurants(json.data.restaurants ?? []);
      else setRestaurantError(true);
    } catch (fetchError) { if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) setRestaurantError(true); }
    finally { if (!signal?.aborted) setRestaurantLoading(false); }
  }, [origin.latitude, origin.longitude]);

  useEffect(() => {
    const controller = new AbortController();
    let shopTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    let restaurantTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setShopLoading(true);
      setRestaurantLoading(true);
      void fetchVets(controller.signal);
      shopTimer = globalThis.setTimeout(() => void fetchShops(controller.signal), 140);
      restaurantTimer = globalThis.setTimeout(() => void fetchRestaurants(controller.signal), 280);
    });
    return () => {
      controller.abort();
      if (shopTimer !== undefined) globalThis.clearTimeout(shopTimer);
      if (restaurantTimer !== undefined) globalThis.clearTimeout(restaurantTimer);
    };
  }, [fetchVets, fetchShops, fetchRestaurants]);

  const renderFetchError = (message: string, retry: () => Promise<void>) => (
    <div className="nearby-fetch-error" role="alert">
      <p>{message}</p>
      <button type="button" onClick={() => void retry()}>{dict.nearbyRetry}</button>
    </div>
  );

  const renderService = (service: Service, kind: ServiceKind) => {
    const planPlaceId = `nearby-service:${kind}:${service.id}`;
    const isSelected = selectedPlaceIds.has(planPlaceId);
    const hasCoordinates = service.latitude !== null && service.longitude !== null;
    const serviceLabel = kind === "restaurant" ? dict.nearbyRestaurants : kind === "veterinary" ? dict.nearbyVets : dict.nearbyShops;
    const planPlace: PlanPlace | null = hasCoordinates ? {
      id: planPlaceId,
      name: service.name,
      address: service.roadAddress || service.address,
      category: kind,
      coordinates: { latitude: service.latitude!, longitude: service.longitude! },
      policySourceText: `${serviceLabel} · ${t(lang, "nearbyServicesNote", { ref: referenceName })}`,
      exact: false,
    } : null;
    return (
      <li key={service.id}>
        <div>
          <strong>{service.name}</strong>
          {service.phone ? <a href={`tel:${service.phone}`} className="tel-link">📞 {service.phone}</a> : null}
          <small>{service.distance !== null ? `${(service.distance / 1000).toFixed(1)}km · ` : ""}{service.address}</small>
          {service.placeUrl ? <a href={service.placeUrl} target="_blank" rel="noopener noreferrer" className="place-link">{dict.nearbyKakaoMap}</a> : null}
        </div>
        {planPlace ? (
          <button
            type="button"
            className={`nearby-add-button ${isSelected ? "added" : ""}`}
            aria-pressed={isSelected}
            aria-label={t(lang, isSelected ? "planRemoveNamed" : "planAddNamed", { name: service.name })}
            onClick={() => onTogglePlace(planPlace)}
          >
            <span aria-hidden="true">{isSelected ? "✓" : "+"}</span>{isSelected ? dict.planAdded : dict.planAdd}
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <section className="extension-card nearby-card" aria-labelledby="nearby-services-title">
      <div className="extension-heading">
        <div>
          <p className="section-kicker">{dict.nearbyServicesTitle}</p>
          <h2 id="nearby-services-title">{dict.nearbyServicesHeading}</h2>
        </div>
      </div>
      <p className="distance-note">{t(lang, "nearbyServicesNote", { ref: referenceName })}</p>
      <div className="nearby-services-grid">
        <div>
          <h3><span aria-hidden="true">🍽️</span> {dict.nearbyRestaurants}</h3>
          {restaurantLoading ? <p className="empty-line" role="status">{dict.nearbyLoading}</p> : restaurantError ? renderFetchError(dict.nearbyRestaurantError, fetchRestaurants) : restaurants.length === 0 ? <p className="empty-line">{dict.nearbyNoRestaurants}</p> : <ul>{restaurants.slice(0, 5).map((service) => renderService(service, "restaurant"))}</ul>}
        </div>
        <div>
          <h3><span aria-hidden="true">🏥</span> {dict.nearbyVets}</h3>
          {vetLoading ? <p className="empty-line" role="status">{dict.nearbyLoading}</p> : vetError ? renderFetchError(dict.nearbyVetError, fetchVets) : vets.length === 0 ? <p className="empty-line">{dict.nearbyNoVets}</p> : <ul>{vets.slice(0, 5).map((service) => renderService(service, "veterinary"))}</ul>}
        </div>
        <div>
          <h3><span aria-hidden="true">🛒</span> {dict.nearbyShops}</h3>
          {shopLoading ? <p className="empty-line" role="status">{dict.nearbyLoading}</p> : shopError ? renderFetchError(dict.nearbyShopError, fetchShops) : shops.length === 0 ? <p className="empty-line">{dict.nearbyNoShops}</p> : <ul>{shops.slice(0, 5).map((service) => renderService(service, "pet-shop"))}</ul>}
        </div>
      </div>
    </section>
  );
}
