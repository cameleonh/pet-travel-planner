import Database from "better-sqlite3";
import { resolveDatabasePath } from "@/data/database/repository";

// Content-Security-Policy violation reports. Stored in the shared SQLite DB so
// they can be aggregated (by directive / blocked origin / day) on the owner
// page. Reports are anonymous (no IP is stored).

export type CspReportInput = {
  documentUri: string | null;
  blockedUri: string | null;
  violatedDirective: string | null;
  effectiveDirective: string | null;
  disposition: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  userAgent: string | null;
};

let db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (db) return db;
  try {
    db = new Database(resolveDatabasePath());
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE IF NOT EXISTS csp_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, document_uri TEXT, blocked_uri TEXT, violated_directive TEXT, effective_directive TEXT, disposition TEXT, source_file TEXT, line_number INTEGER, user_agent TEXT)");
    return db;
  } catch {
    return null;
  }
}

export function recordCspReport(entry: CspReportInput): void {
  const database = getDb();
  if (!database) return;
  try {
    database
      .prepare("INSERT INTO csp_reports (created_at, document_uri, blocked_uri, violated_directive, effective_directive, disposition, source_file, line_number, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        new Date().toISOString(),
        entry.documentUri?.slice(0, 500) ?? null,
        entry.blockedUri?.slice(0, 500) ?? null,
        entry.violatedDirective?.slice(0, 120) ?? null,
        entry.effectiveDirective?.slice(0, 120) ?? null,
        entry.disposition?.slice(0, 20) ?? null,
        entry.sourceFile?.slice(0, 500) ?? null,
        entry.lineNumber,
        entry.userAgent?.slice(0, 300) ?? null,
      );
  } catch {
    // Reporting must never throw.
  }
}

export type CspStats = {
  total: number;
  last24h: number;
  byDirective: { directive: string; total: number }[];
  byBlockedUri: { blockedUri: string; total: number }[];
  byDay: { day: string; total: number }[];
};

export function cspReportStats(): CspStats {
  const empty: CspStats = { total: 0, last24h: 0, byDirective: [], byBlockedUri: [], byDay: [] };
  const database = getDb();
  if (!database) return empty;
  try {
    const total = (database.prepare("SELECT COUNT(*) AS c FROM csp_reports").get() as { c: number }).c;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24h = (database.prepare("SELECT COUNT(*) AS c FROM csp_reports WHERE created_at >= ?").get(since) as { c: number }).c;
    const byDirective = database
      .prepare("SELECT COALESCE(effective_directive, violated_directive, '(unknown)') AS directive, COUNT(*) AS total FROM csp_reports GROUP BY directive ORDER BY total DESC LIMIT 20")
      .all() as { directive: string; total: number }[];
    const byBlockedUri = database
      .prepare("SELECT COALESCE(blocked_uri, '(unknown)') AS blockedUri, COUNT(*) AS total FROM csp_reports GROUP BY blockedUri ORDER BY total DESC LIMIT 20")
      .all() as { blockedUri: string; total: number }[];
    const byDay = database
      .prepare("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total FROM csp_reports GROUP BY day ORDER BY day DESC LIMIT 30")
      .all() as { day: string; total: number }[];
    return { total, last24h, byDirective, byBlockedUri, byDay };
  } catch {
    return empty;
  }
}
