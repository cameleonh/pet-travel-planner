"use client";

import { useState, useEffect, useRef } from "react";
import type { MatchEvaluation } from "@/domain/types";
import { resolveDisplayCategory, displayCategoryLabel, displayCategoryIcon, type DisplayCategory } from "@/domain/categories";
import { resolvePlaceVisual } from "@/domain/place-visuals";
import { MatchProof } from "@/features/results/MatchProof";
import { AccessibilitySection, type AccessibilityData } from "@/features/results/AccessibilitySection";
import { CampingSection, type CampingData } from "@/features/results/CampingSection";
import { CongestionSection, type CongestionData } from "@/features/results/CongestionSection";
import { TranslationSection, type TranslationData } from "@/features/results/TranslationSection";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

export type PublicClosureStatus = {
  readonly closures: readonly { readonly closureKind: "weekly" | "date"; readonly weekday: number | null; readonly closureDate: string | null; readonly reason: string }[];
};

const prepLabelKeys = { leash: "prepLeash", carrier: "prepCarrier", muzzle: "prepMuzzle", wasteBag: "prepWasteBag", stroller: "prepStroller", mannerBelt: "prepMannerBelt" } as const;

function PlaceThumbnail({ name, address, placeId, displayCategory }: { name: string; address: string; placeId: string; displayCategory: DisplayCategory }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const region = address.split(" ").slice(0, 2).join(" ");
  const query = region ? `${name} ${region}` : name;
  // 원천 contentid(tour-api:NNN) — 관광공사 공식 이미지 우선 조회용
  const contentId = placeId.startsWith("tour-api:") ? placeId.slice("tour-api:".length) : null;
  // 고해상도 우선, 로드 실패 시 썸네일 폴백 (카카오 image_url=원본, thumbnail_url≈110px)
  const [sources, setSources] = useState<{ query: string; urls: string[] } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const urls = sources?.query === query ? sources.urls : [];
  const thumbUrl = urls[attempt] ?? null;
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const fallback = globalThis.setTimeout(() => setShouldLoad(true), 0);
      return () => globalThis.clearTimeout(fallback);
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "240px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!shouldLoad) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query });
    if (contentId) params.set("cid", contentId);
    fetch(`/api/place-image?${params}`, { signal: controller.signal }).then((r) => r.json()).then((d) => {
      if (controller.signal.aborted || !d.success || !d.data?.thumbnailUrl) return;
      const full = typeof d.data.imageUrl === "string" && d.data.imageUrl !== d.data.thumbnailUrl ? d.data.imageUrl : null;
      const next = full ? [full, d.data.thumbnailUrl] : [d.data.thumbnailUrl];
      setSources({ query, urls: next });
      setAttempt(0);
    }).catch(() => {});
    return () => controller.abort();
  }, [query, contentId, shouldLoad]);
  const visual = resolvePlaceVisual(displayCategory);
  return (
    <div ref={containerRef} className="place-thumbnail" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {thumbUrl ? <img src={thumbUrl} alt="" loading="lazy" decoding="async" onError={() => setAttempt((n) => n + 1)} /> : (
        <div className="thumbnail-placeholder" style={{ "--placeholder-from": visual.from, "--placeholder-to": visual.to } as React.CSSProperties}>
          <span className="thumbnail-emoji">{visual.emoji}</span>
          <span className="thumbnail-paw">🐾</span>
        </div>
      )}
    </div>
  );
}

import { NaviActionButtons } from "@/features/results/NaviActionButtons";

export function ResultCard({ result, dangerousDog = false, closureStatus, accessibility, camping, congestion, translation, lang = "ko" }: { result: MatchEvaluation; dangerousDog?: boolean; closureStatus?: PublicClosureStatus; accessibility?: AccessibilityData; camping?: CampingData; congestion?: CongestionData; translation?: TranslationData; lang?: string }) {
  const { dict } = useLang();
  const isCatalogResult = !result.exact && result.proof.length === 0;
  const preparations = result.place.requiredPreparations.filter((item) => item.scope !== "dangerous-dog" || dangerousDog);
  const displayCat = resolveDisplayCategory(result.place);
  const displayName = (lang !== "ko" && translation?.title) ? translation.title : result.place.name;
  const displayAddress = (lang !== "ko" && translation?.address) ? translation.address : result.place.address;
  return (
    <article className={`place-card ${isCatalogResult ? "catalog-card" : "exact-card"}`}>
      <PlaceThumbnail name={result.place.name} address={result.place.address} placeId={result.place.id} displayCategory={displayCat} />
      <div className="place-card-body">
        <div className="place-top"><span>{displayCategoryIcon[displayCat]} {displayCategoryLabel[displayCat]}</span><strong>{isCatalogResult ? dict.beforeSelection : dict.allConditionsMet}</strong></div>
        <h3>{displayName}</h3>
        <p className="address">{displayAddress}</p>
        {closureStatus ? <div className="closure-status" aria-label={dict.ownerClosure}><strong>{closureStatus.closures.length > 0 ? dict.ownerClosure : dict.noClosure}</strong>{closureStatus.closures.length > 0 ? <span>{closureStatus.closures.slice(0, 2).map((closure) => closure.closureKind === "weekly" && closure.weekday !== null ? `매주 ${["일", "월", "화", "수", "목", "금", "토"][closure.weekday]}요일 · ${closure.reason}` : `${closure.closureDate ?? "—"} · ${closure.reason}`).join(" / ")}</span> : <span>{dict.noClosureNote}</span>}</div> : null}
        {preparations.length > 0 ? (
          <div className="preparation-list" aria-label={dict.visitPrep}>
            <strong>{dict.visitPrep}</strong>
            <ul>
              {preparations.map((item) => (
                <li key={`${item.key}-${item.scope}`}>
                  <strong>✓ {t(lang as "ko" | "en" | "zh", prepLabelKeys[item.key])}{item.scope === "indoor" ? ` ${dict.prepIndoor}` : item.scope === "dangerous-dog" ? ` ${dict.prepDangerousDog}` : ""}</strong>
                  <details className="preparation-proof">
                    <summary>{lang === "ko" ? "원문 근거·확인일" : lang === "zh" ? "查看来源与日期" : "Source and date"}</summary>
                    <div className="preparation-proof-body">
                      <p>“{item.evidence.excerpt}”</p>
                      <small>{lang === "ko" ? "관광공사 정보 관측일 " : "KTO observation date "}{new Intl.DateTimeFormat(lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "ko-KR", { dateStyle: "medium" }).format(new Date(item.evidence.observedAt))}</small>
                      {!item.evidence.sourceUrl.includes("example.invalid")
                        ? <a href={item.evidence.sourceUrl} target="_blank" rel="noreferrer">{lang === "ko" ? "관광공사 원문 보기 ↗" : lang === "zh" ? "查看韩国旅游公社来源 ↗" : "View KTO source ↗"}</a>
                        : <span className="fixture-source">시연용 데이터 근거</span>}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {isCatalogResult ? <p className="catalog-hint">{dict.catalogHint}</p> : <><div className="proof-preview">{result.proof.slice(0, 3).map((item) => <span key={item.constraint.key}>✓ {item.constraint.label}{item.fact.requirements.length > 0 ? ` ${dict.proofConditional}` : ""}</span>)}</div><MatchProof proof={result.proof} /></>}
        <AccessibilitySection data={accessibility} />
        <CampingSection data={camping} />
        <CongestionSection data={congestion} />
        <TranslationSection data={translation} lang={lang} />
        {result.place.coordinates && (
          <NaviActionButtons name={displayName} coordinates={result.place.coordinates} />
        )}
      </div>
    </article>
  );
}
