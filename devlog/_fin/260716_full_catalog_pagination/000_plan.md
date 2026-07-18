# Full Catalog Count and Pagination Plan

## Loop spec

- **Archetype:** correctness repair and scale integration
- **Trigger:** the UI presents the 50-row synchronization cap as if it were the complete catalog
- **Goal:** persist the complete official base catalog, show the complete searchable count, filter against the complete stored catalog, and render 50 results per page
- **Non-goals:** pretending uncollected detail is confirmed, exceeding the issued API quota, background scheduling, infinite scroll, remote database hosting, or changing the exact-match safety contract
- **Verifier:** mocked multi-page provider tests, real SQLite round-trip, API pagination/filter tests, fixture Playwright, live complete-base sync, direct DB counts, database-mode browser interaction, full `npm run verify`
- **Stop condition:** the initial database screen shows the complete stored count while rendering at most 50 cards; each condition recomputes a lower or equal global exact count; pagination changes the 50-row window; unknown detail never passes; all gates exit 0
- **Memory artifact:** this unit, `docs/data/DATABASE.md`, `docs/data/DATA_SPEC.md`, `docs/architecture/ARCHITECTURE.md`, and `STATUS.md`
- **Expected terminal outcomes:** DONE; or BLOCKED only if the upstream quota/service prevents even the ten base-list requests required for a complete catalog snapshot
- **Escalation:** only destructive database reset, quota-plan changes, production deployment, or a scope change that permits estimated/misleading counts
- **Delegation:** one independent A-phase reviewer; after two transport failures the main agent reclaims and records the audit

## Work class

**C4.** The change crosses official ingestion, persistent snapshot semantics, API contracts, asynchronous client state, pagination, and user-visible count truth.

## Evidence and constraints

- The live `areaBasedList2` response reports `totalCount=9764` and accepts `numOfRows=1000`; ten sequential list pages cover the current catalog.
- The list response contains base tourism fields but not pet-policy detail fields.
- `detailPetTour2` without `contentId` returns mandatory-parameter error code 11.
- The official catalog states a development-account traffic limit of 1,000 calls per day. A one-shot 9,764-detail refresh is therefore invalid.

## Architectural decision

Use a two-depth snapshot:

1. Every sync fetches all base-list pages and stores every valid base place.
2. Previously confirmed detail rows are reused by content ID.
3. A configurable detail budget enriches only places that do not yet have detail.
4. Unenriched places carry the explicit missing-detail policy text and normalize to `unknown`, so they contribute to the browsable catalog count but never falsely satisfy a condition.
5. Server search evaluates the complete stored snapshot, returns a global count and one 50-row result page, and never sends all 9,764 policy records to the browser.

The snapshot also records `sourceTotalCount`, per-place `sourceModifiedAt`, and `petDetailStatus` (`fetched`, `not-fetched`, `failed`). Cached detail is reused only when the source modification timestamp is unchanged and the prior detail call completed. This avoids both stale reuse after an upstream edit and repeated daily calls for a valid detail response whose optional fields were empty.

This makes the displayed count truthful today and lets detail coverage improve monotonically across later manual syncs without violating quota.

## Dependency order

1. Extend the Tour API provider with complete list pagination, bounded new-detail enrichment, and cached-detail reuse.
2. Migrate snapshot/place persistence for source total, source modification time, and detail status.
3. Add a server catalog query projection over the latest snapshot with global exact counts, safe relaxation metadata, and 50-row pagination.
4. Change the page/API contract to return only the requested result window plus total metadata.
5. Change the client to fetch server results on condition/page changes and render pagination/loading/error states.
6. Run a live full-base sync, inspect counts, exercise browser states, and synchronize documentation.

## Rollback

`DATA_PROVIDER=fixture` remains deterministic. The previous successful 50-row snapshot stays queryable until the full snapshot publishes atomically. A failed full sync records failure and does not replace it. Source rollback restores the old single-page provider/UI; database deletion is never automatic.
