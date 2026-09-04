import Database from "better-sqlite3";
import { resolveDatabasePath } from "@/data/database/repository";

// Privacy-minimal usage counters: one row per (day, kind, detail) with a
// count. No IPs, no user agents, no identifiers — enough to answer "which
// themes/places/regions are used" and nothing else. Read side is a direct
// sqlite query by the operator; there is deliberately no read API.

export const USAGE_EVENT_KINDS = [
  "theme_apply",
  "place_view",
  "place_page_view",
  "nightspot_3d_open",
  "place_3d_open",
  "plan_generate",
  "region_search",
] as const;

export type UsageEventKind = (typeof USAGE_EVENT_KINDS)[number];

let db: Database.Database | null = null;
let dbFailed = false;

function getDb(): Database.Database | null {
  if (db) return db;
  if (dbFailed) return null;
  try {
    const path = process.env.GG_RATE_LIMIT_DB_PATH?.trim() || resolveDatabasePath();
    db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE IF NOT EXISTS usage_daily (day TEXT NOT NULL, kind TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, detail)) WITHOUT ROWID");
    return db;
  } catch {
    dbFailed = true;
    return null;
  }
}

export function usageDayKey(now = new Date()): string {
  // KST day bucket regardless of server timezone: shift the instant by +9h
  // and read the UTC calendar fields of the result.
  return new Date(now.getTime() + 9 * 60 * 60_000).toISOString().slice(0, 10);
}

export function recordUsage(kind: UsageEventKind, detail = "", now = new Date()): void {
  const database = getDb();
  if (!database) return;
  try {
    database
      .prepare("INSERT INTO usage_daily (day, kind, detail, count) VALUES (?, ?, ?, 1) ON CONFLICT(day, kind, detail) DO UPDATE SET count = count + 1")
      .run(usageDayKey(now), kind, detail.slice(0, 80));
    // Opportunistic prune: keep 400 days.
    if (Math.random() < 0.005) {
      database.prepare("DELETE FROM usage_daily WHERE day < ?").run(usageDayKey(new Date(now.getTime() - 400 * 24 * 60 * 60_000)));
    }
  } catch {
    // Usage counting must never break a request.
  }
}
