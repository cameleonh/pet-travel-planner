"use client";

import type { RegionOption } from "@/domain/regions";
import { preparationFilterKeys, type PreparationFilterKey } from "@/domain/types";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

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

  return (
    <fieldset className="filter-fieldset">
      <legend>{dict.region}</legend>
      <div className="region-selects">
        <label className="region-input">
          <span>{dict.region}</span>
          <select value={selectedArea?.value ?? ""} onChange={(event) => onRegionChange(event.target.value)}>
            <option value="">{dict.allRegions}</option>
            {regionOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
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
