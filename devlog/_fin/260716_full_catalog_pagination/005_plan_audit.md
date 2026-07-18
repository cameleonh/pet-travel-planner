# Full Catalog Plan Audit

## Ownership

Two independent reviewer attempts failed before returning findings because encrypted tool output could not be decoded. Per the plan's retirement rule, the main agent reclaimed the read-only audit and checked the plan against the code, live API probes, and official quota page.

## Blocking findings and folded fixes

1. **Completeness metadata was underspecified.** A raw upstream total can differ from valid stored rows. The plan now stores `sourceTotalCount` and returns it separately from the locally searchable/global exact count.
2. **Cached pet detail could become stale or waste quota.** Reuse by content ID alone cannot detect upstream changes, while source text alone cannot distinguish an empty successful response from an unattempted response. The plan now stores `sourceModifiedAt` and explicit `petDetailStatus`; unchanged successful detail is reused, changed/failed detail re-enters the bounded queue.
3. **The existing migration contract did not cover new metadata.** The plan now adds migration 2 with backfill defaults and a migration-1 upgrade activation test instead of rewriting the initial migration beneath existing databases.

## Controls confirmed

- Ten sequential 1,000-row list pages fit within the development quota; per-content detail does not, so enrichment is budgeted and cumulative.
- Complete base publication remains atomic and a failed sync cannot replace the previous success.
- Server-side global filtering keeps the browser response bounded to 50 rows.
- `unknown` never satisfies a condition, so base-only places cannot inflate exact counts.
- Abort/stale-response, API-failure, page-overflow, zero-result relaxation, duplicate-ID, last-page, and detail-failure paths all have reachable activation scenarios.
- Course construction consumes only exact results from the visible server page.

## Residual risk

Full detail coverage requires repeated manual syncs or an approved production quota increase. Until then the UI must disclose detail coverage, and exact counts intentionally favor precision over recall.

## Verdict

**GO-WITH-FIXES (blockers=3).** All blockers are folded into the amended plan; only the disclosed quota-driven coverage ramp remains.
