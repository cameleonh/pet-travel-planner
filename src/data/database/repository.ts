import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { providerSnapshotSchema, type ProviderSnapshot } from "@/data/contracts";
import { migrations } from "@/data/database/schema";
import type { VillageRecord } from "@/data/providers/village-provider";

export type FarmstayRecord = {
  farmstay_id: string;
  business_name: string;
  permit_date: string | null;
  address: string | null;
  status_code: string | null;
  status_name: string | null;
  sigungu_code: string | null;
  latitude: number | null;
  longitude: number | null;
  raw_coord_x: number | null;
  raw_coord_y: number | null;
};

export function applyMigrations(db: Database.Database): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT");
  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((row) => (row as { version: number }).version),
  );
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    db.transaction(() => {
      db.exec(migration.up);
      db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    })();
  }
}

type PlaceRow = {
  place_id: string;
  name: string;
  category: ProviderSnapshot["places"][number]["category"];
  address: string;
  latitude: number;
  longitude: number;
  policy_label: string;
  policy_source_text: string;
  policy_source_url: string;
  policy_observed_at: string;
  source_modified_at: string | null;
  pet_detail_status: "fetched" | "not-fetched" | "failed";
};

type AuxiliaryRow = {
  place_id: string;
  name: string;
  category: ProviderSnapshot["auxiliaryPlaces"][number]["category"];
  address: string;
  latitude: number;
  longitude: number;
  pet_status: ProviderSnapshot["auxiliaryPlaces"][number]["petStatus"];
  evidence_label: string;
  evidence_source_text: string;
  evidence_source_url: string;
  evidence_observed_at: string;
  phone: string | null;
  weekday_hours: string | null;
  saturday_hours: string | null;
  sunday_hours: string | null;
  closing_day: string | null;
  usage_fee: string | null;
};

export type DatabaseCounts = {
  successfulRuns: number;
  snapshots: number;
  places: number;
  auxiliaryPlaces: number;
};

export function resolveDatabasePath(path = process.env.DATABASE_PATH): string {
  return resolve(/* turbopackIgnore: true */ path?.trim() || ".data/pet-travel.sqlite");
}

const ACCESSIBILITY_METADATA_KEYS = new Set(["place_id", "snapshot_id", "fetched_at"]);

function stripAccessibilityMetadata(row: Record<string, unknown>): Record<string, string | undefined> {
  const detail: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(row)) {
    if (ACCESSIBILITY_METADATA_KEYS.has(key)) continue;
    detail[key] = typeof value === "string" ? value : undefined;
  }
  return detail;
}

export class SqlitePlaceRepository {
  readonly path: string;
  private readonly db: Database.Database;

  constructor(path = resolveDatabasePath()) {
    this.path = path === ":memory:" ? path : resolve(/* turbopackIgnore: true */ path);
    if (this.path !== ":memory:") mkdirSync(dirname(this.path), { recursive: true });
    this.db = new Database(this.path);
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    if (this.path !== ":memory:") this.db.pragma("journal_mode = WAL");
    this.applyMigrations();
  }

  private applyMigrations(): void {
    applyMigrations(this.db);
  }

  startSync(provider: ProviderSnapshot["provider"]): number {
    const result = this.db.prepare(
      "INSERT INTO sync_runs (provider, status, started_at) VALUES (?, 'pending', ?)",
    ).run(provider, new Date().toISOString());
    return Number(result.lastInsertRowid);
  }

  failSync(runId: number, error: unknown): void {
    const message = error instanceof Error ? error.message : "Unknown synchronization error";
    this.db.prepare(
      "UPDATE sync_runs SET status = 'failed', finished_at = ?, error_message = ? WHERE id = ? AND status = 'pending'",
    ).run(new Date().toISOString(), message.slice(0, 1000), runId);
  }

