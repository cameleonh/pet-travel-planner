import { SqlitePlaceRepository, resolveDatabasePath } from "../src/data/database/repository";
import { FarmstayProvider, tmCenterToWgs84Safe, type FarmstayItem } from "../src/data/providers/farmstay-provider";
import type { FarmstayRecord } from "../src/data/database/repository";

function mapItemToRecord(item: FarmstayItem): FarmstayRecord | null {
  const name = item.BPLC_NM?.trim();
  if (!name) return null;
  const x = item.CRD_INFO_X ? parseFloat(item.CRD_INFO_X) : NaN;
  const y = item.CRD_INFO_Y ? parseFloat(item.CRD_INFO_Y) : NaN;
  const hasCoords = Number.isFinite(x) && Number.isFinite(y) && x !== 0 && y !== 0;
  const coords = hasCoords ? tmCenterToWgs84Safe(x, y) : { latitude: null, longitude: null };
  return {
    farmstay_id: item.MNG_NO ? `farmstay:${item.MNG_NO}` : `farmstay:${name}`,
    business_name: name,
    permit_date: item.LCPMT_YMD ?? null,
    address: item.ROAD_NM_ADDR?.trim() || item.LOTNO_ADDR?.trim() || null,
    status_code: item.SALS_STTS_CD ?? null,
    status_name: item.SALS_STTS_NM?.trim() || item.DTL_SALS_STTS_NM?.trim() || null,
    sigungu_code: item.OPN_ATMY_GRP_CD ?? null,
    latitude: coords.latitude,
    longitude: coords.longitude,
    raw_coord_x: hasCoords ? x : null,
    raw_coord_y: hasCoords ? y : null,
  };
}

async function main(): Promise<void> {
  const repository = new SqlitePlaceRepository(resolveDatabasePath());
  try {
    const provider = new FarmstayProvider({
      requestBudget: { remaining: 10000 },
      requestIntervalMs: 150,
      rows: 100,
    });

    console.log(JSON.stringify({ starting: true, message: "Fetching farmstay catalog..." }));
    const items = await provider.fetchAllFarmstays();
    const records = items
      .map((item) => mapItemToRecord(item))
      .filter((record): record is FarmstayRecord => record !== null);

    const fetchedAt = new Date().toISOString();
    const saved = repository.replaceFarmstays(records, fetchedAt);

    console.log(JSON.stringify({
      ok: true,
      fetched: items.length,
      saved,
      withCoordinates: records.filter((r) => r.latitude !== null).length,
      totalFarmstays: repository.getFarmstayCount(),
    }));
  } finally {
    repository.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown farmstay sync error";
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});

export {};
