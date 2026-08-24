"use client";

import type { ConditionKey } from "@/domain/types";
import { useLang } from "@/i18n/LangContext";

type Props = {
  selected: ConditionKey | null;
  weight: string;
  dangerousDog: boolean;
  onSelect: (key: ConditionKey | null) => void;
  onWeightChange: (weight: string) => void;
  onDangerousDogChange: (checked: boolean) => void;
};

export function PetProfilePanel({ selected, weight, dangerousDog, onSelect, onWeightChange, onDangerousDogChange }: Props) {
  const { dict } = useLang();
  const sizes: { key: ConditionKey | null; icon: string; label: string; note: string }[] = [
    { key: null, icon: "🐾", label: dict.allSizes, note: dict.allSizesNote },
    { key: "smallDog", icon: "🐶", label: dict.smallDog, note: dict.smallDogNote },
    { key: "mediumDog", icon: "🐕", label: dict.mediumDog, note: dict.mediumDogNote },
    { key: "largeDog", icon: "🦮", label: dict.largeDog, note: dict.largeDogNote }
  ];
  return (
    <fieldset className="filter-fieldset">
      <legend>{dict.petProfile}</legend>
      <div className="pet-profile-inputs">
        <label className="weight-input"><span>{dict.weight}</span><span><input type="number" inputMode="decimal" min="0.1" max="150" step="0.1" value={weight} placeholder={dict.weightPlaceholder} onChange={(event) => onWeightChange(event.target.value)} /> kg</span></label>
        <label className="dangerous-dog-input"><input type="checkbox" checked={dangerousDog} onChange={(event) => onDangerousDogChange(event.target.checked)} /><span>{dict.dangerousDog}</span></label>
      </div>
      <div className="size-grid">
        {sizes.map((size) => {
          const isSelected = selected === size.key;
          return (
            <label className={`size-option ${isSelected ? "active" : ""}`} key={size.key ?? "all"}>
              <input
                type="radio"
                name="pet-size"
                value={size.key ?? "all"}
                checked={isSelected}
                onClick={() => {
                  if (size.key !== null && selected === size.key) onSelect(null);
                }}
                onChange={() => onSelect(size.key)}
              />
              <span className="size-option-icon" aria-hidden="true">{size.icon}</span>
              <span className="size-option-label">{size.label}</span>
              <small className="size-option-note">{size.note}</small>
              {isSelected && <span className="size-active-check" aria-hidden="true">✓</span>}
            </label>
          );
        })}
      </div>
      <p className="field-help">{dict.weightHelp}</p>
    </fieldset>
  );
}