  publishSnapshot(runId: number, input: ProviderSnapshot): number {
    const snapshot = providerSnapshotSchema.parse(input);
    const payload = JSON.stringify(snapshot);
    const checksum = createHash("sha256").update(payload).digest("hex");

    return this.db.transaction(() => {
      const snapshotResult = this.db.prepare(
        "INSERT INTO source_snapshots (provider, fetched_at, payload_json, checksum_sha256, created_at, source_total_count) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(snapshot.provider, snapshot.fetchedAt, payload, checksum, new Date().toISOString(), snapshot.sourceTotalCount ?? snapshot.places.length);
      const snapshotId = Number(snapshotResult.lastInsertRowid);

      const insertPlace = this.db.prepare(`
        INSERT INTO places (
          snapshot_id, place_id, name, category, address, latitude, longitude,
          policy_label, policy_source_text, policy_source_url, policy_observed_at,
          source_modified_at, pet_detail_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertAmenity = this.db.prepare(
        "INSERT INTO place_amenities (snapshot_id, place_id, amenity) VALUES (?, ?, ?)",
      );
      for (const place of snapshot.places) {
        insertPlace.run(
          snapshotId, place.id, place.name, place.category, place.address,
          place.coordinates.latitude, place.coordinates.longitude,
          place.petPolicy.label, place.petPolicy.sourceText, place.petPolicy.sourceUrl, place.petPolicy.observedAt,
          place.sourceModifiedAt ?? null, place.petDetailStatus ?? "fetched",
        );
        for (const amenity of new Set(place.amenities)) insertAmenity.run(snapshotId, place.id, amenity);
      }

      const insertAuxiliary = this.db.prepare(`
        INSERT INTO auxiliary_places (
          snapshot_id, place_id, name, category, address, latitude, longitude, pet_status,
          evidence_label, evidence_source_text, evidence_source_url, evidence_observed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const place of snapshot.auxiliaryPlaces) {
        insertAuxiliary.run(
          snapshotId, place.id, place.name, place.category, place.address,
          place.coordinates.latitude, place.coordinates.longitude, place.petStatus,
          place.evidence.label, place.evidence.sourceText, place.evidence.sourceUrl, place.evidence.observedAt,
        );
      }

      const completion = this.db.prepare(`
        UPDATE sync_runs
        SET status = 'success', finished_at = ?, snapshot_id = ?, error_message = NULL
        WHERE id = ? AND status = 'pending' AND provider = ?
      `).run(new Date().toISOString(), snapshotId, runId, snapshot.provider);
      if (completion.changes !== 1) throw new Error(`Pending sync run ${runId} was not found for ${snapshot.provider}.`);
      return snapshotId;
    })();
  }

  latestSuccessfulSnapshotId(): number | null {
    const row = this.db.prepare(`
      SELECT s.id AS id
      FROM sync_runs r
      JOIN source_snapshots s ON s.id = r.snapshot_id
      WHERE r.status = 'success'
      ORDER BY r.finished_at DESC, r.id DESC
      LIMIT 1
    `).get() as { id: number } | undefined;
    return row?.id ?? null;
  }

  // 경기 반려동물 시설 등 외부 보조 데이터를 기존 스냅샷에 반영. gg-pet:% 행만
  // 교체하므로 tour-api 동기화로 새 스냅샷이 발행되면 재실행이 필요하다.
  replaceGyeonggiAuxiliary(snapshotId: number, places: ProviderSnapshot["auxiliaryPlaces"]): number {
    return this.db.transaction(() => {
      this.db.prepare("DELETE FROM auxiliary_places WHERE snapshot_id = ? AND place_id LIKE 'gg-pet:%'").run(snapshotId);
      const insertAuxiliary = this.db.prepare(`
        INSERT INTO auxiliary_places (
          snapshot_id, place_id, name, category, address, latitude, longitude, pet_status,
          evidence_label, evidence_source_text, evidence_source_url, evidence_observed_at,
          phone, weekday_hours, saturday_hours, sunday_hours, closing_day, usage_fee
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const place of places) {
        insertAuxiliary.run(
          snapshotId, place.id, place.name, place.category, place.address,
          place.coordinates.latitude, place.coordinates.longitude, place.petStatus,
          place.evidence.label, place.evidence.sourceText, place.evidence.sourceUrl, place.evidence.observedAt,
          place.phone ?? null, place.weekdayHours ?? null, place.saturdayHours ?? null,
          place.sundayHours ?? null, place.closingDay ?? null, place.usageFee ?? null,
        );
      }
      return places.length;
    })();
  }

  loadLatestSnapshot(): ProviderSnapshot | null {
    const latest = this.db.prepare(`
      SELECT s.id, s.provider, s.fetched_at, s.source_total_count, s.checksum_sha256
      FROM sync_runs r
      JOIN source_snapshots s ON s.id = r.snapshot_id
      WHERE r.status = 'success'
      ORDER BY r.finished_at DESC, r.id DESC
      LIMIT 1
    `).get() as { id: number; provider: ProviderSnapshot["provider"]; fetched_at: string; source_total_count: number; checksum_sha256: string | null } | undefined;
    if (!latest) return null;

    const placeRows = this.db.prepare(`
      SELECT place_id, name, category, address, latitude, longitude,
             policy_label, policy_source_text, policy_source_url, policy_observed_at,
             source_modified_at, pet_detail_status
      FROM places WHERE snapshot_id = ? ORDER BY rowid
    `).all(latest.id) as PlaceRow[];
    const amenities = this.db.prepare(
      "SELECT place_id, amenity FROM place_amenities WHERE snapshot_id = ? ORDER BY rowid",
    ).all(latest.id) as { place_id: string; amenity: string }[];
    const amenitiesByPlace = Map.groupBy(amenities, (row) => row.place_id);
    const auxiliaryRows = this.db.prepare(`
      SELECT place_id, name, category, address, latitude, longitude, pet_status,
             evidence_label, evidence_source_text, evidence_source_url, evidence_observed_at,
             phone, weekday_hours, saturday_hours, sunday_hours, closing_day, usage_fee
      FROM auxiliary_places WHERE snapshot_id = ? ORDER BY rowid
    `).all(latest.id) as AuxiliaryRow[];

    return providerSnapshotSchema.parse({
      provider: latest.provider,
      fetchedAt: latest.fetched_at,
      sourceTotalCount: latest.source_total_count,
      snapshotId: latest.id,
      checksum: latest.checksum_sha256 ?? undefined,
      places: placeRows.map((row) => ({
        id: row.place_id,
        name: row.name,
        category: row.category,
        address: row.address,
        coordinates: { latitude: row.latitude, longitude: row.longitude },
        petPolicy: {
          label: row.policy_label,
          sourceText: row.policy_source_text,
          sourceUrl: row.policy_source_url,
          observedAt: row.policy_observed_at,
        },
        amenities: (amenitiesByPlace.get(row.place_id) ?? []).map((item) => item.amenity),
        sourceModifiedAt: row.source_modified_at,
        petDetailStatus: row.pet_detail_status,
      })),
      auxiliaryPlaces: auxiliaryRows.map((row) => ({
        id: row.place_id,
        name: row.name,
        category: row.category,
        address: row.address,
        coordinates: { latitude: row.latitude, longitude: row.longitude },
        petStatus: row.pet_status,
        evidence: {
          label: row.evidence_label,
          sourceText: row.evidence_source_text,
          sourceUrl: row.evidence_source_url,
          observedAt: row.evidence_observed_at,
        },
        ...(row.phone ? { phone: row.phone } : {}),
        ...(row.weekday_hours ? { weekdayHours: row.weekday_hours } : {}),
        ...(row.saturday_hours ? { saturdayHours: row.saturday_hours } : {}),
        ...(row.sunday_hours ? { sundayHours: row.sunday_hours } : {}),
        ...(row.closing_day ? { closingDay: row.closing_day } : {}),
        ...(row.usage_fee ? { usageFee: row.usage_fee } : {}),
      })),
    });
  }

  getCounts(): DatabaseCounts {
    const count = (table: string, where = "") => Number((this.db.prepare(`SELECT count(*) AS count FROM ${table} ${where}`).get() as { count: number }).count);
    return {
      successfulRuns: count("sync_runs", "WHERE status = 'success'"),
      snapshots: count("source_snapshots"),
      places: count("places"),
      auxiliaryPlaces: count("auxiliary_places"),
    };
  }

  getMigrationVersions(): number[] {
    return this.db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((row) => (row as { version: number }).version);
  }

  async backup(destination: string): Promise<void> {
    if (this.path === ":memory:" || !existsSync(this.path)) throw new Error("A file-backed source database is required for backup.");
    const target = resolve(destination);
    mkdirSync(dirname(target), { recursive: true });
    await this.db.backup(target);
    const verification = new Database(target, { readonly: true });
    try {
      const integrity = verification.pragma("integrity_check", { simple: true });
      if (integrity !== "ok") throw new Error(`Backup integrity check failed: ${String(integrity)}`);
      verification.prepare("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1").get();
    } finally {
      verification.close();
    }
  }

  close(): void {
    this.db.close();
  }

  saveAccessibility(snapshotId: number, placeId: string, fetchedAt: string, detail: Record<string, string | undefined>): void {
    const columns = ["place_id", "snapshot_id", "fetched_at", ...Object.keys(detail)];
    const placeholders = columns.map(() => "?").join(", ");
    const values = [placeId, snapshotId, fetchedAt, ...Object.values(detail)];
    this.db.prepare(
      `INSERT OR REPLACE INTO place_accessibility (${columns.join(", ")}) VALUES (${placeholders})`,
    ).run(...values);
  }

  loadAccessibility(placeId: string): Record<string, string | undefined> | null {
    const row = this.db.prepare(
      `SELECT * FROM place_accessibility WHERE place_id = ? ORDER BY snapshot_id DESC LIMIT 1`,
    ).get(placeId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return stripAccessibilityMetadata(row);
  }

  loadAccessibilityBatch(placeIds: string[]): Record<string, Record<string, string | undefined>> {
    if (placeIds.length === 0) return {};
    const placeholders = placeIds.map(() => "?").join(", ");
    const rows = this.db.prepare(
      `SELECT pa.* FROM place_accessibility pa
       INNER JOIN (
         SELECT place_id, MAX(snapshot_id) AS max_snapshot_id
         FROM place_accessibility
         WHERE place_id IN (${placeholders})
         GROUP BY place_id
       ) latest ON pa.place_id = latest.place_id AND pa.snapshot_id = latest.max_snapshot_id`,
    ).all(...placeIds) as Record<string, unknown>[];
    const result: Record<string, Record<string, string | undefined>> = {};
    for (const row of rows) {
      result[row.place_id as string] = stripAccessibilityMetadata(row);
    }
    return result;
  }

  getAccessibilityCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM place_accessibility").get() as { count: number };
    return result.count;
  }

  // Only rows with at least one stored field exist in this table, so every
  // distinct place_id is a place with verified accessibility detail.
  listAccessiblePlaceIds(): string[] {
    const rows = this.db.prepare("SELECT DISTINCT place_id AS placeId FROM place_accessibility").all() as { placeId: string }[];
    return rows.map((row) => row.placeId);
  }

  getLatestSnapshotId(): number | null {
    const row = this.db.prepare(
      `SELECT s.id FROM sync_runs r JOIN source_snapshots s ON s.id = r.snapshot_id WHERE r.status = 'success' ORDER BY r.finished_at DESC, r.id DESC LIMIT 1`,
    ).get() as { id: number } | undefined;
    return row?.id ?? null;
  }

  saveCamping(snapshotId: number, placeId: string, fetchedAt: string, detail: {
    animal_cmg_cl?: string; induty?: string; sbrs_cl?: string;
    glamp_site_co?: number; carav_site_co?: number; gnrl_site_co?: number;
    oper_pd_cl?: string; oper_de_cl?: string; resve_url?: string; first_image_url?: string;
  }): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO place_camping (place_id, snapshot_id, fetched_at, animal_cmg_cl, induty, sbrs_cl, glamp_site_co, carav_site_co, gnrl_site_co, oper_pd_cl, oper_de_cl, resve_url, first_image_url)
       VALUES (@place_id, @snapshot_id, @fetched_at, @animal_cmg_cl, @induty, @sbrs_cl, @glamp_site_co, @carav_site_co, @gnrl_site_co, @oper_pd_cl, @oper_de_cl, @resve_url, @first_image_url)`,
    ).run({ place_id: placeId, snapshot_id: snapshotId, fetched_at: fetchedAt, ...detail });
  }

  loadCamping(placeId: string): Record<string, unknown> | null {
    const row = this.db.prepare(
      `SELECT * FROM place_camping WHERE place_id = ? ORDER BY snapshot_id DESC LIMIT 1`,
    ).get(placeId) as Record<string, unknown> | undefined;
    return row ?? null;
  }

  loadCampingBatch(placeIds: string[]): Record<string, Record<string, unknown>> {
    if (placeIds.length === 0) return {};
    const placeholders = placeIds.map(() => "?").join(", ");
    const rows = this.db.prepare(
      `SELECT pc.* FROM place_camping pc
       INNER JOIN (
         SELECT place_id, MAX(snapshot_id) AS max_snapshot_id
         FROM place_camping
         WHERE place_id IN (${placeholders})
         GROUP BY place_id
       ) latest ON pc.place_id = latest.place_id AND pc.snapshot_id = latest.max_snapshot_id`,
    ).all(...placeIds) as Record<string, unknown>[];
    const result: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      result[row.place_id as string] = row;
    }
    return result;
  }

  getCampingCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM place_camping").get() as { count: number };
    return result.count;
  }

  saveTrail(trail: {
    crs_idx: string; route_idx: string; crs_kor_nm: string;
    theme_nm: string | null; linemsg: string | null;
    crs_dstnc: number | null; crs_totl_rqrm_hour: number | null;
    crs_level: number | null; crs_cycle: string | null;
    sigun: string | null; brd_div: string | null; gpxpath: string | null;
    crs_summary: string | null; crs_tour_info: string | null; travelerinfo: string | null;
  }, fetchedAt: string): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO trails (crs_idx, route_idx, crs_kor_nm, theme_nm, linemsg, crs_dstnc, crs_totl_rqrm_hour, crs_level, crs_cycle, sigun, brd_div, gpxpath, crs_summary, crs_tour_info, travelerinfo, fetched_at)
       VALUES (@crs_idx, @route_idx, @crs_kor_nm, @theme_nm, @linemsg, @crs_dstnc, @crs_totl_rqrm_hour, @crs_level, @crs_cycle, @sigun, @brd_div, @gpxpath, @crs_summary, @crs_tour_info, @travelerinfo, @fetched_at)`,
    ).run({ ...trail, fetched_at: fetchedAt });
  }

  loadTrailsByRegion(sigun: string): Record<string, unknown>[] {
    return this.db.prepare(
      `SELECT * FROM trails WHERE sigun LIKE '%' || ? || '%' ORDER BY crs_level, crs_dstnc`,
    ).all(sigun) as Record<string, unknown>[];
  }

  getTrailCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM trails").get() as { count: number };
    return result.count;
  }

  saveCongestion(snapshotId: number, placeId: string, fetchedAt: string, forecast: {
    t_ats_nm: string; area_cd: string | null; area_nm: string | null;
    signgu_cd: string | null; signgu_nm: string | null;
    base_ymd: string; cnctr_rate: number;
  }): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO place_congestion (place_id, snapshot_id, fetched_at, t_ats_nm, area_cd, area_nm, signgu_cd, signgu_nm, base_ymd, cnctr_rate)
       VALUES (@place_id, @snapshot_id, @fetched_at, @t_ats_nm, @area_cd, @area_nm, @signgu_cd, @signgu_nm, @base_ymd, @cnctr_rate)`,
    ).run({ place_id: placeId, snapshot_id: snapshotId, fetched_at: fetchedAt, ...forecast });
  }

