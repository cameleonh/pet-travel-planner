"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordinates } from "@/domain/geo";

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
  const [vets, setVets] = useState<Service[]>([]);
  const [shops, setShops] = useState<Service[]>([]);
  const [vetLoading, setVetLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [vetError, setVetError] = useState(false);
  const [shopError, setShopError] = useState(false);

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

  useEffect(() => { fetchVets(); fetchShops(); }, [fetchVets, fetchShops]);

  return (
    <section className="extension-card nearby-card" aria-labelledby="nearby-services-title">
      <div className="extension-heading">
        <div>
          <p className="section-kicker">근처 동물병원 · 펫샵</p>
          <h2 id="nearby-services-title">근처 응급 시설</h2>
        </div>
      </div>
      <p className="distance-note">{referenceName} 반경 5km 기준이에요. 직선거리라 실제 이동거리와는 달라요.</p>
      <div className="nearby-services-grid">
        <div>
          <h3><span aria-hidden="true">🏥</span> 동물병원</h3>
          {vetLoading ? <p className="empty-line">불러오는 중…</p> : vetError ? <p className="empty-line">동물병원 정보를 불러오지 못했어요.</p> : vets.length === 0 ? <p className="empty-line">근처 동물병원이 없어요.</p> : <ul>{vets.slice(0, 5).map((v) => <li key={v.id}><div><strong>{v.name}</strong>{v.phone ? <a href={`tel:${v.phone}`} className="tel-link">📞 {v.phone}</a> : null}<small>{v.distance ? `${(v.distance / 1000).toFixed(1)}km · ` : ""}{v.address}</small>{v.placeUrl ? <a href={v.placeUrl} target="_blank" rel="noopener noreferrer" className="place-link">카카오맵에서 보기</a> : null}</div></li>)}</ul>}
        </div>
        <div>
          <h3><span aria-hidden="true">🛒</span> 펫샵</h3>
          {shopLoading ? <p className="empty-line">불러오는 중…</p> : shopError ? <p className="empty-line">펫샵 정보를 불러오지 못했어요.</p> : shops.length === 0 ? <p className="empty-line">근처 펫샵이 없어요.</p> : <ul>{shops.slice(0, 5).map((s) => <li key={s.id}><div><strong>{s.name}</strong>{s.phone ? <a href={`tel:${s.phone}`} className="tel-link">📞 {s.phone}</a> : null}<small>{s.distance ? `${(s.distance / 1000).toFixed(1)}km · ` : ""}{s.address}</small></div></li>)}</ul>}
        </div>
      </div>
    </section>
  );
}
