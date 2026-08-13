"use client";

import { preparationFilterKeys, type ConditionKey, type PreparationFilterKey } from "@/domain/types";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

type Props = {
  hard: ConditionKey[];
  preferences: ConditionKey[];
  prepFilters: PreparationFilterKey[];
  onToggleHard: (key: ConditionKey) => void;
  onTogglePreference: (key: ConditionKey) => void;
  onTogglePrepFilter: (key: PreparationFilterKey) => void;
};

export function ConditionPicker({ hard, onToggleHard, prepFilters, onTogglePrepFilter }: Props) {
  const { lang, dict } = useLang();
  const hardOptions: { key: ConditionKey; label: string }[] = [
    { key: "smallDog", label: dict.smallDogOk },
    { key: "mediumDog", label: dict.mediumDogOk },
    { key: "largeDog", label: dict.largeDogOk }
  ];
  return (
    <fieldset className="filter-fieldset">
      <legend>{dict.hardConditions}</legend>
      <div className="condition-grid">
        {hardOptions.map((option) => (
          <button type="button" className={`condition-button ${hard.includes(option.key) ? "active" : ""}`} aria-pressed={hard.includes(option.key)} onClick={() => onToggleHard(option.key)} key={option.key}>
            <span className="condition-indicator" aria-hidden="true">{hard.includes(option.key) ? "✓" : ""}</span>{option.label}
          </button>
        ))}
      </div>
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
      </div>
    </fieldset>
  );
}
