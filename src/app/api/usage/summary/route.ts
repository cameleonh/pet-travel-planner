import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { resolveDatabasePath } from "@/data/database/repository";
import { loadOwnerSession } from "@/server/owner-auth";

export async function GET(request: Request) {
  const session = loadOwnerSession(request);
  if (!session) {
    return NextResponse.json({ success: false, data: null, error: { code: "UNAUTHORIZED", message: "오너 로그인이 필요합니다." }, meta: {} }, { status: 401 });
  }
  let db: Database.Database | null = null;
  try {
    db = new Database(resolveDatabasePath(), { readonly: true });
    const since = new Date(Date.now() - 29 * 24 * 60 * 60_000).toISOString().slice(0, 10);
    const byKind = db.prepare("SELECT kind, SUM(count) AS total FROM usage_daily WHERE day >= ? GROUP BY kind ORDER BY total DESC").all(since);
    const byDetail = db.prepare("SELECT kind, detail, SUM(count) AS total FROM usage_daily WHERE day >= ? GROUP BY kind, detail ORDER BY total DESC LIMIT 200").all(since);
    const byDay = db.prepare("SELECT day, SUM(count) AS total FROM usage_daily WHERE day >= ? GROUP BY day ORDER BY day DESC").all(since);
    return NextResponse.json({ success: true, data: { since, byKind, byDetail, byDay }, meta: {} });
  } catch {
    return NextResponse.json({ success: true, data: { since: null, byKind: [], byDetail: [], byDay: [] }, meta: {} });
  } finally {
    db?.close();
  }
}
