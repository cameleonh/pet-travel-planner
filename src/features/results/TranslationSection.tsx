"use client";

import { useLang } from "@/i18n/LangContext";

export type TranslationData = {
  title: string | null;
  address: string | null;
  overview: string | null;
};

export function hasTranslationData(data: TranslationData | undefined | null): boolean {
  if (!data) return false;
  return Boolean(data.title || data.address || data.overview);
}

export function TranslationSection({ data }: { data: TranslationData | undefined; lang?: string }) {
  const { dict } = useLang();
  if (!hasTranslationData(data)) return null;
  if (!data) return null;

  return (
    <details className="translation-details">
      <summary>{dict.translationSource}</summary>
      <div className="translation-info">
        {data.title ? <div className="translation-row"><span className="translation-label">{dict.translationName}</span><span>{data.title}</span></div> : null}
        {data.address ? <div className="translation-row"><span className="translation-label">{dict.translationAddress}</span><span>{data.address}</span></div> : null}
        {data.overview ? <p className="translation-overview">{data.overview}</p> : null}
      </div>
      <p className="translation-source">{dict.translationSource}</p>
    </details>
  );
}
