# Logical Architecture

**Status:** Executable MVP implemented; competition hardening in progress  
**Last updated:** 2026-07-16

## 1. Architectural Goal

Deliver one auditable pipeline from official tourism text to a strict user decision:

```text
Official APIs
  → validated logical snapshot
  → SQLite append-only publication
  → normalized place and policy evidence
  → tri-state condition matrix
  → exact AND matcher
  → proof-bearing results
  → optional constraint-safe course
```

The system must be able to explain where every displayed condition came from and rerun interpretation when rules change.

## 2. Recommended Delivery Shape

Start as a mobile-first responsive web/PWA in one deployable application. A single TypeScript runtime is the default recommendation for the competition build because it minimizes integration overhead while supporting UI, API routes, deterministic parsing, and batch scripts.

Implemented baseline:

- Next.js 16.2.10 App Router with React 19.2.7 and strict TypeScript 6.0.3
- Node.js 22+ runtime contract; verified locally on Node.js 22.22.2
- Zod 4 provider-boundary parsing, Vitest 4 tests, and ESLint 9 quality checks
- SQLite database provider by default; fixture and direct issued-key modes remain available server-side
- `better-sqlite3` 12.11.1 append-only snapshot store
- Manually triggered ingestion and backup CLIs
- Force-dynamic home and API reads so a successful sync is visible without rebuilding the application
- Server-side tourism and routing API adapters
- Static rule dictionaries and versioned fixtures in source control

Do not introduce a separate Python service, queue, native app, or microservice until measured load or model-assisted review creates a real boundary need.

## 3. Component Boundaries

| Component | Responsibility | Must not own |
|---|---|---|
| Web client | Filters, profile state, results, proof, course presentation | Provider credentials or raw provider parsing |
| Application API | Query validation, orchestration, response contracts | Provider-specific field semantics |
| Tourism adapter | Requests, pagination, retries, quotas, raw field mapping | Product qualification decisions |
| Snapshot store | Immutable/raw payload and retrieval metadata | Interpreted truth |
| Policy normalizer | Deterministic text rules, tri-state values, evidence ledger | UI ranking or course selection |
| Match engine | Hard-constraint AND evaluation and preference scoring | Text parsing or source fetching |
| Relaxation engine | Smallest preference-only relaxation | Editing or bypassing hard constraints |
| Course engine | Qualified candidate selection, opening feasibility, ordering | Requalifying partial places |
| Routing adapter | External route distance/time when configured | Pet or venue policy truth |
| Read model | Efficient place/result/detail projection | Raw evidence mutation |

Each component exposes one explicit boundary. Provider DTOs do not leak into the UI contract.

## 4. Core Data Flow

### Ingestion

1. Page through the complete `KorPetTourService2` base list, currently using up to 1,000 rows per request.
2. Reuse unchanged cached pet detail, then fetch new or changed detail with bounded concurrency and a configurable per-sync budget.
3. Map and validate one logical provider snapshot.
4. Record a pending sync, then publish the snapshot and relational rows in one short SQLite transaction.
5. Read only the newest successful snapshot; retain the previous success when refresh fails.
6. Normalize pet-policy text into conservative condition facts at the application boundary.

### Search

1. Validate hard constraints, preferences, and the requested positive page number.
2. Load the complete latest successful snapshot and normalize its condition evidence.
3. Apply exact AND matching across the complete snapshot; unknown detail never qualifies.
4. Compute the global exact count and safe minimal relaxation metadata.
5. Return one stable result window of at most 50 proof-bearing objects plus global count, coverage, and pagination metadata.

### Course

1. Accept the exact-search identifier, duration, stop categories, origin, and mobility mode.
2. Reuse only exact-qualified place IDs.
3. Filter impossible opening windows.
4. Select candidates that cover desired categories.
5. Use routing evidence when configured; otherwise geographic distance.
6. Return feasible stops or a structured blocking explanation.

The implemented MVP uses the current exact-match objects directly rather than a persisted search identifier. It orders them deterministically by Haversine distance from the reference place, labels the result `approximate`, and deliberately omits travel-time claims. A future routing adapter may replace only the ordering evidence; it must not change qualification.

### Nearby auxiliary catalog

