// Sync opening hours / rest days / parking / info center from the KTO
// KorService2 detailIntro2 API into the shared SQLite place_hours table.
//   node scripts/sync-place-hours.mjs            → curated night spots (pilot)
//   node scripts/sync-place-hours.mjs --all      → every place in the catalog
// --all resumes automatically: places already present in place_hours are skipped.
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../package.json", import.meta.url));
const Database = require("better-sqlite3");

const runAll = process.argv.includes("--all");

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = (env.match(/^TOUR_API_KEY=(.+)$/m)?.[1] ?? "").trim();
if (!key) { console.error("TOUR_API_KEY missing in .env.local"); process.exit(1); }

const dbPath = process.env.GG_RATE_LIMIT_DB_PATH?.trim() || new URL("../.data/pet-travel.sqlite", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const db = new Database(dbPath);
db.exec("CREATE TABLE IF NOT EXISTS place_hours (place_id TEXT PRIMARY KEY, use_time TEXT, rest_date TEXT, parking TEXT, info_center TEXT, chkpet TEXT, fetched_at TEXT NOT NULL) WITHOUT ROWID");

let targets;
if (runAll) {
  targets = db.prepare(`
    SELECT p.place_id AS id, p.category
    FROM places p
    LEFT JOIN place_hours h ON h.place_id = p.place_id
    WHERE p.snapshot_id = (SELECT MAX(snapshot_id) FROM places) AND h.place_id IS NULL
    ORDER BY p.place_id
  `).all();
  console.log(`full catalog sync: ${targets.length} places remaining (already synced are skipped)`);
} else {
  const seedSource = fs.readFileSync(new URL("../src/domain/night-spots.ts", import.meta.url), "utf8");
  const nightIds = [...seedSource.matchAll(/placeId: "tour-api:(\d+)"/g)].map((m) => `tour-api:${m[1]}`);
  targets = nightIds.map((id) => ({
    id,
    category: db.prepare("SELECT category FROM places WHERE snapshot_id=(SELECT MAX(snapshot_id) FROM places) AND place_id=?").get(id)?.category ?? "attraction",
  }));
  console.log("night spots:", targets.length);
}

const contentTypeByCategory = { attraction: "12", restaurant: "39", cafe: "39", accommodation: "32", shopping: "38" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0, empty = 0, failed = 0;
let quotaHit = false;
const startedAt = Date.now();
const upsert = db.prepare("INSERT INTO place_hours (place_id, use_time, rest_date, parking, info_center, chkpet, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(place_id) DO UPDATE SET use_time=excluded.use_time, rest_date=excluded.rest_date, parking=excluded.parking, info_center=excluded.info_center, chkpet=excluded.chkpet, fetched_at=excluded.fetched_at");
const markEmpty = db.prepare("INSERT INTO place_hours (place_id, use_time, rest_date, parking, info_center, chkpet, fetched_at) VALUES (?, '', '', '', '', '', ?) ON CONFLICT(place_id) DO NOTHING");

for (const [index, target] of targets.entries()) {
  if (quotaHit) { console.log(`quota exceeded — stopping at ${index}/${targets.length}`); break; }
  const ct = contentTypeByCategory[target.category ?? "attraction"] ?? "12";
  try {
    const url = `https://apis.data.go.kr/B551011/KorService2/detailIntro2?serviceKey=${encodeURIComponent(key)}&MobileOS=ETC&MobileApp=gggo&contentId=${target.id.replace("tour-api:", "")}&contentTypeId=${ct}&_type=json`;
    const res = await fetch(url);
    const text = await res.text();
    // Quota error comes as a different JSON shape — detect and bail out.
    if (text.includes("LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR")) {
      quotaHit = true;
      console.log(`quota exceeded at ${index}/${targets.length} — resume tomorrow`);
      break;
    }
    const json = JSON.parse(text);
    const item = json?.response?.body?.items?.item;
    const one = Array.isArray(item) ? item[0] : item;
    if (!one) { empty++; markEmpty.run(target.id, new Date().toISOString()); }
    else {
      upsert.run(target.id, String(one.usetime ?? "").trim(), String(one.restdate ?? "").trim(), String(one.parking ?? "").trim(), String(one.infocenter ?? "").trim(), String(one.chkpet ?? "").trim(), new Date().toISOString());
      ok++;
    }
  } catch (e) {
    failed++;
    if (failed <= 10) console.log(`! ${target.id}: ${e.message}`);
  }
  if ((index + 1) % 200 === 0) {
    const mins = ((Date.now() - startedAt) / 60000).toFixed(1);
    console.log(`progress ${index + 1}/${targets.length} ok=${ok} empty=${empty} failed=${failed} (${mins}m)`);
  }
  await sleep(runAll ? 320 : 350);
}
console.log(`\ndone: ok=${ok} empty=${empty} failed=${failed}`);
db.close();
