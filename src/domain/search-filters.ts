import type { RawPlace } from "@/data/contracts";
import type { ConditionKey, PreparationFilterKey } from "@/domain/types";

export interface SearchFilterState {
  region: string;
  categories: RawPlace["category"][];
  hard: ConditionKey[];
  preferences: ConditionKey[];
  prepFilters: PreparationFilterKey[];
  page: number;
}

export function emptySearchFilters(): SearchFilterState {
  return { region: "", categories: [], hard: [], preferences: [], prepFilters: [], page: 1 };
}

export function hasActiveFilters(state: SearchFilterState): boolean {
  return (
    state.region.trim() !== "" ||
    state.categories.length > 0 ||
    state.hard.length > 0 ||
    state.preferences.length > 0 ||
    state.prepFilters.length > 0 ||
    state.page > 1
  );
}
