"use client";

import { useEffect, useState } from "react";
import type { Coordinates } from "@/domain/geo";
import { useLang } from "@/i18n/LangContext";

// Advisory "nearby safety" block for the printed/shared plan: a couple of pet
// supply shops and vet clinics near the itinerary anchor, so the reader has a
// phone number to call without leaving the plan. Kept out of the plan model so
// the live Kakao results never affect route legs, schedule, or the fingerprint.

type Service = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  placeUrl: string | null;
};

const RADII = [5000, 10000, 20000];

async function loadServices(path: "veterinary" | "pet-shops", key: "hospitals" | "shops", coordinates: Coordinates, radius: number, signal: AbortSignal): Promise<Service[]> {
  const response = await fetch(`/api/${path}?lat=${coordinates.latitude}&lng=${coordinates.longitude}&radius=${radius}`, { signal });
  if (!response.ok) return [];
  const json = (await response.json()) as { success?: boolean; data?: Record<string, Service[]> | null };
  const list = json.data?.[key];
  return Array.isArray(list) ? list : [];
}

export function NearbySafetyServices({ coordinates, referenceName }: { coordinates: Coordinates | null; referenceName: string }) {
  const { lang } = useLang();
  const [vets, setVets] = useState<Service[]>([]);
  const [shops, setShops] = useState<Service[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!coordinates) return;
    const controller = new AbortController();
    void (async () => {
      for (const radius of RADII) {
        try {
          const [vetList, shopList] = await Promise.all([
            loadServices("veterinary", "hospitals", coordinates, radius, controller.signal),
            loadServices("pet-shops", "shops", coordinates, radius, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          if (vetList.length > 0 || shopList.length > 0) {
            setVets(vetList);
            setShops(shopList);
            break;
          }
        } catch {
          if (controller.signal.aborted) return;
        }
      }
      if (!controller.signal.aborted) setLoaded(true);
    })();
    return () => controller.abort();
  }, [coordinates]);

  if (!coordinates || !loaded || (vets.length === 0 && shops.length === 0)) return null;

  const renderList = (list: Service[]) => (
    <ul className="plan-nearby-list">
      {list.slice(0, 2).map((service) => (
        <li key={service.id}>
          <strong>{service.name}</strong>
          <small>
            {service.distance !== null ? `${(service.distance / 1000).toFixed(1)}km · ` : ""}
            {service.address}
          </small>
          <span className="plan-nearby-links">
            {service.phone ? <a href={`tel:${service.phone.replace(/[^0-9+]/g, "")}`}>📞 {service.phone}</a> : null}
            {service.placeUrl ? <a href={service.placeUrl} target="_blank" rel="noreferrer">{lang === "ko" ? "카카오맵" : "Kakao Map"}</a> : null}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="plan-nearby-services" aria-label={lang === "ko" ? "근처 동물병원과 반려동물용품점" : "Nearby vets and pet shops"}>
      <h4>{lang === "ko" ? "🐾 근처 동물병원 · 용품점" : "🐾 Nearby vets & pet shops"}</h4>
      <p className="plan-nearby-note">
        {lang === "ko"
          ? `${referenceName} 근처 참고용 정보예요. 방문 전 영업·진료 여부를 전화로 확인하세요.`
          : `For reference near ${referenceName}. Call ahead to confirm opening hours and availability.`}
      </p>
      {vets.length > 0 ? (
        <div className="plan-nearby-group">
          <h5>🏥 {lang === "ko" ? "동물병원" : "Veterinary"}</h5>
          {renderList(vets)}
        </div>
      ) : null}
      {shops.length > 0 ? (
        <div className="plan-nearby-group">
          <h5>🛒 {lang === "ko" ? "반려동물용품" : "Pet supplies"}</h5>
          {renderList(shops)}
        </div>
      ) : null}
      <p className="plan-nearby-source">{lang === "ko" ? "출처: 카카오 로컬 검색" : "Source: Kakao Local"}</p>
    </section>
  );
}
