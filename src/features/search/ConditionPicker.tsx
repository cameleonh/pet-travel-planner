"use client";

import type { RegionOption } from "@/domain/regions";
import { preparationFilterKeys, type PreparationFilterKey } from "@/domain/types";
import { useLang } from "@/i18n/LangContext";
import { t, type Lang } from "@/i18n/dictionary";

const localizedRegionLabels: Record<Exclude<Lang, "ko">, Record<string, string>> = {
  en: { 서울: "Seoul", 경기: "Gyeonggi-do", 인천: "Incheon", 강원: "Gangwon State", 충북: "Chungcheongbuk-do", 충남: "Chungcheongnam-do", 대전: "Daejeon", 세종: "Sejong", 전북: "Jeonbuk State", 전남광주: "Gwangju · Jeonnam", 광주: "Gwangju", 전남: "Jeollanam-do", 경북: "Gyeongsangbuk-do", 대구: "Daegu", 울산: "Ulsan", 부산: "Busan", 경남: "Gyeongsangnam-do", 제주: "Jeju" },
  zh: { 서울: "首尔", 경기: "京畿道", 인천: "仁川", 강원: "江原特别自治道", 충북: "忠清北道", 충남: "忠清南道", 대전: "大田", 세종: "世宗", 전북: "全北特别自治道", 전남광주: "光州 · 全罗南道", 광주: "光州", 전남: "全罗南道", 경북: "庆尚北道", 대구: "大邱", 울산: "蔚山", 부산: "釜山", 경남: "庆尚南道", 제주: "济州" },
};

type Props = {
  region: string;
  regionOptions: RegionOption[];
  prepFilters: PreparationFilterKey[];
  onRegionChange: (region: string) => void;
  onTogglePrepFilter: (key: PreparationFilterKey) => void;
};

export function ConditionPicker({ region, regionOptions, prepFilters, onRegionChange, onTogglePrepFilter }: Props) {
  const { lang, dict } = useLang();
  const selectedArea = regionOptions.find((option) => option.value === region || option.districts.some((district) => district.value === region));
  const selectedDistrict = selectedArea?.districts.find((district) => district.value === region);
  const regionLabel = (option: RegionOption) => lang === "ko" ? option.label : localizedRegionLabels[lang][option.value] ?? option.label;

  return (
    <fieldset className="filter-fieldset">
      <legend>{dict.region}</legend>
      <div className="region-selects">
        <label className="region-input">
          <span>{dict.region}</span>
          <select value={selectedArea?.value ?? ""} onChange={(event) => onRegionChange(event.target.value)}>
            <option value="">{dict.allRegions}</option>
            {regionOptions.map((option) => <option value={option.value} key={option.value}>{regionLabel(option)}</option>)}
          </select>
        </label>
        <label className="region-input">
          <span>{dict.district}</span>
          <select
            value={selectedDistrict?.value ?? ""}
            disabled={!selectedArea || selectedArea.districts.length === 0}
            onChange={(event) => onRegionChange(event.target.value || selectedArea?.value || "")}
          >
            <option value="">{dict.allDistricts}</option>
            {selectedArea?.districts.map((district) => <option value={district.value} key={district.value}>{district.label}</option>)}
          </select>
        </label>
      </div>
      <p className="field-help">{dict.regionHelp}</p>
      <div className="prep-filter-group" role="group" aria-label={dict.visitConditions}>
        <p className="prep-filter-label">{dict.visitConditions}</p>
        <div className="condition-grid">
          {preparationFilterKeys.map((key) => (
            <button
              type="button"
              className={`condition-button prep-button ${prepFilters.includes(key) ? "active" : ""}`}
              aria-pressed={prepFilters.includes(key)}
              onClick={() => onTogglePrepFilter(key)}
              key={key}
            >
              <span className="condition-indicator" aria-hidden="true">{prepFilters.includes(key) ? "✓" : ""}</span>{t(lang, key)}
            </button>
          ))}
        </div>
        <p className="field-help">{dict.visitConditionsHelp}</p>
      </div>
    </fieldset>
  );
}
