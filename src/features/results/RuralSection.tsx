"use client";

import { useState } from "react";

export type VillageData = {
  village_id: string;
  name: string;
  sido: string | null;
  sigungu: string | null;
  village_kind: "farm" | "fishing";
  address_road: string | null;
  address_jibun: string | null;
  phone: string | null;
  homepage: string | null;
  designated_at: string | null;
  facility_info: string | null;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  programs: string | null;
};

export type FarmstayData = {
  farmstay_id: string;
  business_name: string;
  permit_date: string | null;
  address: string | null;
  status_name: string | null;
  latitude: number | null;
  longitude: number | null;
  pet_policy_place?: string | null;
  pet_policy_distance?: number | null;
  pet_source_text?: string | null;
  pet_source_url?: string | null;
};

const KIND_LABELS: Record<VillageData["village_kind"], string> = { farm: "농촌체험마을", fishing: "어촌체험마을" };

function kakaoMapLink(name: string, latitude: number, longitude: number): string {
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${latitude},${longitude}`;
}

type Props = {
  villages: VillageData[];
  farmstays: FarmstayData[];
  region: string;
};

export function RuralSection({ villages, farmstays, region }: Props) {
  const [farmstayOpen, setFarmstayOpen] = useState(false);
  if (villages.length === 0 && farmstays.length === 0) return null;

  return (
    <div className="trail-section rural-section">
      <h3 className="trail-section-title">🌾 {region} 농어촌 체험·민박 <span className="trail-count">{villages.length + farmstays.length}곳</span></h3>
      <p className="trail-section-desc">지역 주민이 운영하는 체험마을과 농어촌민박이에요 · 반려동물 동반 여부는 마을·민박에 직접 확인이 필요해요</p>
      <ul className="trail-list">
        {villages.slice(0, 5).map((village) => {
          const programs = (village.programs ?? "").split(" | ").filter(Boolean);
          return <li key={village.village_id} className="trail-item">
            <div className="trail-header">
              <strong className="trail-name">{village.name}</strong>
              <span className="camping-types">{KIND_LABELS[village.village_kind]}</span>
            </div>
            <p className="trail-tagline">{village.address_road || village.address_jibun}</p>
            <div className="trail-meta">
              {village.phone ? <span>📞 {village.phone}</span> : null}
              {village.designated_at ? <span>📅 지정 {village.designated_at}</span> : null}
            </div>
            {programs.length > 0 ? <details className="trail-details"><summary>체험 프로그램 {programs.length}개</summary><ul className="rural-program-list">{programs.map((program, index) => <li key={index}>{program}</li>)}</ul></details> : null}
            <div className="rural-actions">
              <a href={kakaoMapLink(village.name, village.latitude, village.longitude)} target="_blank" rel="noreferrer" className="trail-gpx">카카오맵에서 보기 <span aria-hidden="true">↗</span></a>
              {village.homepage ? <a href={village.homepage} target="_blank" rel="noreferrer" className="trail-gpx">마을 홈페이지 <span aria-hidden="true">↗</span></a> : null}
            </div>
          </li>;
        })}
      </ul>
      {villages.length > 5 ? <p className="trail-more">외 {villages.length - 5}개 마을 더 있어요</p> : null}
      {farmstays.length > 0 ? (
        <div className="rural-farmstays">
          <button type="button" className="rural-farmstay-toggle" aria-expanded={farmstayOpen} onClick={() => setFarmstayOpen((open) => !open)}>
            🏠 농어촌민박 {farmstays.length}곳 {farmstayOpen ? "접기" : "펼치기"}
          </button>
          {farmstayOpen ? (
            <ul className="trail-list rural-farmstay-list">
              {farmstays.slice(0, 20).map((farmstay) => (
                <li key={farmstay.farmstay_id} className="trail-item">
                  <div className="trail-header">
                    <strong className="trail-name">{farmstay.business_name}</strong>
                    {farmstay.pet_source_text ? (
                      <span className="camping-types rural-pet-ok">🐾 동반 가능</span>
                    ) : farmstay.status_name ? (
                      <span className={`camping-types ${farmstay.status_name.includes("폐업") ? "closed" : ""}`}>{farmstay.status_name}</span>
                    ) : null}
                  </div>
                  {farmstay.address ? <p className="trail-tagline">{farmstay.address}</p> : null}
                  {farmstay.latitude != null && farmstay.longitude != null ? (
                    <a href={kakaoMapLink(farmstay.business_name, farmstay.latitude, farmstay.longitude)} target="_blank" rel="noreferrer" className="trail-gpx">카카오맵에서 보기 <span aria-hidden="true">↗</span></a>
                  ) : null}
                  {farmstay.pet_source_text ? (
                    <details className="camping-details">
                      <summary>동반 근거 보기</summary>
                      <div className="camping-info">
                        <div className="camping-row"><span className="camping-label">근거</span><span>{farmstay.pet_source_text}</span></div>
                        <div className="camping-row"><span className="camping-label">출처</span>
                          {farmstay.pet_source_url ? (
                            <a href={farmstay.pet_source_url} target="_blank" rel="noreferrer" className="camping-reserve">관광공사 펫동반 정보 <span aria-hidden="true">↗</span></a>
                          ) : <span>한국관광공사 펫동반여행 정보 (좌표·상호 일치)</span>}
                        </div>
                      </div>
                    </details>
                  ) : null}
                </li>
              ))}
              {farmstays.length > 20 ? <p className="trail-more">외 {farmstays.length - 20}곳 더 있어요</p> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
