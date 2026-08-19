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
  {
    version: 3,
    name: "owner_portal",
    up: `
      CREATE TABLE owner_users (
        id TEXT PRIMARY KEY,
        google_subject TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        role TEXT NOT NULL CHECK (role IN ('traveler', 'pending_owner', 'owner', 'admin')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE owner_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES owner_users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE place_claims (
        id TEXT PRIMARY KEY,
        place_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES owner_users(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        business_phone TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        reviewed_at TEXT,
        UNIQUE (place_id, user_id)
      ) STRICT;

      CREATE TABLE place_closures (
        id TEXT PRIMARY KEY,
        place_id TEXT NOT NULL,
        owner_user_id TEXT NOT NULL REFERENCES owner_users(id) ON DELETE CASCADE,
        closure_kind TEXT NOT NULL CHECK (closure_kind IN ('weekly', 'date')),
        weekday INTEGER CHECK (weekday IS NULL OR weekday BETWEEN 0 AND 6),
        closure_date TEXT,
        reason TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (
          (closure_kind = 'weekly' AND weekday IS NOT NULL AND closure_date IS NULL)
          OR (closure_kind = 'date' AND weekday IS NULL AND closure_date IS NOT NULL)
        )
      ) STRICT;

      CREATE INDEX idx_owner_sessions_expiry ON owner_sessions(expires_at);
      CREATE INDEX idx_place_claims_user ON place_claims(user_id, status);
      CREATE INDEX idx_place_claims_place ON place_claims(place_id, status);
      CREATE INDEX idx_place_closures_place ON place_closures(place_id, active, closure_kind);
    `,
    down: `
      DROP INDEX IF EXISTS idx_place_closures_place;
      DROP INDEX IF EXISTS idx_place_claims_place;
      DROP INDEX IF EXISTS idx_place_claims_user;
      DROP INDEX IF EXISTS idx_owner_sessions_expiry;
      DROP TABLE IF EXISTS place_closures;
      DROP TABLE IF EXISTS place_claims;
      DROP TABLE IF EXISTS owner_sessions;
      DROP TABLE IF EXISTS owner_users;
    `,
  },
  {
    version: 4,
    name: "accessibility_enrichment",
    up: `
      CREATE TABLE place_accessibility (
        place_id TEXT NOT NULL,
        snapshot_id INTEGER NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        fetched_at TEXT NOT NULL,
        -- 지체장애
        parking TEXT,
        publictransport TEXT,
        route TEXT,
        ticketoffice TEXT,
        promotion TEXT,
        wheelchair TEXT,
        exit TEXT,
        elevator TEXT,
        restroom TEXT,
        auditorium TEXT,
        room TEXT,
        handicapetc TEXT,
        -- 시각장애
        braileblock TEXT,
        helpdog TEXT,
        guidehuman TEXT,
        audioguide TEXT,
        bigprint TEXT,
        brailepromotion TEXT,
        guidesystem TEXT,
        blindhandicapetc TEXT,
        -- 청각장애
        signguide TEXT,
        videoguide TEXT,
        hearingroom TEXT,
        hearinghandicapetc TEXT,
        -- 영유아가족
        stroller TEXT,
        lactationroom TEXT,
        babysparechair TEXT,
        infantsfamilyetc TEXT,
        PRIMARY KEY (place_id, snapshot_id)
      ) STRICT;

      CREATE INDEX idx_place_accessibility_place ON place_accessibility(place_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_place_accessibility_place;
      DROP TABLE IF EXISTS place_accessibility;
    `,
  },
  {
    version: 5,
    name: "camping_catalog",
    up: `
      CREATE TABLE place_camping (
        place_id TEXT NOT NULL,
        snapshot_id INTEGER NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        fetched_at TEXT NOT NULL,
        animal_cmg_cl TEXT,
        induty TEXT,
        sbrs_cl TEXT,
        glamp_site_co INTEGER,
        carav_site_co INTEGER,
        gnrl_site_co INTEGER,
        oper_pd_cl TEXT,
        oper_de_cl TEXT,
        resve_url TEXT,
        first_image_url TEXT,
        PRIMARY KEY (place_id, snapshot_id)
      ) STRICT;

      CREATE INDEX idx_place_camping_place ON place_camping(place_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_place_camping_place;
      DROP TABLE IF EXISTS place_camping;
    `,
  },
  {
    version: 6,
    name: "trail_catalog",
    up: `
      CREATE TABLE trails (
        crs_idx TEXT PRIMARY KEY,
        route_idx TEXT NOT NULL,
        crs_kor_nm TEXT NOT NULL,
        theme_nm TEXT,
        linemsg TEXT,
        crs_dstnc REAL,
        crs_totl_rqrm_hour INTEGER,
        crs_level INTEGER,
        crs_cycle TEXT,
        sigun TEXT,
        brd_div TEXT,
        gpxpath TEXT,
        crs_summary TEXT,
        crs_tour_info TEXT,
        travelerinfo TEXT,
        fetched_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX idx_trails_sigun ON trails(sigun);
      CREATE INDEX idx_trails_route ON trails(route_idx);
      CREATE INDEX idx_trails_level ON trails(crs_level);
    `,
    down: `
      DROP INDEX IF EXISTS idx_trails_level;
      DROP INDEX IF EXISTS idx_trails_route;
      DROP INDEX IF EXISTS idx_trails_sigun;
      DROP TABLE IF EXISTS trails;
    `,
  },
  {
    version: 7,
    name: "congestion_forecast",
    up: `
      CREATE TABLE place_congestion (
        place_id TEXT NOT NULL,
        snapshot_id INTEGER NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        fetched_at TEXT NOT NULL,
        t_ats_nm TEXT NOT NULL,
        area_cd TEXT,
        area_nm TEXT,
        signgu_cd TEXT,
        signgu_nm TEXT,
        base_ymd TEXT NOT NULL,
        cnctr_rate REAL NOT NULL,
        PRIMARY KEY (place_id, snapshot_id, base_ymd)
      ) STRICT;

      CREATE INDEX idx_place_congestion_place ON place_congestion(place_id);
      CREATE INDEX idx_place_congestion_region ON place_congestion(area_cd, signgu_cd);
    `,
    down: `
      DROP INDEX IF EXISTS idx_place_congestion_region;
      DROP INDEX IF EXISTS idx_place_congestion_place;
      DROP TABLE IF EXISTS place_congestion;
    `,
  },
  {
    version: 8,
    name: "multilingual_translations",
    up: `
      CREATE TABLE place_translations (
        place_id TEXT NOT NULL,
        snapshot_id INTEGER NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        language TEXT NOT NULL CHECK (language IN ('en', 'zh')),
        title TEXT,
        address TEXT,
        overview TEXT,
        fetched_at TEXT NOT NULL,
        PRIMARY KEY (place_id, snapshot_id, language)
      ) STRICT;

      CREATE INDEX idx_place_translations_place ON place_translations(place_id);
      CREATE INDEX idx_place_translations_language ON place_translations(language);
    `,
    down: `
      DROP INDEX IF EXISTS idx_place_translations_language;
      DROP INDEX IF EXISTS idx_place_translations_place;
      DROP TABLE IF EXISTS place_translations;
    `,
  },
  {
    version: 9,
    name: "rural_tourism_catalog",
    up: `
      CREATE TABLE experience_villages (
        village_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sido TEXT,
        sigungu TEXT,
        village_kind TEXT NOT NULL CHECK (village_kind IN ('farm', 'fishing')),
        address_road TEXT,
        address_jibun TEXT,
        phone TEXT,
        homepage TEXT,
        designated_at TEXT,
        facility_info TEXT,
        photo_url TEXT,
        latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        provider_org TEXT,
        data_reference_date TEXT,
        fetched_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX idx_experience_villages_sido ON experience_villages(sido);
      CREATE INDEX idx_experience_villages_sigungu ON experience_villages(sigungu);
      CREATE INDEX idx_experience_villages_kind ON experience_villages(village_kind);

      CREATE TABLE village_programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        village_id TEXT NOT NULL REFERENCES experience_villages(village_id) ON DELETE CASCADE,
        program_class TEXT NOT NULL,
        program_name TEXT NOT NULL
      ) STRICT;

      CREATE INDEX idx_village_programs_village ON village_programs(village_id);
      CREATE INDEX idx_village_programs_class ON village_programs(program_class);

      CREATE TABLE farmstays (
        farmstay_id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        permit_date TEXT,
        address TEXT,
        status_code TEXT,
        status_name TEXT,
        sigungu_code TEXT,
        latitude REAL,
        longitude REAL,
        raw_coord_x REAL,
        raw_coord_y REAL,
        fetched_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX idx_farmstays_sigungu ON farmstays(sigungu_code);
      CREATE INDEX idx_farmstays_status ON farmstays(status_code);
    `,
    down: `
      DROP INDEX IF EXISTS idx_farmstays_status;
      DROP INDEX IF EXISTS idx_farmstays_sigungu;
      DROP TABLE IF EXISTS farmstays;
      DROP INDEX IF EXISTS idx_village_programs_class;
      DROP INDEX IF EXISTS idx_village_programs_village;
      DROP TABLE IF EXISTS village_programs;
      DROP INDEX IF EXISTS idx_experience_villages_kind;
      DROP INDEX IF EXISTS idx_experience_villages_sigungu;
      DROP INDEX IF EXISTS idx_experience_villages_sido;
      DROP TABLE IF EXISTS experience_villages;
    `,
  },
  {
    version: 10,
    name: "farmstay_pet_policy_inheritance",
    up: `
      CREATE TABLE farmstay_pet_policies (
        farmstay_id TEXT PRIMARY KEY REFERENCES farmstays(farmstay_id) ON DELETE CASCADE,
        place_id TEXT NOT NULL,
        place_name TEXT NOT NULL,
        distance_meters INTEGER NOT NULL,
        source_text TEXT NOT NULL,
        source_url TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        matched_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX idx_farmstay_pet_policies_place ON farmstay_pet_policies(place_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_farmstay_pet_policies_place;
      DROP TABLE IF EXISTS farmstay_pet_policies;
    `,
  },
];
