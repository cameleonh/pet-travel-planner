"use client";

import { useMemo } from "react";
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

export function WeatherSafeWidget({ region }: { region: string }) {
  const { lang, dict } = useLang();
  const coordinates = useMemo(() => regionCenter(region), [region]);
  const { days, loading, failed } = useDailyForecast(coordinates);

  if (!region.trim() || !coordinates) {
    return (
      <div className="weather-safe-widget empty" aria-label={dict.weatherTitle}>
        <p className="weather-region-hint">🌤️ {dict.weatherSelectRegion}</p>
      </div>
    );
  }

  const today = days[0] ?? null;
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

  return (
    <div className={`weather-safe-widget ${safety.level}`} aria-label={dict.weatherTitle}>
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
