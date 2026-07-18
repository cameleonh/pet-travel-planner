import { findExactMatches } from "@/domain/match";
import type { NormalizedPlace, RelaxationProposal, SelectedConstraint } from "@/domain/types";

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]));
}

export function findMinimalRelaxation(places: NormalizedPlace[], constraints: SelectedConstraint[]): RelaxationProposal | null {
  const relaxable = constraints.filter((constraint) => constraint.kind === "preference" && constraint.protectedCategory === null);
  for (let size = 1; size <= relaxable.length; size += 1) {
    for (const removedPreferences of combinations(relaxable, size)) {
      const removed = new Set(removedPreferences);
      const remainingConstraints = constraints.filter((constraint) => !removed.has(constraint));
      const matches = findExactMatches(places, remainingConstraints);
      if (matches.length > 0) return { removedPreferences, remainingConstraints, matches };
    }
  }
  return null;
}
