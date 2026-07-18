# Phase 1 — Matching and evidence domain

## Change map

- NEW `src/domain/types.ts`: pet profile, constraint, evidence, tri-state, match and relaxation types.
- NEW `src/domain/normalize.ts`: deterministic parsing of official structured/free-description fields into evidence-bearing facts.
- NEW `src/domain/match.ts`: strict AND evaluator; hard UNKNOWN and FALSE both exclude exact matches.
- NEW `src/domain/relax.ts`: minimal preference-only relaxation with protected constraint categories.
- NEW `src/domain/*.test.ts`: examples and property tests for invariants and malformed input.
- MODIFY `src/app/api/places/route.ts`: accept validated filter query and return exact/excluded counts plus proof.
- MODIFY `docs/data/DATA_SPEC.md`: bind documented fields to implemented types.

## Acceptance and activation scenarios

- A mixed TRUE/UNKNOWN record activates hard-unknown exclusion and reports the exact missing proof.
- A zero-result set activates preference relaxation; safety/legal/access/admission constraints remain untouched.
- Every exact match contains one provenance record per selected hard condition.
- Free-text synonyms are normalized deterministically; ambiguous or missing text stays UNKNOWN.
