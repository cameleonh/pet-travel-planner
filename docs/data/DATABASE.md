# SQLite Database

**Status:** Implemented and verified; Phase 2E traffic tables proposed
**Last updated:** 2026-08-08

## Purpose and boundary

The database keeps the latest valid official tourism catalog available without calling the upstream API on every page request. It stores public provider data only. API credentials, browser geolocation, searches, and pet profiles are never persisted.

SQLite is appropriate for the single-machine competition demo: one manual sync writer, short runtime readers, a roughly 10,000-place catalog, and no account data. A multi-instance deployment must replace this adapter with a service database rather than share the SQLite file over a network filesystem.

## External schema

- Input: a Zod-validated `ProviderSnapshot` from `fixture` or `tour-api`.
- Runtime output: the newest snapshot linked to a successful sync run.
- Home and API routes read dynamically, so a newly published snapshot does not require an application rebuild.
- Publication: `npm run db:sync` fetches outside the transaction and atomically publishes each bounded enrichment batch.
- Backup: `npm run db:backup` uses SQLite's online backup API and reopens the result.

The archived JSON is the validated logical provider snapshot, not a complete archive of every raw HTTP envelope.

## Conceptual schema

```text
sync_runs 0..1 ── 1 source_snapshots
                         │
                         ├── places ── place_amenities
                         ├── auxiliary_places
                         ├── traffic_cctv
                         └── traffic_conditions
```

- `sync_runs` is the operational ledger (`pending`, `success`, `failed`).
- `source_snapshots` is append-only and contains provenance, source total count, checksum, and logical JSON.
- `places` and `auxiliary_places` are relational read rows scoped to one snapshot. Each place records its upstream modification token and pet-detail fetch status.
- `place_amenities` is a child set with a composite foreign key to its place.
- `traffic_cctv` is a CCTV catalog scoped to one snapshot: camera ID, coordinates, route name, direction, and provider source. Refreshed on a daily or weekly cycle.
- `traffic_conditions` is a real-time condition snapshot: congestion, speed, weather, and closure records. Appended per fetch and never served stale across sessions.
- `schema_migrations` records applied versions.

## Internal schema and standards

| Table | Primary key | Important constraints/indexes |
|---|---|---|
| `schema_migrations` | `version` | ordered migration ledger |
| `source_snapshots` | integer `id` | provider domain, source total count, unique SHA-256 checksum |
| `sync_runs` | integer `id` | status/provider domains, nullable snapshot FK, latest-success index |
| `places` | `(snapshot_id, place_id)` | category and pet-detail-status domains, source modification token, coordinate ranges, snapshot index |
| `place_amenities` | `(snapshot_id, place_id, amenity)` | composite cascading FK |
| `auxiliary_places` | `(snapshot_id, place_id)` | category/status domains, coordinate ranges, snapshot index |
| `traffic_cctv` | `(snapshot_id, cctv_id)` | provider domain, coordinate ranges, route name index, snapshot index |
| `traffic_conditions` | `(snapshot_id, condition_id)` | condition type domain, route ref index, observation time index, snapshot index |

Names are English `snake_case`; times are UTC ISO 8601 text; provider IDs remain stable strings; coordinates are WGS84 decimal degrees; unknown policy meaning stays in source text and is interpreted by the domain layer, not the database.

## Transaction, isolation, and concurrency

- Foreign keys are enabled for every connection.
- File databases use WAL, a 5-second busy timeout, and one CLI writer.
- Network requests and Zod validation finish before publication.
- One `better-sqlite3` transaction inserts the snapshot, place rows, amenities, auxiliary rows, and successful-run link.
- Any thrown insert or linkage error rolls back the whole publication.
- A failed run is recorded separately and cannot replace the last successful snapshot.
- The latest successful snapshot is also the enrichment checkpoint. Unchanged fetched details are reused, pending rows advance first, and retry candidates rotate by the persisted successful-run count.
- Runtime requests use short read connections. There are no concurrent user writes or optimistic-lock fields in this phase.

## Capacity and performance

At 10,000 places, modest policy text and amenities are expected to remain in the tens of megabytes. Snapshot history grows linearly because publication is append-only. The current complete-base snapshot stores 9,764 places. Runtime search evaluates the complete latest snapshot on the server but returns no more than 50 result objects per request; the browser never receives the complete policy catalog. Reads use one latest-success index lookup followed by snapshot-scoped indexed queries.

No automatic purge runs. Retention requires a future reviewed policy and backup verification before deletion.

## Backup and recovery

