# Filter Truthfulness Implementation

## Diff-level contract and completed delta

- **MODIFIED `src/domain/types.ts`:** added `MatchStatus` and the status field on each evaluation.
- **MODIFIED `src/domain/match.ts`:** assigns `not-evaluated`, `confirmed-match`, `confirmed-non-match`, or `unverified`; explicit false takes precedence over unknown.
- **MODIFIED `src/domain/normalize.ts`:** preserves source-field boundaries and rejects broad size proof when the containing claim has a weight or age qualifier, while retaining all-breeds and plain-size rules.
- **MODIFIED `src/domain/domain.test.ts`:** added RED-to-GREEN regressions for qualified size text, unrelated numeric claims, browsing status, and exclusive filtered dispositions.
- **MODIFIED `src/data/catalog.ts`:** returns `confirmedMatchCount`, `confirmedNonMatchCount`, and `unverifiedCount`; retains `filteredCount` and `unknownPlaceCount` compatibility fields.
- **MODIFIED `src/data/catalog.test.ts`:** asserts the exhaustive partition invariant and false-over-unknown precedence.
- **MODIFIED `src/features/search/SearchExperience.tsx`:** uses qualified confirmation copy, renders all three bucket counts, and labels detail coverage as ingestion coverage.
- **MODIFIED `src/features/search/SearchExperience.tsx`:** keys each response to the active query and hides stale counts/cards while a different filter request is pending or failed.
- **MODIFIED `src/features/results/ZeroResultRecovery.tsx`:** avoids nationwide-impossibility copy and explains that unverified places may later qualify.
- **MODIFIED `src/app/globals.css`:** adds a compact responsive definition-list treatment for the bucket summary.
- **MODIFIED `e2e/search.spec.ts`:** verifies filtered confirmation copy, bucket counts, truthful zero state, relaxation, and toggle reset.
- **MODIFIED `e2e/search.spec.ts`:** holds a filter request deterministically and proves stale browsing rows and zeroed summaries are not rendered under the new condition.
- **MODIFIED `e2e/adversarial.spec.ts`:** pins the browsing API aggregate contract.
- **MODIFIED `docs/data/DATA_SPEC.md`:** defines the exhaustive disposition contract and qualifier example.
- **MODIFIED `STATUS.md`:** records the repaired semantics and current verification.

## Behavioral boundaries

- Strict AND matching and minimal preference relaxation are unchanged.
- No unverified place is promoted to a match.
- Unfiltered browsing still returns and pages all searchable rows.
- Indoor/outdoor parser expansion and upstream detail enrichment remain outside this unit.
