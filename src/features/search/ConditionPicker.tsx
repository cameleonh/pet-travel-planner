import type { ConditionKey } from "@/domain/types";

const hardOptions: { key: ConditionKey; label: string }[] = [
  { key: "leash", label: "목줄 착용" },
  { key: "outdoor", label: "야외 동반" },
  { key: "indoor", label: "실내 동반" }
];
const preferenceOptions: { key: ConditionKey; label: string }[] = [{ key: "carrier", label: "이동가방 사용" }];

type Props = {
  hard: ConditionKey[];
  preferences: ConditionKey[];
  onToggleHard: (key: ConditionKey) => void;
  onTogglePreference: (key: ConditionKey) => void;
};

export function ConditionPicker({ hard, preferences, onToggleHard, onTogglePreference }: Props) {
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
      <div className="preference-block">
        <div><strong>가능하면</strong><small>결과가 없을 때 직접 뺄 수 있어요.</small></div>
        {preferenceOptions.map((option) => (
          <button type="button" className={`preference-button ${preferences.includes(option.key) ? "active" : ""}`} aria-pressed={preferences.includes(option.key)} onClick={() => onTogglePreference(option.key)} key={option.key}>{option.label}</button>
        ))}
      </div>
    </fieldset>
  );
}
