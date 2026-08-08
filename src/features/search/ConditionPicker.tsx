import { preparationFilterKeys, preparationFilterLabels, type ConditionKey, type PreparationFilterKey } from "@/domain/types";

const hardOptions: { key: ConditionKey; label: string }[] = [
  { key: "smallDog", label: "소형견 가능" },
  { key: "mediumDog", label: "중형견 가능" },
  { key: "largeDog", label: "대형견 가능" }
];

type Props = {
  hard: ConditionKey[];
  preferences: ConditionKey[];
  prepFilters: PreparationFilterKey[];
  onToggleHard: (key: ConditionKey) => void;
  onTogglePreference: (key: ConditionKey) => void;
  onTogglePrepFilter: (key: PreparationFilterKey) => void;
};

export function ConditionPicker({ hard, onToggleHard, prepFilters, onTogglePrepFilter }: Props) {
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
      <div className="prep-filter-group" role="group" aria-label="방문 조건">
        <p className="prep-filter-label">방문 조건</p>
        <div className="condition-grid">
          {preparationFilterKeys.map((key) => (
            <button
              type="button"
              className={`condition-button prep-button ${prepFilters.includes(key) ? "active" : ""}`}
              aria-pressed={prepFilters.includes(key)}
              onClick={() => onTogglePrepFilter(key)}
              key={key}
            >
              <span className="condition-indicator" aria-hidden="true">{prepFilters.includes(key) ? "✓" : ""}</span>{preparationFilterLabels[key]}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
