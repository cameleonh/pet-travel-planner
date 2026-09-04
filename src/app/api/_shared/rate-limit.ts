import Database from "better-sqlite3";
import { NextResponse } from "next/server";
import { resolveDatabasePath } from "@/data/database/repository";

// Next 16 production isolates route/middleware execution contexts, so neither
// module state nor globalThis survives between requests there (observed live:
// 140-request bursts never throttled through Apache). The SQLite database is
// the one state store that persists across every runtime context, so the
// per-IP token bucket lives there. Fails open when the DB is unavailable —
// availability of the site outranks throttling.

const CAPACITY = 120;
const REFILL_PER_MS = 120 / 60_000;
const PRUNE_AFTER_MS = 60 * 60_000;

let db: Database.Database | null = null;
let dbFailed = false;

function getDb(): Database.Database | null {
  if (db) return db;
  if (dbFailed) return null;
  try {
    const path = process.env.GG_RATE_LIMIT_DB_PATH?.trim() || resolveDatabasePath();
    db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE IF NOT EXISTS rate_limit_buckets (ip TEXT PRIMARY KEY, tokens REAL NOT NULL, updated_at INTEGER NOT NULL) WITHOUT ROWID");
    return db;
  } catch {
    dbFailed = true;
    return null;
  }
}

export function enforceRateLimit(request: Request): NextResponse | null {
  const database = getDb();
  if (!database) return null;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const now = Date.now();

  const row = database
    .prepare("SELECT tokens, updated_at FROM rate_limit_buckets WHERE ip = ?")
    .get(ip) as { tokens: number; updated_at: number } | undefined;
  const elapsed = row ? Math.max(0, now - row.updated_at) : 0;
  const tokens = Math.min(CAPACITY, (row?.tokens ?? CAPACITY) + elapsed * REFILL_PER_MS);

  if (tokens < 1) {
    database
      .prepare("INSERT INTO rate_limit_buckets (ip, tokens, updated_at) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET tokens = excluded.tokens, updated_at = excluded.updated_at")
      .run(ip, tokens, now);
    return NextResponse.json(
      { success: false, data: null, error: { code: "RATE_LIMITED", message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, meta: {} },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  database
    .prepare("INSERT INTO rate_limit_buckets (ip, tokens, updated_at) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET tokens = excluded.tokens, updated_at = excluded.updated_at")
    .run(ip, tokens - 1, now);

  // Occasional opportunistic prune of abandoned buckets.
  if (Math.random() < 0.01) {
    database.prepare("DELETE FROM rate_limit_buckets WHERE updated_at < ?").run(now - PRUNE_AFTER_MS);
  }
  return null;
}
