"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { THEME_PRESETS, type ThemePreset, type ThemePresetId } from "@/domain/themes";
import { useLang } from "@/i18n/LangContext";

export type TodaySafetyLevel = "safe" | "caution" | "indoor" | "unknown";

interface ThemeCurationsProps {
  activeThemeId: ThemePresetId | null;
  onApplyTheme: (theme: ThemePreset) => void;
  onClearTheme: () => void;
  todaySafetyLevel?: TodaySafetyLevel;
}

export function ThemeCurations({ activeThemeId, onApplyTheme, onClearTheme, todaySafetyLevel }: ThemeCurationsProps) {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging] = useState(false);
  const hasDraggedRef = useRef(false);

  // Check scroll position to update arrow button states
  const updateScrollBounds = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollBounds();
    el.addEventListener("scroll", updateScrollBounds, { passive: true });
    window.addEventListener("resize", updateScrollBounds);
    return () => {
      el.removeEventListener("scroll", updateScrollBounds);
      window.removeEventListener("resize", updateScrollBounds);
    };
  }, [updateScrollBounds]);

  useEffect(() => {
    if (!activeThemeId) return;
    const card = scrollRef.current?.querySelector<HTMLElement>(`[data-theme-id="${activeThemeId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeThemeId]);

  const scrollByAmount = (amount: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleCardClick = (theme: ThemePreset, isActive: boolean) => {
    if (hasDraggedRef.current) return;
    if (isActive) {
      onClearTheme();
    } else {
      onApplyTheme(theme);
    }
  };

  return (
    <section className="theme-curations-container" aria-label="반려견 여행 테마 큐레이션">
      <div className="theme-curations-header">
        <div className="theme-curations-title-wrap">
          <span className="theme-header-icon">✨</span>
          <div>
            <h3 className="theme-header-title">
              {lang === "ko" ? "견주 맞춤 추천 테마 코스" : "Curated Pet Travel Themes"}
            </h3>
            <p className="theme-header-subtitle">
              {lang === "ko"
                ? "날씨, 견종 크기, 여행 취향에 맞춘 당일치기 & 힐링 큐레이션"
                : "Curated 1-day healing routes tailored to weather, size & vibes"}
            </p>
          </div>
        </div>
        {activeThemeId && (
          <button
            type="button"
            className="theme-reset-btn"
            onClick={onClearTheme}
            title={lang === "ko" ? "테마 필터 초기화" : "Reset theme filter"}
          >
            ✕ {lang === "ko" ? "테마 해제" : "Reset"}
          </button>
        )}
      </div>

      <div className="theme-carousel-wrapper">
        <button
          type="button"
          className={`theme-arrow-btn left ${!canScrollLeft ? "disabled" : ""}`}
          onClick={() => scrollByAmount(-280)}
          disabled={!canScrollLeft}
          aria-label={lang === "ko" ? "이전 테마 코스 보기" : "View previous theme courses"}
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className={`theme-cards-scroll ${isDragging ? "is-dragging" : ""}`}
          role="region"
          aria-label={lang === "ko" ? "테마 코스 목록 (좌우로 스크롤 가능)" : "Theme courses list (horizontally scrollable)"}
        >
          {THEME_PRESETS.map((theme) => {
            const isActive = activeThemeId === theme.id;
            // Weather-driven recommendation: when today's walk safety is poor,
            // surface the rainy-day indoor theme as today's pick.
            const isTodayPick = theme.id === "rainy-indoor"
              && (todaySafetyLevel === "caution" || todaySafetyLevel === "indoor");
            const todayPickLabel = lang === "ko" ? "오늘 추천" : lang === "zh" ? "今日推荐" : "Today's pick";
            return (
              <button
                key={theme.id}
                type="button"
                data-theme-id={theme.id}
                className={`theme-preset-card ${isActive ? "active" : ""}`}
                onClick={() => handleCardClick(theme, isActive)}
                aria-pressed={isActive}
              >
                <div className="theme-card-top">
                  <span className="theme-card-emoji">{theme.emoji}</span>
                  <span className="theme-card-badge">{theme.badge}</span>
                  {isActive ? <span className="theme-card-selected">✓ {lang === "ko" ? "선택됨" : "Selected"}</span> : null}
                  {isTodayPick ? (
                    <span
                      style={{
                        background: "#1d4ed8",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ⭐ {todayPickLabel}
                    </span>
                  ) : null}
                </div>
                <div className="theme-card-body">
                  <strong className="theme-card-title">
                    {lang === "ko" ? theme.titleKo : theme.titleEn}
                  </strong>
                  <p className="theme-card-desc">
                    {lang === "ko" ? theme.descKo : theme.descEn}
                  </p>
                </div>
                <div className="theme-card-tags">
                  {theme.recommendedTags.map((tag) => (
                    <span key={tag} className="theme-tag-pill">
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
          <a
            href="/temple-stay"
            className="theme-preset-card"
            style={{ textDecoration: "none", background: "var(--warning-soft)" }}
          >
            <div className="theme-card-top">
              <span className="theme-card-emoji">🧘</span>
              <span className="theme-card-badge" style={{ background: "#92400e", color: "#fef9c3" }}>NEW</span>
            </div>
            <div className="theme-card-body">
              <strong className="theme-card-title">
                {lang === "ko" ? "요즘 뜨는 댕플스테이 🐕🧘" : "Trending: Temple Stay with Dogs"}
              </strong>
              <p className="theme-card-desc">
                {lang === "ko"
                  ? "사찰에서 반려견과 차담·명상·사찰복 체험 — 예약제 프로그램 안내"
                  : "Buddhist temple stays with your dog — reservation required, see details"}
              </p>
            </div>
            <div className="theme-card-tags">
              <span className="theme-tag-pill">#댕플스테이</span>
              <span className="theme-tag-pill">#예약제</span>
              <span className="theme-tag-pill">#사찰문화</span>
            </div>
          </a>
        </div>

        <button
          type="button"
          className={`theme-arrow-btn right ${!canScrollRight ? "disabled" : ""}`}
          onClick={() => scrollByAmount(280)}
          disabled={!canScrollRight}
          aria-label={lang === "ko" ? "다음 테마 코스 보기" : "View next theme courses"}
        >
          ›
        </button>
      </div>
    </section>
  );
}
