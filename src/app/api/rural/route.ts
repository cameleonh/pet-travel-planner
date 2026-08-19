import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SqlitePlaceRepository, resolveDatabasePath } from "@/data/database/repository";

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const url = new URL(request.url);
    const region = z.string().trim().max(40).default("").parse(url.searchParams.get("region") ?? "");
    const kind = z.enum(["villages", "farmstays", "all"]).default("all").parse(url.searchParams.get("kind") ?? "all");

    if (!region) {
      return NextResponse.json({ success: true, data: { villages: [], farmstays: [], counts: { villages: 0, farmstays: 0 } }, error: null, meta: { requestId } });
    }

    const repo = new SqlitePlaceRepository(resolveDatabasePath());
    try {
      const villages = kind === "all" || kind === "villages" ? repo.loadVillagesByRegion(region) : [];
      const farmstays = kind === "all" || kind === "farmstays" ? repo.loadFarmstaysByRegion(region) : [];
      return NextResponse.json({
        success: true,
        data: {
          villages,
          farmstays,
          counts: { villages: villages.length, farmstays: farmstays.length },
        },
        error: null,
        meta: { requestId },
      }, { headers: { "Content-Language": "ko", "X-Request-Id": requestId } });
    } finally {
      repo.close();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, data: null, error: { code: "INVALID_QUERY", message: "지역 검색어를 확인해 주세요." }, meta: { requestId } }, { status: 400 });
    }
    return NextResponse.json({ success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "농어촌 여행 정보를 불러오지 못했습니다." }, meta: { requestId } }, { status: 502 });
  }
}
