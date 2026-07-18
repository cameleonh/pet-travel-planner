# SQLite Persistence Plan

## Loop Spec

- **Loop archetype:** repair-and-integrate
- **Trigger:** the running UI exposes only one or two fixture-derived results and has no database persistence
- **Goal:** persist a larger official tourism snapshot in SQLite, serve the latest valid database snapshot, and show all stored places before the user selects filters
- **Non-goals:** accounts, saved trips, cloud deployment, PostgreSQL operations, background scheduling, raw user location storage, semantic/vector search, or a public sync endpoint
- **Verifier:** real SQLite integration tests, provider/API contract tests, deterministic fixture Playwright, a live `db:sync` run, direct database counts, database-mode browser inspection, full `npm run verify`, and dependency audit
- **Stop condition:** a successful official sync stores more than two places, database mode serves that snapshot, the unfiltered page shows the stored count, exact filtering remains conservative, and all gates exit 0
- **Memory artifact:** this implementation unit plus `docs/data/DATABASE.md`, `docs/architecture/ARCHITECTURE.md`, and `STATUS.md`
- **Expected terminal outcomes:** DONE; or BLOCKED only if the issued API credential or upstream service cannot produce a valid list after the existing safe retry/fallback paths are exhausted
- **Escalation condition:** destructive schema reset, credential rotation, production deployment, or a requirement to share the database across multiple app instances
- **Delegation:** an independent reviewer audits the plan in A. If two reviewer packets fail for tooling reasons, the main agent reclaims the audit and records the failure. No implementation slice is delegated unless the plan is amended in P.

## Work Class

**C4.** This adds a persistent data store, an initial migration, a CLI ingestion path, a new runtime mode, and one development dependency. It therefore receives full PABCD, real-database tests, rollback documentation, and full verification.

## Structural Decision

### Context

The application already has a clean `PlaceProvider` seam, but runtime data is either a two-place JSON fixture or a direct live request. Direct requests are slow and volatile, while the fixture cannot demonstrate credible catalog scale.

### Chosen move

Add a SQLite infrastructure adapter behind the existing provider contract. A CLI sync fetches the official logical snapshot outside the transaction, validates it with the existing Zod contract, then appends one immutable snapshot and its relational read rows in a short transaction. Runtime reads only the newest successful snapshot.

Use pinned `better-sqlite3` 12.11.1 behind the repository adapter. The installed Node 22.22 runtime still reports `node:sqlite` as experimental, so the built-in module does not meet the stability bar for a competition demo. Raise the runtime floor to Node 22, add the package's pinned type definitions, and add pinned `tsx` only as a development dependency so repository TypeScript modules can be reused by the sync and backup CLIs without duplicating provider logic.

### Rejected alternatives

- **Keep JSON or configure live mode:** rejected because it does not add persistence or last-valid data.
- **PostgreSQL:** rejected for this local competition demo because it adds a separate service, credentials, deployment, and backup operations before the workload requires them.
- **Prisma/Drizzle:** rejected because the small fixed schema does not justify an ORM and generated-client layer.
- **Built-in `node:sqlite`:** rejected for this runtime because Node 22 emits an experimental-feature warning; reconsider when the deployed runtime provides a stable API.
- **Write through a public admin route:** rejected because it would create an unnecessary mutation/security boundary.

### Consequences

- Presentation and API code continue to depend on `loadPlaceSnapshot`; they never import the database.
- Infrastructure gains `database` as a provider-selection mode, while `ProviderSnapshot.provider` continues to record the original data owner (`tour-api` or `fixture`).
- SQLite remains a single-instance embedded store. A multi-instance deployment must migrate the repository adapter to PostgreSQL rather than sharing the SQLite file over a network filesystem.
- The first migration is additive and reversible by deleting only a disposable new database file. No existing user data is transformed.
- Next.js already treats `better-sqlite3` as a server-external package, so native code remains outside client bundles.

## Necessity Gate

- **Do nothing:** rejected; the reported catalog-scale defect remains.
- **Delete:** no obsolete layer can be removed to create persistence.
- **Configure:** direct `tour-api` mode exists but provides no last-valid snapshot and performs upstream calls on page load.
- **Reuse:** reuse the existing provider interface, Zod snapshot contract, official API adapter, fixture fallback, normalizer, matcher, API envelope, and test stack.
- **New code justified:** a repository, migration, sync service, and CLI boundary do not exist and are required for durable storage.

## Dependency-Ordered Work

1. Define and test the migration, repository, and database provider.
2. Add the official sync and backup CLIs over the repository.
3. Wire `DATA_PROVIDER=database` through the existing provider loader and API metadata.
4. Change the empty-filter UI from “no exact matches” to catalog browsing while preserving exact qualification once a condition is selected.
5. Sync official data, inspect counts and rendering, then update the architecture/data/status sources of truth.

## Scope Boundary

### In

- Embedded SQLite schema, migration tracking, append-only logical snapshots, relational place/amenity/auxiliary rows, sync-run ledger, checksum, indexes, and constraints
- Manual official API sync with configurable row limit and bounded detail concurrency
- Full-file backup CLI and documented retention/recovery policy
- Database runtime provider with fixture fallback only when the database is unavailable or empty
- Unfiltered catalog browsing plus exact filtering after the first selection
- Integration, contract, E2E, build, security, and visual verification

### Out

- Automated cron, remote database hosting, multi-instance writes, user accounts, saved objects, admin UI, public mutation endpoint, destructive retention job, full raw per-operation API-envelope archive, and map/routing changes

## Source-of-Truth Sync

- `docs/data/DATABASE.md` becomes the physical persistence source of truth.
- `docs/architecture/ARCHITECTURE.md` is corrected from planned PostgreSQL-compatible persistence to the implemented SQLite adapter.
- `docs/data/DATA_SPEC.md`, `README.md`, and `STATUS.md` are updated to match executable behavior.

## Rollback

Set `DATA_PROVIDER=fixture` or `tour-api` to bypass the new adapter. Reverting source/config changes removes the feature. The SQLite file is ignored and can be retained for later inspection; deleting it is a separate destructive operator action and is never part of automatic rollback.
