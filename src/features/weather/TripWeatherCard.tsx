"use client";

import type { Coordinates } from "@/domain/geo";
import { classifyDogWalkSafety, weatherConditionFor, type DailyWeather } from "@/domain/weather";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";
import { useDailyForecast } from "@/features/weather/useDailyForecast";

const ADVICE_KEY_BY_REASON = {
  fine: "weatherAdviceFine",
  rain: "weatherAdviceRain",
  hot: "weatherAdviceHot",
  snow: "weatherAdviceSnow",
  cold: "weatherAdviceCold",
} as const;

const SAFETY_KEY_BY_LEVEL = {
  safe: "weatherSafetySafe",
  caution: "weatherSafetyCaution",
  indoor: "weatherSafetyIndoor",
} as const;

export function weatherAdvice(lang: "ko" | "en" | "zh", day: DailyWeather): string {
  const safety = classifyDogWalkSafety(day);
  return t(lang, ADVICE_KEY_BY_REASON[safety.reason], {});
}

export function TripWeatherCard({ tripDate, coordinates }: { tripDate: string; coordinates: Coordinates | null }) {
  const { lang, dict } = useLang();
  const { days, loading, failed } = useDailyForecast(coordinates);
  const tripDay = days.find((day) => day.date === tripDate) ?? null;
  const beyondForecast = !loading && !failed && !tripDay && days.length > 0 && days.every((day) => day.date < tripDate);

  if (!coordinates || failed) return null;
  if (loading) {
    return (
      <div className="trip-weather-card" aria-busy="true">
        <p className="trip-weather-title">{dict.weatherTripDate}</p>
        <p className="trip-weather-loading">{dict.weatherLoading}</p>
      </div>
    );
  }
  if (beyondForecast) {
    return (
      <div className="trip-weather-card">
        <p className="trip-weather-title">{dict.weatherTripDate}</p>
        <p className="trip-weather-loading">{dict.weatherOutOfRange}</p>
      </div>
    );
  }
  if (!tripDay) return null;

  const condition = weatherConditionFor(tripDay.weatherCode);
  const safety = classifyDogWalkSafety(tripDay);
  return (
    <div className={`trip-weather-card ${safety.level}`}>
      <div className="trip-weather-heading">
        <p className="trip-weather-title">{dict.weatherTripDate}</p>
        <span className={`weather-safety-badge ${safety.level}`}>{t(lang, SAFETY_KEY_BY_LEVEL[safety.level], {})}</span>
      </div>
      <div className="trip-weather-main">
        <span className="weather-icon" aria-hidden="true">{condition.icon}</span>
        <div>
          <strong>{t(lang, "weatherTempMinMax", { min: tripDay.tempMin, max: tripDay.tempMax })}</strong>
          <small>{lang === "ko" ? condition.ko : lang === "zh" ? condition.zh : condition.en} · {t(lang, "weatherPrecipChance", { p: tripDay.precipProb })}</small>
        </div>
      </div>
      <p className="trip-weather-advice">{weatherAdvice(lang, tripDay)}</p>
    </div>
  );
}
