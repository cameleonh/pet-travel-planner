export type TranslationData = {
  title: string | null;
  address: string | null;
  overview: string | null;
};

const LANG_LABELS: Record<string, string> = {
  en: "English",
  zh: "中文",
};

export function hasTranslationData(data: TranslationData | undefined | null): boolean {
  if (!data) return false;
  return Boolean(data.title || data.address || data.overview);
}

export function TranslationSection({ data, lang }: { data: TranslationData | undefined; lang: string }) {
  if (!hasTranslationData(data)) return null;
  if (!data) return null;
  const langLabel = LANG_LABELS[lang] ?? lang;

  return (
    <details className="translation-details">
      <summary>{langLabel} 번역</summary>
      <div className="translation-info">
        {data.title ? <div className="translation-row"><span className="translation-label">이름</span><span>{data.title}</span></div> : null}
        {data.address ? <div className="translation-row"><span className="translation-label">주소</span><span>{data.address}</span></div> : null}
        {data.overview ? <p className="translation-overview">{data.overview}</p> : null}
      </div>
      <p className="translation-source">한국관광공사 다국어 관광정보 서비스</p>
    </details>
  );
}
