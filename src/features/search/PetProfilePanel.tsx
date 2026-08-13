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
  const sizes: { key: ConditionKey | null; label: string; note: string }[] = [
    { key: null, label: dict.allSizes, note: dict.allSizesNote },
    { key: "smallDog", label: dict.smallDog, note: dict.smallDogNote },
    { key: "mediumDog", label: dict.mediumDog, note: dict.mediumDogNote },
    { key: "largeDog", label: dict.largeDog, note: dict.largeDogNote }
  ];
  return (
    <fieldset className="filter-fieldset">
      <legend>{dict.petProfile}</legend>
      <div className="pet-profile-inputs">
        <label className="weight-input"><span>{dict.weight}</span><span><input type="number" inputMode="decimal" min="0.1" max="150" step="0.1" value={weight} placeholder={dict.weightPlaceholder} onChange={(event) => onWeightChange(event.target.value)} /> kg</span></label>
        <label className="dangerous-dog-input"><input type="checkbox" checked={dangerousDog} onChange={(event) => onDangerousDogChange(event.target.checked)} /><span>{dict.dangerousDog}</span></label>
      </div>
      <div className="size-grid">
        {sizes.map((size) => (
          <label className={`size-option ${selected === size.key ? "active" : ""}`} key={size.key ?? "all"}>
            <input
              type="radio"
              name="pet-size"
              value={size.key ?? "all"}
              checked={selected === size.key}
              onClick={() => {
                if (size.key !== null && selected === size.key) onSelect(null);
              }}
              onChange={() => onSelect(size.key)}
            />
            <span>{size.label}</span><small>{size.note}</small>
          </label>
        ))}
      </div>
      <p className="field-help">{dict.weightHelp}</p>
    </fieldset>
  );
}
