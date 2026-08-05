import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { providerSnapshotSchema, type ProviderSnapshot } from "@/data/contracts";
import { migrations } from "@/data/database/schema";

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

  loadLatestSnapshot(): ProviderSnapshot | null {
    const latest = this.db.prepare(`
      SELECT s.id, s.provider, s.fetched_at, s.source_total_count
      FROM sync_runs r
      JOIN source_snapshots s ON s.id = r.snapshot_id
      WHERE r.status = 'success'
      ORDER BY r.finished_at DESC, r.id DESC
      LIMIT 1
    `).get() as { id: number; provider: ProviderSnapshot["provider"]; fetched_at: string; source_total_count: number } | undefined;
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
             evidence_label, evidence_source_text, evidence_source_url, evidence_observed_at
      FROM auxiliary_places WHERE snapshot_id = ? ORDER BY rowid
    `).all(latest.id) as AuxiliaryRow[];

    return providerSnapshotSchema.parse({
      provider: latest.provider,
      fetchedAt: latest.fetched_at,
      sourceTotalCount: latest.source_total_count,
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
    const { place_id, snapshot_id, fetched_at, ...fields } = row;
    const result: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(fields)) {
      result[key] = typeof value === "string" ? value : undefined;
    }
    return result;
  }

  getAccessibilityCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM place_accessibility").get() as { count: number };
    return result.count;
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

  getCampingCount(): number {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM place_camping").get() as { count: number };
    return result.count;
  }
}
