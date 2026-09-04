import Database from "better-sqlite3";
import { resolveDatabasePath } from "@/data/database/repository";

export type SharedPlan = {
  code: string;
  planJson: string;
  createdAt: string;
};

let db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (db) return db;
  try {
    db = new Database(resolveDatabasePath());
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE IF NOT EXISTS shared_plans (code TEXT PRIMARY KEY, plan_json TEXT NOT NULL, created_at TEXT NOT NULL) WITHOUT ROWID");
    return db;
  } catch {
    return null;
  }
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no confusing chars (0/o, 1/l/i)

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function saveSharedPlan(planJson: string): string | null {
  const database = getDb();
  if (!database) return null;
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode();
      const exists = database.prepare("SELECT 1 FROM shared_plans WHERE code = ?").get(code);
      if (exists) continue;
      database.prepare("INSERT INTO shared_plans (code, plan_json, created_at) VALUES (?, ?, ?)").run(code, planJson, new Date().toISOString());
      return code;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSharedPlan(code: string): SharedPlan | null {
  const database = getDb();
  if (!database) return null;
  try {
    const row = database.prepare("SELECT code, plan_json, created_at FROM shared_plans WHERE code = ?").get(code) as SharedPlan | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}