- Full backup command: `npm run db:backup`.
- Default destination: `.data/backups/pet-travel-<UTC timestamp>.sqlite`.
- The source and backups are ignored by Git.
- Backup completion requires SQLite backup success, `integrity_check`, and a readable migration row.
- Restore procedure: stop the app/sync writer, retain the damaged file for investigation, copy the selected backup to `DATABASE_PATH`, start the app, and verify the badge/count plus `integrity_check`.
- RPO: last successful manual backup. RTO target: 15 minutes for this local demo.
- Incremental backup is intentionally omitted because the current database is small and a full online backup is simpler to verify.

## Security

The stored fields are public tourism records. `.env.local`, database files, WAL/SHM files, and backups are not committed. SQL uses prepared statements for values. Table identifiers are internal constants. Errors are truncated in the ledger and must not include credentials or constructed API URLs.

## Migration and rollback

Migrations `001_initial_snapshot_store` and `002_catalog_completeness_metadata` are applied transactionally and recorded once. Migration 2 adds source totals, upstream modification tokens, and explicit `fetched | not-fetched | failed` pet-detail status without rewriting migration 1. Phase 2 enrichment migrations (v4–v7) and Phase 2E traffic migrations (v8–v9) are additive — no existing column or constraint is altered. The application never runs destructive rollback automatically. Runtime rollback is `DATA_PROVIDER=fixture` or `tour-api`; retain the SQLite file until an operator deliberately archives or removes it.

### Phase 2E traffic tables (proposed)

#### Migration 8 — `traffic_cctv_catalog`

```sql
CREATE TABLE traffic_cctv (
  snapshot_id    INTEGER NOT NULL REFERENCES source_snapshots(id),
  cctv_id        TEXT NOT NULL,
  name           TEXT NOT NULL,
  latitude       REAL,
  longitude      REAL,
  route_name     TEXT,
  direction      TEXT,
  provider       TEXT NOT NULL CHECK (provider IN ('molit', 'utic')),
  ingested_at    TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, cctv_id)
);
CREATE INDEX idx_traffic_cctv_coords ON traffic_cctv(latitude, longitude);
CREATE INDEX idx_traffic_cctv_route ON traffic_cctv(route_name);
```

#### Migration 9 — `traffic_conditions`

```sql
CREATE TABLE traffic_conditions (
  snapshot_id     INTEGER NOT NULL REFERENCES source_snapshots(id),
  condition_id    TEXT NOT NULL,
  condition_type  TEXT NOT NULL CHECK (condition_type IN ('congestion', 'speed', 'weather', 'closure')),
  route_ref       TEXT NOT NULL,
  direction       TEXT,
  value           TEXT NOT NULL,
  observation_time TEXT NOT NULL,
  source_provider TEXT NOT NULL,
  fetched_at      TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, condition_id)
);
CREATE INDEX idx_traffic_conditions_route ON traffic_conditions(route_ref);
CREATE INDEX idx_traffic_conditions_time ON traffic_conditions(observation_time);
```

Both tables follow the same append-only snapshot publication pattern as tourism data. CCTV stream URLs are not persisted — they are resolved on demand through the server proxy with a short TTL. Real-time traffic conditions are fetched per course request and must not be served stale across sessions.

## Verified evidence

On 2026-07-18, official sync run 8 published snapshot 3 containing 9,764 places with source total 9,764. It retained or fetched 1,000 pet-detail records, marked 8,764 as not fetched, and recorded zero failed details. Direct SQLite inspection returned `integrity_check=ok`. Real-file tests cover migration-1 upgrade, validated round-trip, append-only latest selection, failed-sync preservation, invalid-publication rollback, and online-backup reopen.

The 1,000 fetched rows are a partial checkpoint, not the upstream catalog limit. `TOUR_API_DETAIL_LIMIT` is an atomic checkpoint size (50 locally), while `TOUR_API_SYNC_BATCHES` permits 14 checkpoints per invocation and `TOUR_API_REQUEST_LIMIT` hard-caps all list/detail calls at 900. Requests start at least 1.2 seconds apart; a transient HTTP 429 waits 5 seconds and retries once, while provider quota code 22 remains fatal. The CLI stops on completion or no progress. A fatal quota response aborts only the current unpublished checkpoint, so it cannot overwrite the previous checkpoint. The official development allowance is 1,000 requests per day; completing all 9,764 details in one maintenance window requires an approved operating-account traffic increase.

After that increase is approved, `npm run db:sync:all` first runs the verified SQLite backup command, then overrides only the synchronization controls to 900 details per checkpoint, 20 checkpoints, 10 detail workers, a 20,000-request local budget, and 50 ms request pacing. The same append-only checkpoint and fatal-quota guarantees apply, and the loop stops as soon as fetched coverage equals the source total.

Without an operating-account increase, run `npm run db:sync:daily` after each daily allowance reset. It creates the same verified backup and performs one 900-detail checkpoint with a 999-request local ceiling, leaving room for the ten base-list requests. Starting from 1,000 fetched details, ten successful daily runs are sufficient to reach the 9,764-row source total.
