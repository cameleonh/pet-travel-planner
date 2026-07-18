# Phase 2 — Clickable proof-first search experience

## Change map

- NEW `src/features/search/SearchExperience.tsx`: stateful search orchestration.
- NEW `src/features/search/PetProfilePanel.tsx`, `ConditionPicker.tsx`: touch/keyboard accessible controls.
- NEW `src/features/results/ResultCard.tsx`, `MatchProof.tsx`, `ZeroResultRecovery.tsx`: visible AND proof and recovery.
- NEW `src/features/shared/*`: small domain-specific primitives only where repetition is proven.
- MODIFY `src/app/page.tsx`, `src/app/globals.css`: compose the working product surface using locked tokens.
- NEW `e2e/search.spec.ts`: critical mobile and keyboard journeys.

## Acceptance and activation scenarios

- A user completes profile and search using clicks/taps only.
- Selecting multiple conditions visibly shows AND semantics and per-condition proof.
- A hard UNKNOWN result is not shown as exact and its confirmation requirement is understandable.
- Zero results activate the preference recovery control without silently changing constraints.
- Mobile 390x844 and desktop 1280x720 have no clipped controls; serious axe violations are zero.
