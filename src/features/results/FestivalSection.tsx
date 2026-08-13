"use client";

import { useState } from "react";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

export type FestivalData = {
  contentId: string;
  title: string;
  startDate: string;
  endDate: string;
  startDateFormatted: string;
  endDateFormatted: string;
  ongoing: boolean;
  address: string | null;
  tel: string | null;
  imageUrl: string | null;
  mapx: string | null;
  mapy: string | null;
};

export function FestivalSection({ festivals }: { festivals: FestivalData[] }) {
  const { lang, dict } = useLang();
  const [expanded, setExpanded] = useState(false);
  if (festivals.length === 0) return null;

  const ongoing = festivals.filter((f) => f.ongoing);
  const upcoming = festivals.filter((f) => !f.ongoing);
  const sorted = [...ongoing, ...upcoming];
  const visible = expanded ? sorted : sorted.slice(0, 8);

  return (
    <div className="festival-section">
      <h3 className="festival-section-title">{dict.festivalTitle} <span className="festival-count">{festivals.length}개</span></h3>
      <p className="festival-section-desc">{dict.festivalSource}</p>
      <ul className="festival-list">
        {visible.map((festival) => (
          <li key={festival.contentId} className={`festival-item ${festival.ongoing ? "festival-ongoing" : "festival-upcoming"}`}>
            <div className="festival-header">
              <strong className="festival-name">{festival.title}</strong>
              {festival.ongoing ? <span className="festival-badge festival-badge-live">{dict.festivalOngoing}</span> : <span className="festival-badge festival-badge-soon">예정</span>}
            </div>
            <div className="festival-meta">
              <span>📅 {festival.startDateFormatted} ~ {festival.endDateFormatted}</span>
              {festival.address ? <span>📍 {festival.address.split(" ").slice(0, 2).join(" ")}</span> : null}
            </div>
            {festival.tel ? <div className="festival-tel">📞 {festival.tel}</div> : null}
            <a href={`https://korean.visitkorea.or.kr/detail/festival/festivalDetail.do?cotId=${festival.contentId}`} target="_blank" rel="noopener noreferrer" className="festival-link">홈페이지 바로가기 ↗</a>
          </li>
        ))}
      </ul>
      {sorted.length > 8 ? (
        <button type="button" className="festival-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? "접기" : t(lang, "festivalMore", { n: sorted.length - 8 })}
        </button>
      ) : null}
    </div>
  );
}
