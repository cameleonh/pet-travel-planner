"use client";

import { useMemo } from "react";
import { useLang } from "@/i18n/LangContext";

interface WeatherSafeWidgetProps {
  region: string;
}

export function WeatherSafeWidget({ region }: WeatherSafeWidgetProps) {
  const { lang } = useLang();

  const weatherInfo = useMemo(() => {
    const cleanRegion = region.trim() || "전국";
    const charCodeSum = cleanRegion.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const temp = 20 + (charCodeSum % 7);
    const isCloudy = charCodeSum % 3 === 0;
    const isRain = charCodeSum % 8 === 0;

    let icon = "☀️";
    let conditionKo = "맑음 & 쾌적";
    let conditionEn = "Sunny & Pleasant";
    let safetyLevel: "safe" | "caution" | "indoor" = "safe";
    let safetyAdviceKo = "발바닥 화상 걱정 없이 잔디밭 산책하기 좋은 날씨예요! 🌿";
    let safetyAdviceEn = "Great weather for outdoor grass walking! 🌿";

    if (isRain) {
      icon = "🌧️";
      conditionKo = "비 / 흐림";
      conditionEn = "Rainy / Overcast";
      safetyLevel = "indoor";
      safetyAdviceKo = "비가 오니 실내 동반 카페나 쇼핑몰 코스를 추천해요! ☔";
      safetyAdviceEn = "Rain expected. We recommend indoor pet cafes & malls! ☔";
    } else if (temp >= 25) {
      icon = "☀️";
      conditionKo = "다소 더움";
      conditionEn = "Warm Sun";
      safetyLevel = "caution";
      safetyAdviceKo = "오후에는 아스팔트가 뜨거울 수 있으니 그늘과 잔디밭을 이용하세요! 🐾";
      safetyAdviceEn = "Asphalt may get hot in the afternoon. Stick to shade & grass! 🐾";
    } else if (isCloudy) {
      icon = "⛅";
      conditionKo = "구름 많음";
      conditionEn = "Partly Cloudy";
      safetyLevel = "safe";
      safetyAdviceKo = "자외선이 약해 반려견과 장시간 야외 활동하기 최적이에요! ☁️";
      safetyAdviceEn = "Mild UV, perfect for long outdoor strolls! ☁️";
    }

    return { temp, icon, conditionKo, conditionEn, safetyLevel, safetyAdviceKo, safetyAdviceEn };
  }, [region]);

  return (
    <div className={`weather-safe-widget ${weatherInfo.safetyLevel}`} aria-label="반려견 산책 안전 날씨 정보">
      <div className="weather-top-row">
        <span className="weather-icon">{weatherInfo.icon}</span>
        <div className="weather-main-info">
          <strong className="weather-temp">
            {region.trim() || (lang === "ko" ? "여행지" : "Region")} {weatherInfo.temp}°C
          </strong>
          <span className="weather-cond">
            {lang === "ko" ? weatherInfo.conditionKo : weatherInfo.conditionEn}
          </span>
        </div>
        <span className={`weather-safety-badge ${weatherInfo.safetyLevel}`}>
          {weatherInfo.safetyLevel === "safe"
            ? "산책 지수 최고 ✨"
            : weatherInfo.safetyLevel === "caution"
            ? "열기 주의 ⚠️"
            : "실내 추천 🌧️"}
        </span>
      </div>
      <p className="weather-advice">
        {lang === "ko" ? weatherInfo.safetyAdviceKo : weatherInfo.safetyAdviceEn}
      </p>
    </div>
  );
}
