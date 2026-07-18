# Filter Truthfulness Check

## Result

DONE. Filtered counts now communicate confirmed evidence rather than implying nationwide impossibility. The complete searchable catalog is partitioned into mutually exclusive match, non-match, and unverified buckets.

## TDD evidence

- **RED:** `npm test -- --run src/domain/domain.test.ts src/data/catalog.test.ts` failed 5 tests before production changes. The failures showed the 17 kg large-dog phrase returning `true`, missing evaluation statuses, missing aggregate fields, and overlapping unknown counts.
- **GREEN:** The same focused command passed 18/18 tests after implementation.
- **REFACTOR / affected suite:** `npm run check` exited 0 with zero lint/type errors and 43/43 Vitest tests.

## Verification evidence

| Gate | Evidence | Result |
|---|---|---|
| Static and unit | `npm run check` | PASS, 43/43 tests |
| Browser E2E | `npm run test:e2e` | PASS, 10/10 scenarios |
| Production build | `npm run build` | PASS, Next.js routes generated |
| Live database API | `GET /api/places?hard=mediumDog&page=1` | 9,764 searchable; 37 match; 0 non-match; 9,727 unverified; 100 detail rows fetched |
| Qualified-size activation | Unit fixture `17kg 이하 또는 6개월 미만 대형견 동반 가능` | `largeDog=unknown`; guard fired |
| Live false-positive removal | `GET /api/places?hard=largeDog&page=1` | 37 match, down from the erroneous 38 |
| Render grounding | gstack browse, 390x844, medium-dog click | Headline and all three buckets observed; no console errors |
| Pending-response activation | Playwright request gate | Stale browsing cards and zeroed summaries remain hidden until the active query response arrives |

Observed render artifacts:

- `/tmp/filter-heading.png`
- `/tmp/filter-summary.png`
- `/tmp/filter-truthfulness-mobile-loaded.png`

## Contract consistency

- `confirmedMatchCount + confirmedNonMatchCount + unverifiedCount === searchableCount` for every non-empty query.
- Explicit false wins over unknown so a place cannot appear in two buckets.
- `filteredCount` and `unknownPlaceCount` remain as compatibility aliases.
- `detailCoverage` is labeled as ingestion coverage and is not used as a decision denominator.
- Strict AND matching, relaxation, paging, and unfiltered browsing remain unchanged.
- A result payload is rendered only when its request key matches the active conditions and page.

## Residual risk and next evidence

- The current snapshot still has only 100 fetched pet-detail rows, so 9,727 medium-dog places remain unverified rather than unavailable. More enrichment should reduce that unknown count.
- The broad clicked size bands intentionally reject conditional weight/age clauses. If product requirements later add exact dog weight and age, those source clauses can be evaluated more precisely instead of remaining unknown.
- The independent audit response transport failed for two separate reviewers. The dispatch failures and main-agent reclaimed audit are recorded in `005_plan_audit.md`; no audit code changes were made by subagents.
