"use client";

import type { RecommendedCourseResult } from "@/domain/course";
import { useLang } from "@/i18n/LangContext";

const CATEGORY_LABEL: Record<string, { ko: string; en: string; zh: string; icon: string }> = {
  attraction: { ko: "산책·명소", en: "Walk / Spot", zh: "散步·景点", icon: "🌳" },
  cafe: { ko: "카페", en: "Cafe", zh: "咖啡", icon: "☕" },
  restaurant: { ko: "식당", en: "Restaurant", zh: "餐厅", icon: "🍽️" },
  accommodation: { ko: "숙소", en: "Stay", zh: "住宿", icon: "🛏️" },
  shopping: { ko: "쇼핑", en: "Shopping", zh: "购物", icon: "🛍️" },
};

export function RecommendedCourseCard({ course, loading, themeTitle, addedCount, onAdd, onBuildPlan, onRetry, onClose }: {
  course: RecommendedCourseResult | null;
  loading: boolean;
  themeTitle: string;
  addedCount: number;
  onAdd: () => void;
  onBuildPlan: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  if (!loading && !course) return null;

  const copy = {
    title: lang === "ko" ? "추천 코스" : lang === "zh" ? "推荐路线" : "Suggested course",
    loading: lang === "ko" ? "추천 코스를 고르는 중…" : lang === "zh" ? "正在挑选推荐路线…" : "Picking a course…",
    add: lang === "ko" ? "여행 보드에 담기" : lang === "zh" ? "加入行程板" : "Add to trip board",
    added: lang === "ko" ? "담김" : lang === "zh" ? "已加入" : "Added",
    plan: lang === "ko" ? "일정 만들기" : lang === "zh" ? "生成行程" : "Build itinerary",
    retry: lang === "ko" ? "다시 추천" : lang === "zh" ? "重新推荐" : "Shuffle",
    close: lang === "ko" ? "닫기" : lang === "zh" ? "关闭" : "Close",
    note: lang === "ko" ? "좌표상 가까운 순서로 고른 3곳이에요. 실제 이동 시간·영업 여부는 방문 전 확인하세요." : "Three spots picked nearest-first by coordinates. Confirm travel time and opening hours before visiting.",
    fail: lang === "ko" ? "추천할 장소를 찾지 못했어요." : lang === "zh" ? "找不到可推荐的场所。" : "No places to suggest.",
  };

  return (
    <section className="recommended-course-card" aria-labelledby="recommended-course-title" aria-busy={loading}>
      <div className="recommended-course-head">
        <div>
          <p className="section-kicker">🎯 {copy.title}</p>
          <h3 id="recommended-course-title">{themeTitle}</h3>
        </div>
        <button type="button" className="recommended-course-close" onClick={onClose} aria-label={copy.close}>✕</button>
      </div>

      {loading ? (
        <p className="recommended-course-status" role="status">{copy.loading}</p>
      ) : course && course.success ? (
        <>
          <ol className="recommended-course-stops">
            {course.stops.map((stop, index) => {
              const meta = CATEGORY_LABEL[stop.category] ?? { ko: stop.category, en: stop.category, zh: stop.category, icon: "📍" };
              const label = lang === "ko" ? meta.ko : lang === "zh" ? meta.zh : meta.en;
              return (
                <li key={stop.placeId}>
                  <span className="recommended-course-order">{index + 1}</span>
                  <div>
                    <strong>{stop.name}</strong>
                    <small>{meta.icon} {label} · {stop.distanceFromOriginKm.toFixed(1)}km</small>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="recommended-course-note">{copy.note}</p>
          <div className="recommended-course-actions">
            <button type="button" className="recommended-course-primary" onClick={onAdd} disabled={addedCount === course.stops.length}>
              {addedCount === course.stops.length ? copy.added : copy.add}
            </button>
            <button type="button" className="recommended-course-secondary" onClick={onBuildPlan}>{copy.plan}</button>
            <button type="button" className="recommended-course-retry" onClick={onRetry}>🔄 {copy.retry}</button>
          </div>
        </>
      ) : (
        <div className="recommended-course-empty">
          <p role="alert">{course && !course.success ? course.message : copy.fail}</p>
          <button type="button" className="recommended-course-retry" onClick={onRetry}>🔄 {copy.retry}</button>
        </div>
      )}
    </section>
  );
}
