"use client";

export type PetCafeData = {
  id: string;
  name: string;
  address: string;
  roadAddress: string | null;
  phone: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  placeUrl: string | null;
};

type Props = {
  cafes: PetCafeData[];
  region: string;
};

function kakaoMapLink(name: string, latitude: number, longitude: number): string {
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${latitude},${longitude}`;
}

export function PetCafeSection({ cafes, region }: Props) {
  if (cafes.length === 0) return null;

  return (
    <div className="trail-section pet-cafe-section">
      <h3 className="trail-section-title">☕ {region} 반려동물 동반 카페 <span className="trail-count">{cafes.length}곳</span></h3>
      <p className="trail-section-desc">카카오 검색 기준이에요 · 동반 가능은 검색 키워드 매칭이라 규모·조건은 카페에 직접 확인이 필요해요</p>
      <ul className="trail-list">
        {cafes.slice(0, 10).map((cafe) => (
          <li key={cafe.id} className="trail-item">
            <div className="trail-header">
              <strong className="trail-name">{cafe.name}</strong>
              <span className="camping-types">확인 필요</span>
            </div>
            <p className="trail-tagline">{cafe.roadAddress || cafe.address}</p>
            <div className="trail-meta">
              {cafe.phone ? <span>📞 {cafe.phone}</span> : null}
            </div>
            <div className="rural-actions">
              {cafe.latitude != null && cafe.longitude != null ? (
                <a href={kakaoMapLink(cafe.name, cafe.latitude, cafe.longitude)} target="_blank" rel="noreferrer" className="trail-gpx">카카오맵에서 보기 <span aria-hidden="true">↗</span></a>
              ) : null}
              {cafe.placeUrl ? <a href={cafe.placeUrl} target="_blank" rel="noreferrer" className="trail-gpx">장소 정보 <span aria-hidden="true">↗</span></a> : null}
            </div>
          </li>
        ))}
      </ul>
      {cafes.length > 10 ? <p className="trail-more">외 {cafes.length - 10}곳 더 있어요</p> : null}
    </div>
  );
}
