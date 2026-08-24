"use client";

import { THEME_PRESETS, type ThemePreset, type ThemePresetId } from "@/domain/themes";
import { useLang } from "@/i18n/LangContext";

interface ThemeCurationsProps {
  activeThemeId: ThemePresetId | null;
  onApplyTheme: (theme: ThemePreset) => void;
  onClearTheme: () => void;
}

export function ThemeCurations({ activeThemeId, onApplyTheme, onClearTheme }: ThemeCurationsProps) {
  const { lang } = useLang();

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

      <div className="theme-cards-scroll">
        {THEME_PRESETS.map((theme) => {
          const isActive = activeThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              className={`theme-preset-card ${isActive ? "active" : ""}`}
              onClick={() => (isActive ? onClearTheme() : onApplyTheme(theme))}
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
    </section>
  );
}
