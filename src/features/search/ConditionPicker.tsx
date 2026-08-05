import type { ConditionKey } from "@/domain/types";

const hardOptions: { key: ConditionKey; label: string }[] = [
  { key: "smallDog", label: "소형견 가능" },
  { key: "mediumDog", label: "중형견 가능" },
  { key: "largeDog", label: "대형견 가능" }
];

type Props = {
  hard: ConditionKey[];
  preferences: ConditionKey[];
  onToggleHard: (key: ConditionKey) => void;
  onTogglePreference: (key: ConditionKey) => void;
};

export function ConditionPicker({ hard, onToggleHard }: Props) {
  return (
    <fieldset className="filter-fieldset">
      <legend>꼭 필요한 조건</legend>
      <div className="condition-grid">
        {hardOptions.map((option) => (
          <button type="button" className={`condition-button ${hard.includes(option.key) ? "active" : ""}`} aria-pressed={hard.includes(option.key)} onClick={() => onToggleHard(option.key)} key={option.key}>
            <span className="condition-indicator" aria-hidden="true">{hard.includes(option.key) ? "✓" : ""}</span>{option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
