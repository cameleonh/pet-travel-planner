# Phase 1: Full Catalog and Server Pagination

## Diff-level map

### `src/data/providers/tour-api-provider.ts`

- Return list response metadata rather than discarding `totalCount`.
- Add `fetchAllPages`, `detailLimit`, and `cachedPlaces` options while preserving direct-live defaults.
- Fetch pages sequentially with stable ordering, deduplicate content IDs, and stop when the reported total is covered.
- Reuse cached confirmed pet policy; spend detail budget only on uncached/missing-detail rows.
- Reuse cached detail only when `sourceModifiedAt` is unchanged and prior `petDetailStatus` is `fetched`; retry failed detail rows within budget.
- Keep bounded concurrency and per-detail failure isolation.

### `scripts/sync-tour-db.ts`, `.env.example`, `.env.local`

- Use list page size 1,000, complete pagination, and a bounded daily detail budget.
- Load the latest snapshot as the cache before the upstream fetch.
- Print total stored and detailed-policy coverage without secrets.

### `src/data/contracts.ts`, `src/data/database/schema.ts`, `src/data/database/repository.ts`

- Add required snapshot `sourceTotalCount` and per-place `sourceModifiedAt` / `petDetailStatus` metadata.
- Add migration 2 columns with backfill defaults for the existing snapshot; preserve migration-1 databases.
- Round-trip the metadata and expose coverage counts without changing the append-only publication transaction.

### `src/data/catalog.ts` (new)

- Define the server catalog query/result contract.
- Normalize the complete snapshot, apply exact AND semantics globally, compute unknown exclusions and safe preference relaxation, then slice a 50-row page.
- Return `totalCount`, `filteredCount`, `page`, `pageSize`, `totalPages`, current `results`, and compact relaxation metadata.
- Distinguish upstream `sourceTotalCount` from locally valid/searchable count; never imply that an invalid omitted row was evaluated.
- Validate page, hard-condition, and preference inputs.

### `src/app/page.tsx`, `src/app/api/places/route.ts`

- Initial page computes catalog page 1 and uses the complete total in the badge.
- API accepts `hard`, `preferences`, and `page`; preserves the stable envelope while adding `catalog`.
- API returns only current raw/result rows, never the complete snapshot payload.

### `src/features/search/SearchExperience.tsx`

- Receive initial catalog page rather than the full normalized snapshot.
- On condition or page changes, fetch the server catalog with an abortable request.
- Display the global total/exact count while rendering at most 50 cards.
- Reset to page 1 when filters change; expose previous/next controls with `현재 / 전체 페이지` status.
- Preserve neutral browsing, proof, unknown exclusion, safe preference-only recovery, and exact-current-page course behavior.

### `src/features/results/ZeroResultRecovery.tsx`, `src/app/globals.css`

- Accept compact recovered-count metadata.
- Add clear loading/error/pagination styling and mobile-safe controls.

### Tests

- Provider: three-page list activation, stable dedupe/order, detail budget, cached reuse, bounded concurrency, detail failure.
- Catalog: global total, 50-row page windows, filtered global count, unknown exclusion, page clamping, preference-only recovery.
- API/E2E: initial fixture count remains two, no unbounded payload, filters reset pagination, controls are accessible, course consumes current exact page only.
- Live: stored base count matches upstream total or explicitly records any invalid-row exclusions; detail coverage is at least the previous snapshot plus the configured successful additions.

## Conditional activation matrix

1. **Second/last list page:** mocked total exceeds page size; prove every page requested once and final order is stable.
2. **Duplicate content ID:** repeat an ID across pages; prove one stored place.
3. **Cached detail:** seed one confirmed place; prove no detail request for it and evidence timestamp is retained.
4. **Changed cached detail:** change `sourceModifiedAt`; prove the row re-enters the detail-budget queue.
5. **Empty-but-successful detail:** return no optional policy fields; prove status is `fetched` and the row is not re-requested until modified.
6. **Detail budget:** provide more uncached rows than budget; prove only the budgeted number receive requests and the rest normalize to unknown.
7. **Detail failure:** fail one detail request; prove base place remains, status is `failed`, and no partial snapshot loss occurs.
8. **Page overflow:** request a page beyond total; prove clamped final page with no misleading empty count.
9. **Rapid filter clicks:** change filters before the previous response resolves; prove aborted/stale response cannot replace the newest state.
10. **API failure:** inject non-OK response; prove existing page stays visible with a retryable Korean status.
11. **Zero exact results:** prove only ordinary preferences are offered for removal and recovered count is global.

## Acceptance

- Database initial badge and heading report upstream total and locally searchable count honestly; exactly 50 or fewer cards render.
- Selecting conditions recomputes the global exact count across every stored base row.
- `unknown` base-only rows fail exact conditions, so count reduction never claims unverified compatibility.
- Next/previous changes page rows without changing the global count.
- Response size is bounded by page size rather than catalog size.
- Full verification and live browser evidence pass with no console errors or horizontal overflow.
