"use client";

import { useState, useEffect } from "react";
import type { MatchEvaluation } from "@/domain/types";
import { resolveDisplayCategory, displayCategoryLabel, displayCategoryIcon } from "@/domain/categories";
import { MatchProof } from "@/features/results/MatchProof";
import { AccessibilitySection, type AccessibilityData } from "@/features/results/AccessibilitySection";
import { CampingSection, type CampingData } from "@/features/results/CampingSection";
import { CongestionSection, type CongestionData } from "@/features/results/CongestionSection";
import { TranslationSection, type TranslationData } from "@/features/results/TranslationSection";

export type PublicClosureStatus = {
  readonly closures: readonly { readonly closureKind: "weekly" | "date"; readonly weekday: number | null; readonly closureDate: string | null; readonly reason: string }[];
};

const preparationLabel = { leash: "목줄", carrier: "이동가방", muzzle: "입마개", wasteBag: "배변봉투", stroller: "유모차", mannerBelt: "매너벨트" } as const;

function PlaceThumbnail({ name, address }: { name: string; address: string }) {
  const region = address.split(" ").slice(0, 2).join(" ");
  const query = region ? `${name} ${region}` : name;
  const [thumbnail, setThumbnail] = useState<{ query: string; url: string } | null>(null);
  const thumbUrl = thumbnail?.query === query ? thumbnail.url : null;
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/place-image?q=${encodeURIComponent(query)}`).then((r) => r.json()).then((d) => {
      if (!cancelled && d.success && d.data?.thumbnailUrl) setThumbnail({ query, url: d.data.thumbnailUrl });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [query]);
  if (!thumbUrl) return null;
  return (
    <div className="place-thumbnail" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbUrl} alt="" loading="lazy" onError={() => setThumbnail(null)} />
    </div>
  );
}

export function ResultCard({ result, dangerousDog = false, closureStatus, accessibility, camping, congestion, translation, lang = "ko" }: { result: MatchEvaluation; dangerousDog?: boolean; closureStatus?: PublicClosureStatus; accessibility?: AccessibilityData; camping?: CampingData; congestion?: CongestionData; translation?: TranslationData; lang?: string }) {
  const isCatalogResult = !result.exact && result.proof.length === 0;
  const preparations = result.place.requiredPreparations.filter((item) => item.scope !== "dangerous-dog" || dangerousDog);
  const displayCat = resolveDisplayCategory(result.place);
  return (
    <article className={`place-card ${isCatalogResult ? "catalog-card" : "exact-card"}`}>
      <PlaceThumbnail name={result.place.name} address={result.place.address} />
      <div className="place-top"><span>{displayCategoryIcon[displayCat]} {displayCategoryLabel[displayCat]}</span><strong>{isCatalogResult ? "조건 선택 전" : "선택한 조건 모두 확인"}</strong></div>
      <h3>{result.place.name}</h3>
      <p className="address">{result.place.address}</p>
      {closureStatus ? <div className="closure-status" aria-label="운영자 등록 휴무"><strong>{closureStatus.closures.length > 0 ? "운영자 등록 휴무" : "등록된 휴무 없음"}</strong>{closureStatus.closures.length > 0 ? <span>{closureStatus.closures.slice(0, 2).map((closure) => closure.closureKind === "weekly" && closure.weekday !== null ? `매주 ${["일", "월", "화", "수", "목", "금", "토"][closure.weekday]}요일 · ${closure.reason}` : `${closure.closureDate ?? "특정일"} · ${closure.reason}`).join(" / ")}</span> : <span>확정 영업을 의미하지 않아요. 방문 전 확인 권장</span>}</div> : null}
      {preparations.length > 0 ? <div className="preparation-list" aria-label="방문 준비물"><strong>방문 전 준비</strong><ul>{preparations.map((item) => <li key={`${item.key}-${item.scope}`}>✓ {preparationLabel[item.key]}{item.scope === "indoor" ? " · 실내 이용 시" : item.scope === "dangerous-dog" ? " · 맹견 필수" : ""}</li>)}</ul></div> : null}
      {isCatalogResult ? <p className="catalog-hint">크기와 필요한 조건을 고르면 이 장소가 모두 맞는지 확인해요.</p> : <><div className="proof-preview">{result.proof.slice(0, 3).map((item) => <span key={item.constraint.key}>✓ {item.constraint.label}{item.fact.requirements.length > 0 ? " · 조건부" : ""}</span>)}</div><MatchProof proof={result.proof} /></>}
      <AccessibilitySection data={accessibility} />
      <CampingSection data={camping} />
      <CongestionSection data={congestion} />
      <TranslationSection data={translation} lang={lang} />
    </article>
  );
}
