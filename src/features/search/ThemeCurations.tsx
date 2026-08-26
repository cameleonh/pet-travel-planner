"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { THEME_PRESETS, type ThemePreset, type ThemePresetId } from "@/domain/themes";
import { useLang } from "@/i18n/LangContext";

interface ThemeCurationsProps {
  activeThemeId: ThemePresetId | null;
  onApplyTheme: (theme: ThemePreset) => void;
  onClearTheme: () => void;
}

export function ThemeCurations({ activeThemeId, onApplyTheme, onClearTheme }: ThemeCurationsProps) {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
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

  const scrollByAmount = (amount: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Mouse Drag to Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.35;
    if (Math.abs(walk) > 4) {
      if (!isDragging) setIsDragging(true);
      hasDraggedRef.current = true;
      e.preventDefault();
      scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      setIsDragging(false);
      // Reset hasDragged after a brief delay so onClick handlers can check it
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 80);
    }
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          role="region"
          aria-label={lang === "ko" ? "테마 코스 목록 (마우스 드래그 이동 가능)" : "Theme courses list (draggable)"}
        >
          {THEME_PRESETS.map((theme) => {
            const isActive = activeThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                className={`theme-preset-card ${isActive ? "active" : ""}`}
                onClick={() => handleCardClick(theme, isActive)}
                aria-pressed={isActive}
              >
                <div className="theme-card-top">
                  <span className="theme-card-emoji">{theme.emoji}</span>
                  <span className="theme-card-badge">{theme.badge}</span>
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
