import "server-only";
import Database from "better-sqlite3";
import { resolveDatabasePath } from "@/data/database/repository";

export type PlaceHours = {
  useTime: string | null;
  restDate: string | null;
  fetchedAt: string | null;
  parking: string | null;
  infoCenter: string | null;
  chkpet: string | null;
  wheelchair: string | null;
  restroom: string | null;
  elevator: string | null;
  stroller: string | null;
};

let db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (db) return db;
  try {
    db = new Database(resolveDatabasePath(), { readonly: true });
    return db;
  } catch {
    return null;
  }
}

export function getPlaceHours(placeId: string): PlaceHours | null {
  const database = getDb();
  if (!database) return null;
  try {
    const row = database
      .prepare("SELECT use_time AS useTime, rest_date AS restDate, fetched_at AS fetchedAt, parking, info_center AS infoCenter, chkpet, wheelchair, restroom, elevator, stroller FROM place_hours WHERE place_id = ?")
      .get(placeId) as (Omit<PlaceHours, never> & Record<string, unknown>) | undefined;
    if (!row) return null;
    return {
      useTime: typeof row.useTime === "string" ? row.useTime : null,
      restDate: typeof row.restDate === "string" ? row.restDate : null,
      fetchedAt: typeof row.fetchedAt === "string" ? row.fetchedAt : null,
      parking: typeof row.parking === "string" ? row.parking : null,
      infoCenter: typeof row.infoCenter === "string" ? row.infoCenter : null,
      chkpet: typeof row.chkpet === "string" ? row.chkpet : null,
      wheelchair: typeof row.wheelchair === "string" ? row.wheelchair : null,
      restroom: typeof row.restroom === "string" ? row.restroom : null,
      elevator: typeof row.elevator === "string" ? row.elevator : null,
      stroller: typeof row.stroller === "string" ? row.stroller : null,
    };
  } catch {
    return null;
  }
}

export function getPlaceHoursBatch(placeIds: readonly string[]): Record<string, PlaceHours> {
  if (placeIds.length === 0) return {};
  const database = getDb();
  if (!database) return {};

  try {
    const uniqueIds = [...new Set(placeIds)].slice(0, 50);
    const placeholders = uniqueIds.map(() => "?").join(", ");
    const rows = database
      .prepare(`SELECT place_id AS placeId, use_time AS useTime, rest_date AS restDate, fetched_at AS fetchedAt, parking, info_center AS infoCenter, chkpet, wheelchair, restroom, elevator, stroller FROM place_hours WHERE place_id IN (${placeholders})`)
      .all(...uniqueIds) as Array<Record<string, unknown> & { placeId: string }>;

    return Object.fromEntries(rows.map((row) => [row.placeId, {
      useTime: typeof row.useTime === "string" ? row.useTime : null,
      restDate: typeof row.restDate === "string" ? row.restDate : null,
      fetchedAt: typeof row.fetchedAt === "string" ? row.fetchedAt : null,
      parking: typeof row.parking === "string" ? row.parking : null,
      infoCenter: typeof row.infoCenter === "string" ? row.infoCenter : null,
      chkpet: typeof row.chkpet === "string" ? row.chkpet : null,
      wheelchair: typeof row.wheelchair === "string" ? row.wheelchair : null,
      restroom: typeof row.restroom === "string" ? row.restroom : null,
      elevator: typeof row.elevator === "string" ? row.elevator : null,
      stroller: typeof row.stroller === "string" ? row.stroller : null,
    }]));
  } catch {
    return {};
  }
}

// KTO strings carry <br> markup — turn them into plain readable lines.
export function formatKtoText(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/^[-–※]\s*/, "").trim())
    .filter(Boolean)
    .join(" · ");
  return cleaned || null;
}
