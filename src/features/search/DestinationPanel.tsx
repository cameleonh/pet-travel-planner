import type { RawPlace } from "@/data/contracts";

const categories: { key: RawPlace["category"]; label: string }[] = [
  { key: "attraction", label: "관광지" },
  { key: "restaurant", label: "식당" },
  { key: "cafe", label: "카페" },
  { key: "accommodation", label: "숙소" },
  { key: "shopping", label: "쇼핑" },
];

type Props = {
  region: string;
  selectedCategories: RawPlace["category"][];
  onRegionChange: (region: string) => void;
  onToggleCategory: (category: RawPlace["category"]) => void;
};

export function DestinationPanel({ region, selectedCategories, onRegionChange, onToggleCategory }: Props) {
  return (
    <fieldset className="filter-fieldset destination-fieldset">
      <legend>여행지와 장소 유형</legend>
      <label className="region-input">
        <span>지역</span>
        <input value={region} maxLength={40} placeholder="예: 속초, 제주, 부산 해운대" onChange={(event) => onRegionChange(event.target.value)} />
      </label>
      <div className="category-grid" aria-label="장소 유형">
        {categories.map((category) => (
          <button
            type="button"
            className={selectedCategories.includes(category.key) ? "active" : ""}
            aria-pressed={selectedCategories.includes(category.key)}
            key={category.key}
            onClick={() => onToggleCategory(category.key)}
          >
            {category.label}
          </button>
        ))}
      </div>
      <p className="field-help">지역명은 주소와 장소명에서 찾고, 여러 유형을 함께 선택할 수 있어요.</p>
    </fieldset>
  );
}
