"use client";

import type { RawPlace } from "@/data/contracts";
import { useLang } from "@/i18n/LangContext";

type Props = {
  region: string;
  selectedCategories: RawPlace["category"][];
  onRegionChange: (region: string) => void;
  onToggleCategory: (category: RawPlace["category"]) => void;
};

export function DestinationPanel({ region, selectedCategories, onRegionChange, onToggleCategory }: Props) {
  const { dict } = useLang();
  const categories: { key: RawPlace["category"]; label: string; icon: string; desc: string }[] = [
    { key: "attraction", label: dict.catAttraction, icon: "🏞️", desc: dict.catAttractionDesc },
    { key: "restaurant", label: dict.catRestaurant, icon: "🍽️", desc: dict.catRestaurantDesc },
    { key: "cafe", label: dict.catCafe, icon: "☕", desc: dict.catCafeDesc },
    { key: "accommodation", label: dict.catAccommodation, icon: "🏨", desc: dict.catAccommodationDesc },
    { key: "shopping", label: dict.catShopping, icon: "🛍️", desc: dict.catShoppingDesc },
  ];
  return (
    <fieldset className="filter-fieldset destination-fieldset">
      <legend>{dict.destination}</legend>
      <label className="region-input">
        <span>{dict.region}</span>
        <input value={region} maxLength={40} placeholder={dict.regionPlaceholder} onChange={(event) => onRegionChange(event.target.value)} />
      </label>
      <div className="category-grid" aria-label={dict.destination}>
        {categories.map((category) => (
          <button
            type="button"
            className={selectedCategories.includes(category.key) ? "active" : ""}
            aria-pressed={selectedCategories.includes(category.key)}
            key={category.key}
            onClick={() => onToggleCategory(category.key)}
          >
            <span className="cat-icon">{category.icon}</span>
            <span className="cat-label">{category.label}</span>
            <small className="cat-desc">{category.desc}</small>
          </button>
        ))}
      </div>
      <p className="field-help">{dict.regionHelp}</p>
    </fieldset>
  );
}
