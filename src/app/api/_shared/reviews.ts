import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { resolveDatabasePath } from "@/data/database/repository";

// Minimal visit reviews: one per anonymous device per place, 1-5 stars plus a
// short comment. The client sends a random localStorage UUID; only its salted
// hash is stored, so nothing identifies a person.

export type PlaceReview = {
  rating: number;
  comment: string;
  createdAt: string;
  mine?: boolean;
};

let db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (db) return db;
  try {
    db = new Database(resolveDatabasePath());
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE IF NOT EXISTS place_reviews (place_id TEXT NOT NULL, device_hash TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, PRIMARY KEY (place_id, device_hash)) WITHOUT ROWID");
    return db;
  } catch {
    return null;
  }
}

function hashDevice(reviewerId: string): string {
  return createHash("sha256").update(`gggo:${reviewerId}`).digest("hex");
}

export function listReviews(placeId: string, mineDeviceHash: string | null = null, limit = 10): PlaceReview[] {
  const database = getDb();
  if (!database) return [];
  try {
    const rows = database
      .prepare("SELECT device_hash, rating, comment, created_at FROM place_reviews WHERE place_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(placeId, limit) as Array<{ device_hash: string; rating: number; comment: string; created_at: string }>;
    return rows.map((row) => ({ rating: row.rating, comment: row.comment, createdAt: row.created_at, mine: mineDeviceHash ? row.device_hash === mineDeviceHash : undefined }));
  } catch {
    return [];
  }
}

export function reviewSummary(placeId: string): { count: number; average: number | null } {
  const database = getDb();
  if (!database) return { count: 0, average: null };
  try {
    const row = database.prepare("SELECT COUNT(*) AS count, AVG(rating) AS average FROM place_reviews WHERE place_id = ?").get(placeId) as { count: number; average: number | null };
    return { count: row.count, average: row.average == null ? null : Math.round(row.average * 10) / 10 };
  } catch {
    return { count: 0, average: null };
  }
}

export function upsertReview(placeId: string, reviewerId: string, rating: number, comment: string): boolean {
  const database = getDb();
  if (!database) return false;
  const deviceHash = hashDevice(reviewerId);
  try {
    database
      .prepare("INSERT INTO place_reviews (place_id, device_hash, rating, comment, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(place_id, device_hash) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = excluded.created_at")
      .run(placeId, deviceHash, rating, comment.slice(0, 200).trim(), new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export function normalizeReviewerId(reviewerId: string): string {
  const trimmed = reviewerId.trim();
  return trimmed.length >= 8 && trimmed.length <= 64 ? trimmed : randomUUID();
}
