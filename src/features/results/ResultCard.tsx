"use client";

import { useState, useEffect, useRef } from "react";
import type { MatchEvaluation } from "@/domain/types";
import { resolveDisplayCategory, displayCategoryLabel, displayCategoryIcon } from "@/domain/categories";
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

function PlaceThumbnail({ name, address }: { name: string; address: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const region = address.split(" ").slice(0, 2).join(" ");
  const query = region ? `${name} ${region}` : name;
  const [thumbnail, setThumbnail] = useState<{ query: string; url: string } | null>(null);
  const thumbUrl = thumbnail?.query === query ? thumbnail.url : null;
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
    fetch(`/api/place-image?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((r) => r.json()).then((d) => {
      if (!controller.signal.aborted && d.success && d.data?.thumbnailUrl) setThumbnail({ query, url: d.data.thumbnailUrl });
    }).catch(() => {});
    return () => controller.abort();
  }, [query, shouldLoad]);
  return (
    <div ref={containerRef} className="place-thumbnail" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {thumbUrl ? <img src={thumbUrl} alt="" loading="lazy" onError={() => setThumbnail(null)} /> : null}
    </div>
  );
}

export function ResultCard({ result, dangerousDog = false, closureStatus, accessibility, camping, congestion, translation, lang = "ko" }: { result: MatchEvaluation; dangerousDog?: boolean; closureStatus?: PublicClosureStatus; accessibility?: AccessibilityData; camping?: CampingData; congestion?: CongestionData; translation?: TranslationData; lang?: string }) {
  const { dict } = useLang();
  const isCatalogResult = !result.exact && result.proof.length === 0;
  const preparations = result.place.requiredPreparations.filter((item) => item.scope !== "dangerous-dog" || dangerousDog);
  const displayCat = resolveDisplayCategory(result.place);
  const displayName = (lang !== "ko" && translation?.title) ? translation.title : result.place.name;
  const displayAddress = (lang !== "ko" && translation?.address) ? translation.address : result.place.address;
  return (
    <article className={`place-card ${isCatalogResult ? "catalog-card" : "exact-card"}`}>
      <PlaceThumbnail name={result.place.name} address={result.place.address} />
      <div className="place-card-body">
        <div className="place-top"><span>{displayCategoryIcon[displayCat]} {displayCategoryLabel[displayCat]}</span><strong>{isCatalogResult ? dict.beforeSelection : dict.allConditionsMet}</strong></div>
        <h3>{displayName}</h3>
        <p className="address">{displayAddress}</p>
        {closureStatus ? <div className="closure-status" aria-label={dict.ownerClosure}><strong>{closureStatus.closures.length > 0 ? dict.ownerClosure : dict.noClosure}</strong>{closureStatus.closures.length > 0 ? <span>{closureStatus.closures.slice(0, 2).map((closure) => closure.closureKind === "weekly" && closure.weekday !== null ? `매주 ${["일", "월", "화", "수", "목", "금", "토"][closure.weekday]}요일 · ${closure.reason}` : `${closure.closureDate ?? "—"} · ${closure.reason}`).join(" / ")}</span> : <span>{dict.noClosureNote}</span>}</div> : null}
        {preparations.length > 0 ? <div className="preparation-list" aria-label={dict.visitPrep}><strong>{dict.visitPrep}</strong><ul>{preparations.map((item) => <li key={`${item.key}-${item.scope}`}>✓ {t(lang as "ko" | "en" | "zh", prepLabelKeys[item.key])}{item.scope === "indoor" ? ` ${dict.prepIndoor}` : item.scope === "dangerous-dog" ? ` ${dict.prepDangerousDog}` : ""}</li>)}</ul></div> : null}
        {isCatalogResult ? <p className="catalog-hint">{dict.catalogHint}</p> : <><div className="proof-preview">{result.proof.slice(0, 3).map((item) => <span key={item.constraint.key}>✓ {item.constraint.label}{item.fact.requirements.length > 0 ? ` ${dict.proofConditional}` : ""}</span>)}</div><MatchProof proof={result.proof} /></>}
        <AccessibilitySection data={accessibility} />
        <CampingSection data={camping} />
        <CongestionSection data={congestion} />
        <TranslationSection data={translation} lang={lang} />
      </div>
    </article>
  );
}
