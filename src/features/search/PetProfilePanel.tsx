import type { ConditionKey } from "@/domain/types";

const sizes: { key: ConditionKey | null; label: string; note: string }[] = [
  { key: null, label: "전체", note: "크기 조건 없음" },
  { key: "smallDog", label: "소형견", note: "10kg 미만" },
  { key: "mediumDog", label: "중형견", note: "10–25kg" },
  { key: "largeDog", label: "대형견", note: "25kg 이상" }
];

type Props = {
  selected: ConditionKey | null;
  weight: string;
  dangerousDog: boolean;
  onSelect: (key: ConditionKey | null) => void;
  onWeightChange: (weight: string) => void;
  onDangerousDogChange: (checked: boolean) => void;
};

export function PetProfilePanel({ selected, weight, dangerousDog, onSelect, onWeightChange, onDangerousDogChange }: Props) {
  return (
    <fieldset className="filter-fieldset">
      <legend>반려견 프로필</legend>
      <div className="pet-profile-inputs">
        <label className="weight-input"><span>몸무게</span><span><input type="number" inputMode="decimal" min="0.1" max="150" step="0.1" value={weight} placeholder="예: 8.5" onChange={(event) => onWeightChange(event.target.value)} /> kg</span></label>
        <label className="dangerous-dog-input"><input type="checkbox" checked={dangerousDog} onChange={(event) => onDangerousDogChange(event.target.checked)} /><span>맹견 안전준비 안내 적용</span></label>
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
      <p className="field-help">몸무게를 입력하면 크기 조건을 자동으로 고르고, 직접 다시 바꿀 수도 있어요.</p>
    </fieldset>
  );
}