1. Accept provider-normalized auxiliary places and a transient origin.
2. Order by Haversine distance.
3. Split records with confirmed pet compatibility from records whose pet status is unknown.
4. Never present the confirmation-needed group as a match.
5. Request browser geolocation only after a user action, do not persist it, and retain the reference-place fallback when permission is unavailable.

## 5. Query Contracts

### Search request

- Region or coarse user origin
- Optional text keyword
- Pet profile projection
- Hard-condition keys and values
- Preference keys and values
- Place categories
- Sort mode

### Search response

- Snapshot provenance and canonical filter state
- Source total, searchable count, confirmed-detail coverage, and global exact result count
- One result page of at most 50 places with one proof item per selected constraint
- Current page, page size, and total pages
- Optional separately requested confirmation-needed group
- Safe relaxation proposal or explicit “none”
- Snapshot and source freshness metadata

### Course request

- Exact-search identifier
- Half-day/day time window
- Desired stop categories
- Start point and mobility mode
- Maximum stop count and distance policy

### Course response

- Protected-condition summary
- Route mode: `approximate` or `routed`
- Ordered stops with match proof and opening state
- Distance/route evidence
- Warnings or structured infeasibility reason

## 6. Persistence Model

The implemented store has `schema_migrations`, `sync_runs`, `source_snapshots`, `places`, `place_amenities`, and `auxiliary_places`. Validated logical snapshots are append-only, checksummed, and linked only after successful publication. See [DATABASE.md](../data/DATABASE.md) for the physical schema, transactions, capacity, backup, and recovery contract.

## 7. Deterministic and Model-Assisted Work

- Deterministic code owns normalization, negation rules, schema validation, matching, relaxation, route constraints, and user-visible qualification.
- A model may propose new phrase clusters or labels offline.
- Model output never directly changes a production hard-condition value.
- Any proposed rule enters the labeled fixture set, receives human review, and passes precision gates before release.

## 8. Caching and Failure Policy

- Cache official records server-side by content ID and source modification time.
- Keep base-list refresh complete while bounding pet-detail calls to stay within the official development-account quota. The local detail checkpoint is 50 rows, up to 14 checkpoints run per invocation, and a shared 900-request hard cap includes list and detail operations. Each batch resumes from SQLite, advances pending rows before rotating retry candidates, and refuses to publish a quota-aborted snapshot.
- Use bounded retries with timeout and backoff for upstream calls.
- Do not retry quota failures in a tight loop.
- Serve the last valid snapshot with freshness metadata when refresh fails.
- If no valid snapshot exists, return a recoverable error rather than an empty success.
- Record parser exceptions per record; one malformed record must not abort the full ingestion batch.

## 9. Privacy and Security

- Tourism and routing API keys remain server-side in environment configuration.
- Nearby search requests location only at the moment of use.
- Prefer coarse or transient origin coordinates; do not persist precise location by default.
- Shared searches remove pet names and exact current location.
- Validate every public query against an allowlisted condition vocabulary.
- Rate-limit public search and course endpoints.
- Respect tourism image-license metadata and provider terms.

## 10. Observability

Track:

- Provider request success, latency, quota/error class, and records changed
- Parser success, unresolved/conflict rates, and rule version
- Search candidate count, exact count, and condition-level elimination counts
- Relaxation proposal and application rate
- Course success and structured failure reason
- Cache age and stale-result rate

Logs must not contain API keys, precise user location, or pet-profile labels.

## 11. Verification Strategy

- Contract fixtures pin raw provider responses and logical mapping.
- Labeled text fixtures pin parser output and evidence spans.
- Table-driven tests prove tri-state AND and safe relaxation.
- Course scenarios prove approximate/routed modes and infeasible paths.
- API contract tests validate request/response behavior.
- One browser flow proves profile → filter → exact proof → relaxation → course.

## 12. Architectural Decisions

| Decision | Status | Reason |
|---|---|---|
| Mobile-first PWA before native apps | Recommended | Fastest path to a complete web/app implementation and shareable demo |
| Single application runtime | Recommended | Minimizes cross-service complexity for the MVP |
| Raw snapshot plus derived evidence | Locked | Required for auditability and parser reprocessing |
| Tri-state condition model | Locked | Prevents missing data from becoming a false positive |
| Course consumes exact search | Locked and implemented | Preserves the product safety promise |
| Nearby unknown-status separation | Locked and implemented | Prevents proximity from implying pet compatibility |
| External route provider | Optional | Actual travel time is useful but not required for the core demo |
| Web framework | Next.js 16 App Router | One full-stack TypeScript runtime with static shell and server-only provider boundary |
| SQLite runtime mode | Default and implemented | Fast stable reads from the latest successful official snapshot |
| Fixture mode | Verification default | Deterministic, keyless, and network-free automated verification |
| Multi-source provider registry | Phase 2 — in design | Each enrichment source gets its own adapter, quota budget, and sync schedule; all join to existing `contentId` where possible |

