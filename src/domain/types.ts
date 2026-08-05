import type { RawPlace } from "@/data/contracts";

export const conditionKeys = ["outdoor", "indoor", "leash", "carrier", "smallDog", "mediumDog", "largeDog"] as const;
export type ConditionKey = (typeof conditionKeys)[number];
export const preparationKeys = ["leash", "carrier", "muzzle", "wasteBag", "stroller", "mannerBelt"] as const;
export type PreparationKey = (typeof preparationKeys)[number];
export type PreparationScope = "all" | "indoor" | "dangerous-dog";
export type TriState = "true" | "false" | "unknown";
export type ConstraintKind = "hard" | "preference";
export type ProtectedCategory = "safety" | "legal" | "access" | "admission" | null;

export type ConditionEvidence = {
  sourceText: string;
  sourceUrl: string;
  observedAt: string;
  excerpt: string;
  evidenceClass: "source-explicit" | "source-derived" | "inferred-from-general-admission";
};

export type ConditionFact = {
  key: ConditionKey;
  value: TriState;
  evidence: ConditionEvidence | null;
  requirements: PreparationKey[];
};

export type PreparationRequirement = {
  key: PreparationKey;
  label: string;
  scope: PreparationScope;
  evidence: ConditionEvidence;
};

export type NormalizedPlace = Omit<RawPlace, "petPolicy"> & {
  policySource: RawPlace["petPolicy"];
  facts: Record<ConditionKey, ConditionFact>;
  requiredPreparations: PreparationRequirement[];
};

export type SelectedConstraint = {
  key: ConditionKey;
  label: string;
  kind: ConstraintKind;
  protectedCategory: ProtectedCategory;
};

export type MatchProof = {
  constraint: SelectedConstraint;
  fact: ConditionFact;
  evidence: ConditionEvidence;
};

export type MatchFailure = {
  constraint: SelectedConstraint;
  value: TriState;
  reason: "false" | "unknown" | "missing-evidence";
};

export type MatchStatus = "not-evaluated" | "confirmed-match" | "confirmed-non-match" | "unverified";

export type MatchEvaluation = {
  place: NormalizedPlace;
  exact: boolean;
  status: MatchStatus;
  proof: MatchProof[];
  failures: MatchFailure[];
};

export type RelaxationProposal = {
  removedPreferences: SelectedConstraint[];
  remainingConstraints: SelectedConstraint[];
  matches: MatchEvaluation[];
};
