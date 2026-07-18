export type Migration = {
  version: number;
  name: string;
  up: string;
  down: string;
};

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: "initial_snapshot_store",
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE source_snapshots (
        id INTEGER PRIMARY KEY,
        provider TEXT NOT NULL CHECK (provider IN ('fixture', 'tour-api')),
        fetched_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        checksum_sha256 TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE sync_runs (
        id INTEGER PRIMARY KEY,
        provider TEXT NOT NULL CHECK (provider IN ('fixture', 'tour-api')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
        started_at TEXT NOT NULL,
        finished_at TEXT,
        snapshot_id INTEGER REFERENCES source_snapshots(id),
        error_message TEXT
      ) STRICT;

      CREATE TABLE places (
        snapshot_id INTEGER NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        place_id TEXT NOT NULL,
        name TEXT NOT NULL CHECK (length(name) > 0),
        category TEXT NOT NULL CHECK (category IN ('attraction', 'restaurant', 'cafe', 'accommodation', 'shopping')),
        address TEXT NOT NULL CHECK (length(address) > 0),
        latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        policy_label TEXT NOT NULL,
        policy_source_text TEXT NOT NULL,
        policy_source_url TEXT NOT NULL,
        policy_observed_at TEXT NOT NULL,
        PRIMARY KEY (snapshot_id, place_id)
      ) STRICT;

      CREATE TABLE place_amenities (
        snapshot_id INTEGER NOT NULL,
        place_id TEXT NOT NULL,
        amenity TEXT NOT NULL CHECK (length(amenity) > 0),
        PRIMARY KEY (snapshot_id, place_id, amenity),
        FOREIGN KEY (snapshot_id, place_id) REFERENCES places(snapshot_id, place_id) ON DELETE CASCADE
      ) STRICT;

      CREATE TABLE auxiliary_places (
        snapshot_id INTEGER NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        place_id TEXT NOT NULL,
        name TEXT NOT NULL CHECK (length(name) > 0),
        category TEXT NOT NULL CHECK (category IN ('museum', 'park', 'parking', 'veterinary', 'toilet')),
        address TEXT NOT NULL CHECK (length(address) > 0),
        latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        pet_status TEXT NOT NULL CHECK (pet_status IN ('confirmed', 'unknown')),
        evidence_label TEXT NOT NULL,
        evidence_source_text TEXT NOT NULL,
        evidence_source_url TEXT NOT NULL,
        evidence_observed_at TEXT NOT NULL,
        PRIMARY KEY (snapshot_id, place_id)
      ) STRICT;

      CREATE INDEX idx_sync_runs_latest_success ON sync_runs(status, finished_at DESC, id DESC);
      CREATE INDEX idx_places_snapshot ON places(snapshot_id, place_id);
      CREATE INDEX idx_auxiliary_places_snapshot ON auxiliary_places(snapshot_id, place_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_auxiliary_places_snapshot;
      DROP INDEX IF EXISTS idx_places_snapshot;
      DROP INDEX IF EXISTS idx_sync_runs_latest_success;
      DROP TABLE IF EXISTS auxiliary_places;
      DROP TABLE IF EXISTS place_amenities;
      DROP TABLE IF EXISTS places;
      DROP TABLE IF EXISTS sync_runs;
      DROP TABLE IF EXISTS source_snapshots;
      DROP TABLE IF EXISTS schema_migrations;
    `,
  },
  {
    version: 2,
    name: "catalog_completeness_metadata",
    up: `
      ALTER TABLE source_snapshots ADD COLUMN source_total_count INTEGER NOT NULL DEFAULT 0 CHECK (source_total_count >= 0);
      ALTER TABLE places ADD COLUMN source_modified_at TEXT;
      ALTER TABLE places ADD COLUMN pet_detail_status TEXT NOT NULL DEFAULT 'fetched' CHECK (pet_detail_status IN ('fetched', 'not-fetched', 'failed'));
      UPDATE source_snapshots
      SET source_total_count = (SELECT count(*) FROM places WHERE places.snapshot_id = source_snapshots.id)
      WHERE source_total_count = 0;
    `,
    down: `
      ALTER TABLE places DROP COLUMN pet_detail_status;
      ALTER TABLE places DROP COLUMN source_modified_at;
      ALTER TABLE source_snapshots DROP COLUMN source_total_count;
    `,
  },
];
