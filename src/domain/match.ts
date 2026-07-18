import type { MatchEvaluation, MatchFailure, MatchProof, NormalizedPlace, SelectedConstraint } from "@/domain/types";

export function evaluatePlace(place: NormalizedPlace, constraints: SelectedConstraint[]): MatchEvaluation {
  const proof: MatchProof[] = [];
  const failures: MatchFailure[] = [];

  for (const constraint of constraints) {
    const fact = place.facts[constraint.key];
    if (fact.value === "true" && fact.evidence) {
      proof.push({ constraint, fact, evidence: fact.evidence });
    } else {
      failures.push({ constraint, value: fact.value, reason: fact.value === "false" ? "false" : fact.value === "unknown" ? "unknown" : "missing-evidence" });
    }
  }

  const exact = constraints.length > 0 && failures.length === 0 && proof.length === constraints.length;
  const status = constraints.length === 0
    ? "not-evaluated"
    : exact
      ? "confirmed-match"
      : failures.some((failure) => failure.value === "false")
        ? "confirmed-non-match"
        : "unverified";

  return { place, exact, status, proof, failures };
}

export function findExactMatches(places: NormalizedPlace[], constraints: SelectedConstraint[]): MatchEvaluation[] {
  return places.map((place) => evaluatePlace(place, constraints)).filter((evaluation) => evaluation.exact);
}
