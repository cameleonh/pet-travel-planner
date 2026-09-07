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
    <div className="region-course-picker" style={{ margin: "16px 0 8px" }}>
      <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px", color: "#1e293b" }}>
        {lang === "ko" ? "📍 지역별 코스" : lang === "zh" ? "📍 按地区" : "📍 Browse by Region"}
        <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b", marginLeft: 8 }}>
          {lang === "ko" ? "지역을 고르면 날씨와 장소가 함께 표시됩니다" : lang === "zh" ? "选择地区后显示天气和地点" : "Pick a region to see weather and places together"}
        </span>
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {regionOptions.map((option) => {
          const isSel = selected?.value === option.value;
          const count = placeCounts[option.value] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onRegionChange(isSel ? "" : option.value)}
              aria-pressed={isSel}
              style={{
                border: isSel ? "1px solid #18554d" : "1px solid #e2e8f0",
                background: isSel ? "#18554d" : "#fff",
                color: isSel ? "#fff" : "#334155",
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: isSel ? 700 : 400,
                transition: "all .15s",
              }}
            >
              {option.label}
              <span style={{ fontSize: 11, opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
                {count > 999 ? `${Math.floor(count / 1000)}k` : count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
