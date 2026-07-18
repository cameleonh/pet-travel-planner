# Filter Truthfulness Plan

## Loop spec

- **Archetype:** Repair loop for a misleading filtered-count contract and a size-parser false positive.
- **Trigger:** Selecting medium dog shows `37곳` as if it were the nationwide total; selecting large dog shows 38 because a conditional 17 kg policy is parsed as unrestricted large-dog access.
- **Goal:** Make filtered results distinguish confirmed matches, confirmed non-matches, and unverified places, and prevent qualified weight/age phrases from proving an entire dog-size band.
- **Non-goals:** Increasing pet-detail API coverage, inventing matches for unverified places, changing the clicked size bands, redesigning indoor/outdoor parsing, or changing the strict AND policy.
- **Verifier:** Vitest domain/catalog regressions, API contract assertions, Playwright rendered-copy assertions, typecheck, lint, build, and one live database browser observation.
- **Stop condition:** A selected size reports a qualified count such as “확인된 100곳 중 37곳,” all 9,764 rows belong to exactly one result-status bucket, and the 17 kg conditional example no longer passes `largeDog`.
- **Memory artifact:** This unit plus `docs/data/DATA_SPEC.md` and `STATUS.md`.
- **Expected terminal outcomes:** DONE after all gates pass; BLOCKED only if the current database/server cannot be read after local fallbacks are exhausted.
- **Escalation:** Main agent reclaims any failed delegated audit slice; no write work is delegated.

## Evidence-backed diagnosis

- The SQLite snapshot contains 9,764 places but only 100 fetched pet-detail records; 9,664 places are not yet evaluable.
- `CatalogPage.filteredCount` currently exposes only exact matches while the UI labels it as an unqualified nationwide result count.
- `unknownPlaceCount` is not mutually exclusive: an evaluation with a known false and another unknown is counted as unknown.
- `normalize.ts` matches `대형견 ... 가능` inside `17kg 이하 또는 6개월 미만 대형견 동반 가능`, producing one false-positive large-dog result.
- The strict AND matcher is correct: unknown evidence must not pass. The repair must improve semantics and communication without fabricating availability.

## Scope and dependency order

1. **Domain classification foundation**
   - Add a mutually exclusive evaluation status: `confirmed-match`, `confirmed-non-match`, or `unverified`.
   - Classification precedence: exact all-true is match; any explicit false is non-match; otherwise unknown/missing evidence is unverified.
   - Keep existing `exact`, proof, and failure data for result cards and relaxations.
2. **Conservative size parsing**
   - Preserve the validated all-breeds phrase as proof for all three size bands.
   - Preserve an unqualified explicit size phrase such as `대형견 동반 가능`.
   - If a size-positive clause contains a numeric weight or age qualifier, do not promote it to the whole UI band unless a separately validated band-safe rule exists. In this unit, qualified medium/large phrases remain unknown.
3. **Catalog/API aggregate contract**
   - Add `confirmedMatchCount`, `confirmedNonMatchCount`, and `unverifiedCount` to `CatalogPage`.
   - Keep `filteredCount` as a compatibility alias for confirmed matches in filtered mode and full candidates in browsing mode.
   - Assert that the three filtered buckets sum to `searchableCount`.
4. **Rendered result truthfulness**
   - In filtered mode, headline: `현재 {confirmedMatchCount}곳에서 가능을 확인했어요`; do not use detail coverage as a condition-decision denominator.
   - Show a compact three-bucket summary across all searchable rows and explain that unverified places have not been ruled out.
   - Show `상세정보 수집 {detailCoverage}곳` separately as ingestion coverage, not a filter verdict.
   - In zero state, say no place is confirmed among checked records, not that none exists nationwide.
   - Keep unfiltered browsing copy and pagination behavior unchanged.
5. **Source-of-truth sync and verification**
   - Update data contract counting semantics and current status.
   - Run focused regressions, affected suites, static checks, build, API smoke, and rendered browser observation.

## Implementation document

The exact path-level change contract and completed delta live in `010_filter_truthfulness.md`. Keeping implementation detail separate preserves this document as the unit-level problem and acceptance specification.

## Acceptance criteria and activation scenarios

1. `전 견종 동반 가능` still yields true for small, medium, and large.
2. `대형견 동반 가능` without a qualifier still yields `largeDog=true`.
3. `17kg 이하 또는 6개월 미만 대형견 동반 가능` triggers the qualifier guard and yields `largeDog=unknown`; the observed effect is a failing-then-passing unit test.
4. A mixed evaluation with one false and one unknown triggers non-match precedence and is counted only as confirmed non-match.
5. For every filtered catalog response, `confirmedMatchCount + confirmedNonMatchCount + unverifiedCount === searchableCount`.
6. Fixture E2E shows a qualified filtered headline and a three-bucket summary; zero state explicitly says unchecked/unknown places may still qualify.
7. The live database medium-dog view no longer presents 37 as the nationwide total; browser output visibly separates 37 possible confirmations, the 100-place ingestion coverage, and the unverified count.

## Risks

- More conservative parsing can reduce recall, but the documented MVP prioritizes exact-result precision.
- `detailCoverage` is a source-fetch count, not the number with a decisive fact for a particular condition; it must never be used as the headline denominator.
- The compatibility `filteredCount` field remains temporarily to avoid breaking existing consumers; the UI must use the explicit new fields.