## 13. External Boundaries

- [Pet Travel Service](https://www.data.go.kr/data/15135102/openapi.do) supplies the primary place and pet-policy records.
- [Korean Tourism Information Service](https://www.data.go.kr/data/15101578/openapi.do) may supplement events, stays, images, and nearby tourism records.
- A future map/routing provider supplies navigation evidence only.
- Venue phone calls remain the final confirmation path for stale or ambiguous admission policy.

## 14. Phase 2 — Multi-Provider Architecture

**Status:** Design in progress
**Last updated:** 2026-08-05
**Reference:** [Phase 2 Upgrade Roadmap](../roadmap/PHASE2_UPGRADE.md)

### Provider Registry

The current architecture has one tourism adapter (`TourApiPlaceProvider`). Phase 2 introduces a provider registry that maps enrichment dimensions to independent adapters, each with its own service endpoint, quota budget, and sync schedule:

```
EnrichmentRequest(contentId, dimension)
  → ProviderRegistry.resolve(dimension)
    → EnrichmentProvider.fetch(contentId)
      → validated Zod response
        → SQLite enrichment table
          → joined at query time
```

Each provider is isolated by:
- **Service key:** a separate `TOUR_API_KEY` is used for all KTO services; the endpoint path differs per service.
- **Quota tracker:** each service has its own 1,000/day counter; the existing `requestBudget` pattern is extended to a per-service map.
- **Sync schedule:** daily, weekly, or monthly depending on the source's update cycle (see roadmap §6).

### Enrichment Dimensions

| Dimension | Provider | Joins by | Isolation |
|---|---|---|---|
| Accessibility | `BarrierFreeProvider` (`KorWithService2`) | `contentId` | Read-only enrichment; never modifies pet tri-state |
| Camping | `CampingProvider` (`GoCamping`) | `contentId` | Independent catalog; enters tri-state pipeline via `animalCmgCl` |
| Congestion | `CongestionProvider` (`TatsCnctrRateService`) | `areaCd` + name | Forecast only; displayed as badge, not constraint |
| Festivals | `FestivalProvider` (`KorService2`) | `contentId` | Separate discovery flow |
| Trails | `TrailProvider` (`Durunubi`) | proprietary | Standalone table; no contentId join |
| Related sites | `RelatedSitesProvider` (`TarRlteTarService1`) | name + area | Recommendation hint; not authoritative |
| Visitor volume | `VisitorVolumeProvider` (`DataLabService`) | `areaCd` | Statistical context only |
| Photos | `PhotoProvider` (`PhotoGalleryService1`) | `galContentId` | Media enrichment only |
| Multilingual | `TranslationProvider` (`EngService2` / `ChtService2`) | `contentId` | UI-layer only; pet-policy fields stay Korean |

### Query-Time Join Strategy

Enrichment data is never merged into the normalized place record at ingestion time. Instead, the application API performs a left join at query time:

1. The match engine evaluates pet-policy conditions exactly as in the MVP.
2. After qualification, the API layer attaches enrichment rows (accessibility, congestion, camping, photos) by `contentId`.
3. Missing enrichment rows are silently absent — the UI shows no badge or section rather than a placeholder.

This preserves the MVP invariant: pet-policy matching depends only on `places` + `place_amenities`, and enrichment cannot accidentally qualify or disqualify a result.

### Schema Migration Sequence

Each enrichment source adds a versioned migration:

| Migration | Version | Table(s) | Status |
|---|---|---|---|
| v4 | `accessibility_enrichment` | `place_accessibility` | Design |
| v5 | `camping_catalog` | `place_camping` | Design |
| v6 | `congestion_forecast` | `place_congestion` | Design |
| v7 | `festival_discovery` | `festivals` | Design |

All migrations are additive — no existing column or constraint is altered.
