# Phase 1: SQLite Persistence and Catalog Browsing

## Diff-Level File Map

### NEW `src/data/database/schema.ts`

- Own migration `001_initial_snapshot_store` with forward and reverse SQL.
- Create strict `schema_migrations`, `sync_runs`, `source_snapshots`, `places`, `place_amenities`, and `auxiliary_places` tables.
- Enforce provider/category/status domains, coordinate ranges, non-empty identity fields, composite keys, cascading foreign keys, and indexes for latest-successful-snapshot and snapshot-scoped reads.

### NEW `src/data/database/repository.ts`

- Resolve `DATABASE_PATH` at the filesystem boundary and create the parent directory for writable file databases.
- Open `better-sqlite3` with foreign keys, busy timeout, and WAL for file-backed stores.
- Apply pending migrations in version order.
- Expose focused operations: start/complete/fail sync, append validated snapshot transactionally, load latest successful snapshot, checkpoint, and close.
- Specify every selected column and validate reconstructed snapshots with `providerSnapshotSchema`.
- Keep network calls outside database transactions.

### NEW `src/data/providers/database-provider.ts`

- Implement the existing provider seam with name `database`.
- Open, migrate, read the newest valid snapshot, and close for each request boundary.
- Throw a typed empty-database error so the loader can activate a clear fixture fallback.

### MODIFY `src/data/providers/provider.ts`

- Broaden provider selection identity to `fixture | tour-api | database` without changing snapshot-source provenance.
- Add the typed empty-database operational error.

### MODIFY `src/data/providers/index.ts`

- Select the database provider for `DATA_PROVIDER=database` and `DATABASE_PATH`.
- Return additive `dataSource` metadata (`fixture`, `live`, or `database`) from `loadPlaceSnapshot`.
- Preserve the existing live-outage fallback and add a database-empty/unavailable fallback with distinct Korean copy.

### MODIFY `src/data/providers/tour-api-provider.ts`

- Preserve the existing default ten-row direct-live behavior.
- Bound pet-detail concurrency for larger CLI syncs.
- Keep per-detail failure isolation and credential-safe errors.

### NEW `src/data/database/sync.ts`

- Orchestrate one idempotent sync attempt: create run ledger entry, fetch and validate outside the transaction, append the snapshot and rows transactionally, then mark success.
- Mark failed runs without touching the previous successful snapshot.
- Return counts, snapshot timestamp, and run ID for CLI evidence.

### NEW `scripts/sync-tour-db.ts`

- Parse server-only environment configuration.
- Default `TOUR_API_SYNC_ROWS` to 50 and `TOUR_API_DETAIL_CONCURRENCY` to 5 with bounded numeric validation.
- Run the shared sync service and print counts without printing the API key or constructed request URLs.
- Set a nonzero exit code on failure.

### NEW `scripts/backup-db.ts`

- Create `.data/backups` and use SQLite's online backup API so a WAL-backed live database is copied consistently.
- Fail clearly when the source database does not exist.
- Reopen and validate the backup artifact before reporting success.

### NEW `src/data/database/database.test.ts`

- Use a real temporary SQLite file.
- Prove migration application, constraints, normalized amenity rows, validated round-trip, append-only second snapshot, latest-snapshot selection, and previous-snapshot preservation after a failed sync.
- Prove empty-database and invalid-coordinate paths execute.

### MODIFY `src/data/providers/providers.test.ts`

- Assert database provider selection and additive data-source metadata.
- Add a bounded-detail-concurrency case while preserving all official contract tests.

### MODIFY `src/data/providers/providers.regression-1.test.ts`

- Preserve the live 502 regression and add the database-empty fallback activation.

### MODIFY `src/app/page.tsx`

- Display `저장 데이터 · N곳` when the runtime reads SQLite, while retaining `관광공사` and `샘플` labels for other modes.

### MODIFY `src/app/api/places/route.ts`

- Expose additive `meta.dataSource` without changing the success/error envelope.

### MODIFY `src/features/search/PetProfilePanel.tsx`

- Add an explicit `전체` size choice and allow no pet-size constraint.
- Preserve radio semantics and accessible labels.

### MODIFY `src/features/search/SearchExperience.tsx`

- Start with no selected size, hard condition, or preference.
- When constraints are empty, display every stored place as a catalog and keep course creation disabled because nothing is exact-qualified.
- Once any condition is selected, switch to the existing exact matcher, proof, unknown exclusion, recovery, and exact-only course behavior.

