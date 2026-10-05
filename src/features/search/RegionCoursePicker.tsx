"use client";

import { useLang } from "@/i18n/LangContext";
import type { RegionOption } from "@/domain/regions";

interface RegionCoursePickerProps {
  region: string;
  regionOptions: RegionOption[];
  placeCounts: Record<string, number>;
  onRegionChange: (value: string) => void;
}

export function RegionCoursePicker({ region, regionOptions, placeCounts, onRegionChange }: RegionCoursePickerProps) {
  const { lang } = useLang();
  const selected = regionOptions.find((o) => o.value === region || o.districts.some((d) => d.value === region));

  return (
    <div className="region-course-picker">
      <p className="region-course-picker-title">
        {lang === "ko" ? "📍 지역별 코스" : lang === "zh" ? "📍 按地区" : "📍 Browse by Region"}
        <span className="region-course-picker-hint">
          {lang === "ko" ? "지역을 고르면 날씨와 장소가 함께 표시됩니다" : lang === "zh" ? "选择地区后显示天气和地点" : "Pick a region to see weather and places together"}
        </span>
      </p>
      <div className="region-course-chips">
        {regionOptions.map((option) => {
          const isSel = selected?.value === option.value;
          const count = placeCounts[option.value] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={option.value}
              type="button"
              className={`region-course-chip ${isSel ? "active" : ""}`}
              onClick={() => onRegionChange(isSel ? "" : option.value)}
              aria-pressed={isSel}
            >
              {option.label}
              <span className="region-course-chip-count">
                {count > 999 ? `${Math.floor(count / 1000)}k` : count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
