"use client";

import { useState } from "react";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";
import type { PlanActivity } from "@/domain/plan";

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

type Props = {
  festivals: FestivalData[];
  selectedActivityIds?: string[];
  onToggleActivity?: (activity: PlanActivity) => void;
};

export function FestivalSection({ festivals, selectedActivityIds = [], onToggleActivity }: Props) {
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
        {visible.map((festival) => {
          const activityId = `festival:${festival.contentId}`;
          const activityUrl = `https://korean.visitkorea.or.kr/detail/festival/festivalDetail.do?cotId=${festival.contentId}`;
          const selected = selectedActivityIds.includes(activityId);
          const longitude = festival.mapx === null ? Number.NaN : Number(festival.mapx);
          const latitude = festival.mapy === null ? Number.NaN : Number(festival.mapy);
          const coordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
            ? { latitude, longitude }
            : undefined;
          return <li key={festival.contentId} className={`festival-item ${festival.ongoing ? "festival-ongoing" : "festival-upcoming"}`}>
            <div className="festival-header">
              <strong className="festival-name">{festival.title}</strong>
              {festival.ongoing ? <span className="festival-badge festival-badge-live">{dict.festivalOngoing}</span> : <span className="festival-badge festival-badge-soon">예정</span>}
            </div>
            <div className="festival-meta">
              <span>📅 {festival.startDateFormatted} ~ {festival.endDateFormatted}</span>
              {festival.address ? <span>📍 {festival.address.split(" ").slice(0, 2).join(" ")}</span> : null}
            </div>
            {festival.tel ? <div className="festival-tel">📞 {festival.tel}</div> : null}
            <a href={activityUrl} target="_blank" rel="noopener noreferrer" className="festival-link">홈페이지 바로가기 ↗</a>
            {onToggleActivity ? <button type="button" className={`activity-add-button ${selected ? "added" : ""}`} aria-pressed={selected} onClick={() => onToggleActivity({ id: activityId, title: festival.title, type: "festival", detail: `${festival.startDateFormatted} ~ ${festival.endDateFormatted}${festival.address ? ` · ${festival.address}` : ""}`, url: activityUrl, address: festival.address ?? undefined, coordinates })}>{coordinates ? (selected ? dict.festivalRouteAdded : dict.festivalRouteAdd) : (selected ? dict.activityAdded : dict.activityAdd)}</button> : null}
          </li>;
        })}
      </ul>
      {sorted.length > 8 ? (
        <button type="button" className="festival-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? "접기" : t(lang, "festivalMore", { n: sorted.length - 8 })}
        </button>
      ) : null}
    </div>
  );
}