  loadCongestion(placeId: string): { t_ats_nm: string; forecasts: { base_ymd: string; cnctr_rate: number }[] } | null {
    const rows = this.db.prepare(
      `SELECT base_ymd, cnctr_rate, t_ats_nm FROM place_congestion WHERE place_id = ? ORDER BY snapshot_id DESC, base_ymd ASC`,
    ).all(placeId) as { base_ymd: string; cnctr_rate: number; t_ats_nm: string }[];
    if (rows.length === 0) return null;
    return {
      t_ats_nm: rows[0]!.t_ats_nm,
      forecasts: rows.map((row) => ({ base_ymd: row.base_ymd, cnctr_rate: row.cnctr_rate })),
    };
  }

  loadCongestionBatch(placeIds: string[]): Record<string, { t_ats_nm: string; forecasts: { base_ymd: string; cnctr_rate: number }[] }> {
    if (placeIds.length === 0) return {};
    const placeholders = placeIds.map(() => "?").join(", ");
    const rows = this.db.prepare(
      `SELECT place_id, base_ymd, cnctr_rate, t_ats_nm FROM place_congestion
       WHERE place_id IN (${placeholders})
       ORDER BY place_id, snapshot_id DESC, base_ymd ASC`,
    ).all(...placeIds) as { place_id: string; base_ymd: string; cnctr_rate: number; t_ats_nm: string }[];
    const result: Record<string, { t_ats_nm: string; forecasts: { base_ymd: string; cnctr_rate: number }[] }> = {};
    for (const row of rows) {
      let entry = result[row.place_id];
      if (!entry) {
        entry = { t_ats_nm: row.t_ats_nm, forecasts: [] };
        result[row.place_id] = entry;
      }
      entry.forecasts.push({ base_ymd: row.base_ymd, cnctr_rate: row.cnctr_rate });
    }
    return result;
  }

  getCongestionCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM place_congestion").get() as { count: number };
    return result.count;
  }

  saveTranslation(snapshotId: number, placeId: string, language: string, fetchedAt: string, detail: {
    title: string | null; address: string | null; overview: string | null;
  }): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO place_translations (place_id, snapshot_id, language, title, address, overview, fetched_at)
       VALUES (@place_id, @snapshot_id, @language, @title, @address, @overview, @fetched_at)`,
    ).run({ place_id: placeId, snapshot_id: snapshotId, language, ...detail, fetched_at: fetchedAt });
  }

  loadTranslation(placeId: string, language: string): { title: string | null; address: string | null; overview: string | null } | null {
    const row = this.db.prepare(
      `SELECT title, address, overview FROM place_translations
       WHERE place_id = ? AND language = ?
       ORDER BY snapshot_id DESC LIMIT 1`,
    ).get(placeId, language) as { title: string | null; address: string | null; overview: string | null } | undefined;
    return row ?? null;
  }

  loadTranslationBatch(placeIds: string[], language: string): Record<string, { title: string | null; address: string | null; overview: string | null }> {
    if (placeIds.length === 0) return {};
    const placeholders = placeIds.map(() => "?").join(", ");
    const rows = this.db.prepare(
      `SELECT pt.place_id, pt.title, pt.address, pt.overview FROM place_translations pt
       INNER JOIN (
         SELECT place_id, MAX(snapshot_id) AS max_snapshot_id
         FROM place_translations
         WHERE place_id IN (${placeholders}) AND language = ?
         GROUP BY place_id
       ) latest ON pt.place_id = latest.place_id AND pt.snapshot_id = latest.max_snapshot_id
       WHERE pt.language = ?`,
    ).all(...placeIds, language, language) as { place_id: string; title: string | null; address: string | null; overview: string | null }[];
    const result: Record<string, { title: string | null; address: string | null; overview: string | null }> = {};
    for (const row of rows) {
      result[row.place_id] = { title: row.title, address: row.address, overview: row.overview };
    }
    return result;
  }

  getTranslationCount(language?: string): number {
    if (language) {
      const result = this.db.prepare(
        "SELECT COUNT(*) as count FROM place_translations WHERE language = ?",
      ).get(language) as { count: number };
      return result.count;
    }
    const result = this.db.prepare("SELECT COUNT(*) as count FROM place_translations").get() as { count: number };
    return result.count;
  }

  replaceVillages(villages: VillageRecord[], fetchedAt: string): { villages: number; programs: number } {
    const insertVillage = this.db.prepare(
      `INSERT OR REPLACE INTO experience_villages (village_id, name, sido, sigungu, village_kind, address_road, address_jibun, phone, homepage, designated_at, facility_info, photo_url, latitude, longitude, provider_org, data_reference_date, fetched_at)
       VALUES (@village_id, @name, @sido, @sigungu, @village_kind, @address_road, @address_jibun, @phone, @homepage, @designated_at, @facility_info, @photo_url, @latitude, @longitude, @provider_org, @data_reference_date, @fetched_at)`,
    );
    const insertProgram = this.db.prepare(
      `INSERT INTO village_programs (village_id, program_class, program_name) VALUES (?, ?, ?)`,
    );
    let programCount = 0;
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM village_programs").run();
      this.db.prepare("DELETE FROM experience_villages").run();
      for (const village of villages) {
        insertVillage.run({ ...village, fetched_at: fetchedAt });
        for (const program of village.programs) {
          insertProgram.run(village.village_id, program.program_class, program.program_name);
          programCount++;
        }
      }
    });
    transaction();
    return { villages: villages.length, programs: programCount };
  }

  loadVillagesByRegion(region: string): Record<string, unknown>[] {
    return this.db.prepare(
      `SELECT v.*, GROUP_CONCAT(p.program_class || ': ' || p.program_name, ' | ') AS programs
       FROM experience_villages v
       LEFT JOIN village_programs p ON p.village_id = v.village_id
       WHERE v.sido LIKE '%' || ? || '%' OR v.sigungu LIKE '%' || ? || '%'
       GROUP BY v.village_id
       ORDER BY v.sido, v.sigungu, v.name`,
    ).all(region, region) as Record<string, unknown>[];
  }

  getVillageCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM experience_villages").get() as { count: number };
    return result.count;
  }

  getVillageProgramCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM village_programs").get() as { count: number };
    return result.count;
  }

  replaceFarmstays(farmstays: FarmstayRecord[], fetchedAt: string): number {
    const insert = this.db.prepare(
      `INSERT OR REPLACE INTO farmstays (farmstay_id, business_name, permit_date, address, status_code, status_name, sigungu_code, latitude, longitude, raw_coord_x, raw_coord_y, fetched_at)
       VALUES (@farmstay_id, @business_name, @permit_date, @address, @status_code, @status_name, @sigungu_code, @latitude, @longitude, @raw_coord_x, @raw_coord_y, @fetched_at)`,
    );
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM farmstays").run();
      for (const farmstay of farmstays) {
        insert.run({ ...farmstay, fetched_at: fetchedAt });
      }
    });
    transaction();
    return farmstays.length;
  }

  loadFarmstaysByRegion(region: string): Record<string, unknown>[] {
    // Only active businesses: the catalog keeps closed (폐업) and suspended
    // (휴업) rows for history, and re-permits duplicate the same business.
    // Left join pulls inherited pet policies; NULL pet_source_text = UNKNOWN.
    return this.db.prepare(
      `SELECT f.*, p.place_name AS pet_policy_place, p.distance_meters AS pet_policy_distance,
              p.source_text AS pet_source_text, p.source_url AS pet_source_url, p.observed_at AS pet_observed_at
       FROM farmstays f
       LEFT JOIN farmstay_pet_policies p ON p.farmstay_id = f.farmstay_id
       WHERE f.status_name = '영업/정상' AND f.address LIKE '%' || ? || '%'
       ORDER BY (p.farmstay_id IS NOT NULL) DESC, f.business_name`,
    ).all(region) as Record<string, unknown>[];
  }

  getFarmstayCount(activeOnly = false): number {
    const result = activeOnly
      ? this.db.prepare("SELECT COUNT(*) as count FROM farmstays WHERE status_name = '영업/정상'").get() as { count: number }
      : this.db.prepare("SELECT COUNT(*) as count FROM farmstays").get() as { count: number };
    return result.count;
  }

  loadFarmstayCandidates(): { farmstay_id: string; business_name: string; latitude: number; longitude: number }[] {
    return this.db.prepare(
      `SELECT farmstay_id, business_name, latitude, longitude FROM farmstays
       WHERE status_name = '영업/정상' AND latitude IS NOT NULL AND longitude IS NOT NULL`,
    ).all() as { farmstay_id: string; business_name: string; latitude: number; longitude: number }[];
  }

  replaceFarmstayPetPolicies(
    rows: { farmstayId: string; placeId: string; placeName: string; distanceMeters: number; sourceText: string; sourceUrl: string; observedAt: string }[],
    matchedAt: string,
  ): number {
    const insert = this.db.prepare(
      `INSERT OR REPLACE INTO farmstay_pet_policies (farmstay_id, place_id, place_name, distance_meters, source_text, source_url, observed_at, matched_at)
       VALUES (@farmstay_id, @place_id, @place_name, @distance_meters, @source_text, @source_url, @observed_at, @matched_at)`,
    );
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM farmstay_pet_policies").run();
      for (const row of rows) {
        insert.run({
          farmstay_id: row.farmstayId,
          place_id: row.placeId,
          place_name: row.placeName,
          distance_meters: row.distanceMeters,
          source_text: row.sourceText,
          source_url: row.sourceUrl,
          observed_at: row.observedAt,
          matched_at: matchedAt,
        });
      }
    });
    transaction();
    return rows.length;
  }

  getFarmstayPetPolicyCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM farmstay_pet_policies").get() as { count: number };
    return result.count;
  }
}
