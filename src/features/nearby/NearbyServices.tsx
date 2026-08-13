"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordinates } from "@/domain/geo";
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
};

export function NearbyServices({ origin, referenceName }: Props) {
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

  const fetchVets = useCallback(async () => {
    setVetLoading(true);
    setVetError(false);
    try {
      const res = await fetch(`/api/veterinary?lat=${origin.latitude}&lng=${origin.longitude}&radius=5000`);
      const json = await res.json();
      if (json.success) setVets(json.data.hospitals ?? []);
      else setVetError(true);
    } catch { setVetError(true); }
    finally { setVetLoading(false); }
  }, [origin.latitude, origin.longitude]);

  const fetchShops = useCallback(async () => {
    setShopLoading(true);
    setShopError(false);
    try {
      const res = await fetch(`/api/pet-shops?lat=${origin.latitude}&lng=${origin.longitude}&radius=5000`);
      const json = await res.json();
      if (json.success) setShops(json.data.shops ?? []);
      else setShopError(true);
    } catch { setShopError(true); }
    finally { setShopLoading(false); }
  }, [origin.latitude, origin.longitude]);

  const fetchRestaurants = useCallback(async () => {
    setRestaurantLoading(true);
    setRestaurantError(false);
    try {
      const res = await fetch(`/api/pet-restaurants?lat=${origin.latitude}&lng=${origin.longitude}&radius=5000`);
      const json = await res.json();
      if (json.success) setRestaurants(json.data.restaurants ?? []);
      else setRestaurantError(true);
    } catch { setRestaurantError(true); }
    finally { setRestaurantLoading(false); }
  }, [origin.latitude, origin.longitude]);

  useEffect(() => { queueMicrotask(() => { fetchVets(); fetchShops(); fetchRestaurants(); }); }, [fetchVets, fetchShops, fetchRestaurants]);

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
          {restaurantLoading ? <p className="empty-line">{dict.nearbyLoading}</p> : restaurantError ? <p className="empty-line">{dict.nearbyRestaurantError}</p> : restaurants.length === 0 ? <p className="empty-line">{dict.nearbyNoRestaurants}</p> : <ul>{restaurants.slice(0, 5).map((r) => <li key={r.id}><div><strong>{r.name}</strong>{r.phone ? <a href={`tel:${r.phone}`} className="tel-link">📞 {r.phone}</a> : null}<small>{r.distance ? `${(r.distance / 1000).toFixed(1)}km · ` : ""}{r.address}</small>{r.placeUrl ? <a href={r.placeUrl} target="_blank" rel="noopener noreferrer" className="place-link">{dict.nearbyKakaoMap}</a> : null}</div></li>)}</ul>}
        </div>
        <div>
          <h3><span aria-hidden="true">🏥</span> {dict.nearbyVets}</h3>
          {vetLoading ? <p className="empty-line">{dict.nearbyLoading}</p> : vetError ? <p className="empty-line">{dict.nearbyVetError}</p> : vets.length === 0 ? <p className="empty-line">{dict.nearbyNoVets}</p> : <ul>{vets.slice(0, 5).map((v) => <li key={v.id}><div><strong>{v.name}</strong>{v.phone ? <a href={`tel:${v.phone}`} className="tel-link">📞 {v.phone}</a> : null}<small>{v.distance ? `${(v.distance / 1000).toFixed(1)}km · ` : ""}{v.address}</small>{v.placeUrl ? <a href={v.placeUrl} target="_blank" rel="noopener noreferrer" className="place-link">{dict.nearbyKakaoMap}</a> : null}</div></li>)}</ul>}
        </div>
        <div>
          <h3><span aria-hidden="true">🛒</span> {dict.nearbyShops}</h3>
          {shopLoading ? <p className="empty-line">{dict.nearbyLoading}</p> : shopError ? <p className="empty-line">{dict.nearbyShopError}</p> : shops.length === 0 ? <p className="empty-line">{dict.nearbyNoShops}</p> : <ul>{shops.slice(0, 5).map((s) => <li key={s.id}><div><strong>{s.name}</strong>{s.phone ? <a href={`tel:${s.phone}`} className="tel-link">📞 {s.phone}</a> : null}<small>{s.distance ? `${(s.distance / 1000).toFixed(1)}km · ` : ""}{s.address}</small>{s.placeUrl ? <a href={s.placeUrl} target="_blank" rel="noopener noreferrer" className="place-link">{dict.nearbyKakaoMap}</a> : null}</div></li>)}</ul>}
        </div>
      </div>
    </section>
  );
}
