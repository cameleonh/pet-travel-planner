"use client";

import { useEffect, useMemo, useState } from "react";
import { classifyDogWalkSafety, regionCenter, weatherConditionFor } from "@/domain/weather";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";
import { useDailyForecast } from "@/features/weather/useDailyForecast";

const SAFETY_KEY_BY_LEVEL = {
  safe: "weatherSafetySafe",
  caution: "weatherSafetyCaution",
  indoor: "weatherSafetyIndoor",
} as const;

const ADVICE_KEY_BY_REASON = {
  fine: "weatherAdviceFine",
  rain: "weatherAdviceRain",
  hot: "weatherAdviceHot",
  snow: "weatherAdviceSnow",
  cold: "weatherAdviceCold",
} as const;

export function WeatherSafeWidget({ region, themeActive, petName, targetDate, onSafetyLevel }: {
  region: string;
  themeActive?: boolean;
  petName?: string;
  targetDate?: string;
  onSafetyLevel?: (level: "safe" | "caution" | "indoor" | "unknown") => void;
}) {
  const { lang, dict } = useLang();
  const [selectedDate, setSelectedDate] = useState<string>(targetDate ?? "");
  const coordinates = useMemo(() => regionCenter(region), [region]);
  const { days, loading, failed } = useDailyForecast(coordinates);

  const activeDay = useMemo(() => {
    if (!selectedDate) return days[0] ?? null;
    return days.find((d) => d.date === selectedDate) ?? days[0] ?? null;
  }, [days, selectedDate]);
  const isFuture = selectedDate && days.length > 0 && !days.some((d) => d.date === selectedDate);
  const dateInputMax = useMemo(() => {
    if (days.length === 0) return undefined;
    return days[days.length - 1]?.date;
  }, [days]);

  // Report the selected day's walk-safety level upward.
  useEffect(() => {
    if (!region.trim() || !coordinates) {
      onSafetyLevel?.("unknown");
      return;
    }
    const day = activeDay;
    if (loading || failed || !day) return;
    onSafetyLevel?.(classifyDogWalkSafety(day).level);
  }, [region, coordinates, activeDay, loading, failed, onSafetyLevel]);

  if (!region.trim() || !coordinates) {
    const themedHint = lang === "ko"
      ? "지역을 고르면 이 코스의 그 지역 장소와 오늘 날씨가 함께 표시됩니다"
      : lang === "zh"
        ? "选择地区后，即可查看该主题的当地地点与今日天气"
        : "Pick a region to see this theme's local picks with today's weather";
    return (
      <div className="weather-safe-widget empty" aria-label={dict.weatherTitle}>
        <p className="weather-region-hint">🌤️ {themeActive ? themedHint : dict.weatherSelectRegion}</p>
      </div>
    );
  }

  const today = activeDay;
  if (loading) {
    return (
      <div className="weather-safe-widget" aria-label={dict.weatherTitle} aria-busy="true">
        <p className="weather-region-hint">{dict.weatherLoading}</p>
      </div>
    );
  }
  if (failed || !today) return null;

  const condition = weatherConditionFor(today.weatherCode);
  const safety = classifyDogWalkSafety(today);
  const strip = days.slice(1, 6);
  const dateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "ko-KR", { month: "short", day: "numeric", weekday: "short" })
    : lang === "ko" ? "오늘" : lang === "zh" ? "今天" : "Today";

  return (
    <div className={`weather-safe-widget ${safety.level}`} aria-label={dict.weatherTitle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {petName ? (
          <p className="weather-pet-greeting" style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>
            {lang === "ko" ? `🐾 ${petName}는 ${dateLabel} ` : lang === "zh" ? `🐾 ${petName}${dateLabel} ` : `🐾 ${petName} ${dateLabel}: `}
            <span className={`weather-safety-badge ${safety.level}`} style={{ fontSize: 12 }}>{t(lang, SAFETY_KEY_BY_LEVEL[safety.level], {})}</span>
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", flex: 1 }}>{dateLabel}</p>
        )}
        <input
          type="date"
          value={selectedDate}
          min={days[0]?.date ?? ""}
          max={dateInputMax}
          onChange={(e) => setSelectedDate(e.target.value)}
          aria-label={lang === "ko" ? "여행 날짜 선택" : "Trip date"}
          style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 8px", fontSize: 12, background: "#fff", color: "#334155" }}
        />
      </div>
      {isFuture ? (
        <p style={{ margin: "0 0 6px", fontSize: 12, color: "#94a3b8" }}>
          {lang === "ko" ? "선택한 날짜는 단기예보 범위를 벗어납니다 — 가까워지면 다시 확인하세요" : "Selected date is beyond the short-term forecast range"}
        </p>
      ) : null}
      <div className="weather-top-row">
        <span className="weather-icon">{condition.icon}</span>
        <div className="weather-main-info">
          <strong className="weather-temp">
            {region.trim()} {t(lang, "weatherTempMinMax", { min: today.tempMin, max: today.tempMax })}
          </strong>
          <span className="weather-cond">
            {lang === "ko" ? condition.ko : lang === "zh" ? condition.zh : condition.en} · {t(lang, "weatherPrecipChance", { p: today.precipProb })}
          </span>
        </div>
        <span className={`weather-safety-badge ${safety.level}`}>{t(lang, SAFETY_KEY_BY_LEVEL[safety.level], {})}</span>
      </div>
      <p className="weather-advice">{t(lang, ADVICE_KEY_BY_REASON[safety.reason], {})}</p>
      <div className="weather-day-strip" role="list" aria-label={dict.weatherTitle}>
        {strip.map((day) => {
          const dayCondition = weatherConditionFor(day.weatherCode);
          const daySafety = classifyDogWalkSafety(day);
          return (
            <div key={day.date} className={`weather-day ${daySafety.level}`} role="listitem">
              <small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "ko-KR", { weekday: "short" })}</small>
              <span aria-hidden="true">{dayCondition.icon}</span>
              <b>{t(lang, "weatherTempMinMax", { min: day.tempMin, max: day.tempMax })}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
