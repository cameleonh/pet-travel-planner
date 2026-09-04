// Sync opening hours / rest days / parking / info center for the curated
// night spots (pilot set) from the KTO KorService2 detailIntro2 API into the
// shared SQLite place_hours table. Run: node scripts/sync-place-hours.mjs
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../package.json", import.meta.url));
const Database = require("better-sqlite3");

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = (env.match(/^TOUR_API_KEY=(.+)$/m)?.[1] ?? "").trim();
if (!key) { console.error("TOUR_API_KEY missing in .env.local"); process.exit(1); }

const dbPath = process.env.GG_RATE_LIMIT_DB_PATH?.trim() || new URL("../.data/pet-travel.sqlite", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const db = new Database(dbPath);
db.exec("CREATE TABLE IF NOT EXISTS place_hours (place_id TEXT PRIMARY KEY, use_time TEXT, rest_date TEXT, parking TEXT, info_center TEXT, chkpet TEXT, fetched_at TEXT NOT NULL) WITHOUT ROWID");

const seedSource = fs.readFileSync(new URL("../src/domain/night-spots.ts", import.meta.url), "utf8");
const nightIds = [...seedSource.matchAll(/placeId: "tour-api:(\d+)"/g)].map((m) => `tour-api:${m[1]}`);
console.log("night spots:", nightIds.length);

const contentTypeByCategory = { attraction: "12", restaurant: "39", cafe: "39", accommodation: "32", shopping: "38" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0, empty = 0, failed = 0;
const upsert = db.prepare("INSERT INTO place_hours (place_id, use_time, rest_date, parking, info_center, chkpet, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(place_id) DO UPDATE SET use_time=excluded.use_time, rest_date=excluded.rest_date, parking=excluded.parking, info_center=excluded.info_center, chkpet=excluded.chkpet, fetched_at=excluded.fetched_at");

for (const id of nightIds) {
  const row = db.prepare("SELECT category FROM places WHERE snapshot_id=(SELECT MAX(snapshot_id) FROM places) AND place_id=?").get(id);
  const ct = contentTypeByCategory[row?.category ?? "attraction"] ?? "12";
  try {
    const url = `https://apis.data.go.kr/B551011/KorService2/detailIntro2?serviceKey=${encodeURIComponent(key)}&MobileOS=ETC&MobileApp=gggo&contentId=${id.replace("tour-api:", "")}&contentTypeId=${ct}&_type=json`;
    const res = await fetch(url);
    const json = await res.json();
    const item = json?.response?.body?.items?.item;
    const one = Array.isArray(item) ? item[0] : item;
    if (!one) { empty++; console.log(`- ${id}: no item`); }
    else {
      upsert.run(id, String(one.usetime ?? "").trim(), String(one.restdate ?? "").trim(), String(one.parking ?? "").trim(), String(one.infocenter ?? "").trim(), String(one.chkpet ?? "").trim(), new Date().toISOString());
      ok++;
      console.log(`+ ${id}: usetime="${String(one.usetime ?? "").slice(0, 40)}" rest="${String(one.restdate ?? "").slice(0, 30)}"`);
    }
  } catch (e) {
    failed++;
    console.log(`! ${id}: ${e.message}`);
  }
  await sleep(350);
}
console.log(`\ndone: ok=${ok} empty=${empty} failed=${failed}`);
db.close();
