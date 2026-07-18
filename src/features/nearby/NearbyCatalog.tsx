"use client";

import { useMemo, useState } from "react";
import type { AuxiliaryPlace } from "@/data/contracts";
import { orderNearbyPlaces, splitNearbyByPetStatus, type Coordinates } from "@/domain/geo";

const categoryLabel: Record<AuxiliaryPlace["category"], string> = { museum: "박물관", park: "공원", parking: "주차", veterinary: "동물병원", toilet: "화장실" };

type Props = { places: AuxiliaryPlace[]; fallbackOrigin: Coordinates; referenceName: string };

export function NearbyCatalog({ places, fallbackOrigin, referenceName }: Props) {
  const [origin, setOrigin] = useState(fallbackOrigin);
  const [locationMessage, setLocationMessage] = useState(`${referenceName}에서 가까운 순서예요`);
  const split = useMemo(() => splitNearbyByPetStatus(orderNearbyPlaces(places, origin)), [places, origin]);
  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) { setLocationMessage(`위치를 확인할 수 없어 ${referenceName}에서 가까운 순서로 보여드려요`); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationMessage("내 위치에서 가까운 순서예요. 위치는 저장하지 않아요"); },
      () => setLocationMessage(`위치 권한 없이 ${referenceName}에서 가까운 순서로 보여드려요`),
      { enableHighAccuracy: false, timeout: 4_000, maximumAge: 60_000 }
    );
  };
  return (
    <section className="extension-card nearby-card" aria-labelledby="nearby-title">
      <div className="extension-heading"><div><p className="section-kicker">근처 둘러보기</p><h2 id="nearby-title">근처에 같이 들를 곳</h2></div><button type="button" onClick={useCurrentLocation}>내 위치로 보기</button></div>
      <p className="distance-note" role="status">{locationMessage}. 직선거리라 실제 이동거리와는 달라요.</p>
      <div className="nearby-groups">
        <div><h3><span aria-hidden="true">✓</span> 동반 확인</h3>{split.confirmed.length ? <ul>{split.confirmed.map((place) => <li key={place.id}><span>{categoryLabel[place.category]}</span><div><strong>{place.name}</strong><small>{place.distanceKm.toFixed(1)}km · {place.address}</small></div></li>)}</ul> : <p className="empty-line">확인된 장소가 아직 없어요.</p>}</div>
        <div className="needs-confirmation"><h3><span aria-hidden="true">?</span> 전화 확인 필요</h3><p>가깝지만 반려동물 동반 여부는 확인되지 않았어요.</p><ul>{split.confirmationNeeded.map((place) => <li key={place.id}><span>{categoryLabel[place.category]}</span><div><strong>{place.name}</strong><small>{place.distanceKm.toFixed(1)}km · 방문 전 문의</small></div></li>)}</ul></div>
      </div>
    </section>
  );
}