### MODIFY `src/features/results/ResultCard.tsx`

- Render a neutral catalog status when no proof is present.
- Render match proof only for exact-qualified filtered results.

### MODIFY `src/app/globals.css`

- Fit four size choices without clipped Korean labels; use a 2x2 mobile grid below 640px.

### MODIFY `e2e/search.spec.ts`

- Assert the unfiltered fixture catalog initially shows two places.
- Explicitly select small dog, leash, and carrier before running the existing exact-proof and recovery flow.

### MODIFY `e2e/course.spec.ts`

- Explicitly select small dog and leash before building the two-place exact course.
- Preserve nearby, denial, distance, and no-fabricated-minutes assertions.

### MODIFY `package.json`, `package-lock.json`, `.env.example`, `.env.local`, `.gitignore`

- Raise Node to `>=22.0.0` and add pinned `better-sqlite3` 12.11.1 plus `@types/better-sqlite3` 7.6.13.
- Add pinned `tsx` 4.23.1 as a development-only CLI runner and `db:sync` / `db:backup` scripts.
- Document/select database mode and ignore `.data/` database and backup files.
- Preserve the existing secret value without printing or committing it.

### NEW `docs/data/DATABASE.md`

- Document external, conceptual, and internal schemas; naming/data standards; integrity; ACID/transaction/isolation behavior; access paths and indexes; glossary; capacity; backup/restore; security; and migration/rollback.

### MODIFY `docs/architecture/ARCHITECTURE.md`, `docs/data/DATA_SPEC.md`, `README.md`, `STATUS.md`

- Replace intended persistence claims with the implemented SQLite boundary and sync commands.
- Record the distinction between unfiltered browsing and exact qualification.
- Record fresh database counts and verification evidence.

## Acceptance and Activation Matrix

1. **Migration:** a new temporary database opens and all six tables plus migration version 1 exist.
2. **Round-trip:** writing the fixture snapshot and loading it returns the same validated provider, timestamp, two places, amenities, and auxiliary records.
3. **Append-only latest:** writing a second snapshot retains both `source_snapshots` rows while runtime reads the second.
4. **Failed sync activation:** inject an upstream provider failure after one successful snapshot; the run is marked failed and the prior snapshot remains the runtime result.
5. **Empty DB activation:** select database mode against a migrated empty file; the page/API receive fixture data plus the database-specific fallback notice.
6. **Integrity activation:** attempt an invalid coordinate/category or orphan amenity; SQLite or Zod rejects it and no partial snapshot is published.
7. **Concurrency activation:** a mocked multi-item official response records no more than the configured number of simultaneous detail calls.
8. **Unfiltered UI:** fixture mode initially shows `2곳을 둘러보세요`, both fixture place names, no match-proof disclosure, and a disabled course button.
9. **Exact UI:** selecting small dog, leash, and carrier yields one place and three proof rows; medium dog activates the same safe preference-only recovery; large dog never auto-removes hard constraints.
10. **Live sync:** `npm run db:sync` exits 0, direct SQLite counts show more than two current places and one successful sync, and no credential appears in output.
11. **Database runtime:** with `DATA_PROVIDER=database`, the page badge reads `저장 데이터 · N곳`, N equals the latest stored place count, and the initial result count also equals N.
12. **Rendered check:** desktop and 390px database-mode screenshots show the expanded catalog count and four size options without clipping, overlap, or horizontal overflow; one filter interaction updates the exact count.
13. **Full gate:** `DATA_PROVIDER=fixture npm run verify` exits 0, followed by a database-mode production build and zero moderate-or-higher dependency vulnerabilities.

## Transaction and Concurrency Contract

- Official HTTP requests complete before `BEGIN IMMEDIATE`.
- One transaction inserts the immutable source snapshot, place rows, amenity rows, auxiliary rows, and successful-run linkage.
- A thrown insert or validation error executes rollback and leaves the last successful snapshot unchanged.
- Runtime requests open short read connections. SQLite WAL permits concurrent readers; the CLI is the only writer.
- The initial application has no concurrent user writes. Optimistic version columns are unnecessary.

## Data Classification

All persisted fields are public tourism data. API credentials and browser geolocation are not stored. Database and backups are operational internal artifacts and remain ignored by version control.
