import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SqlitePlaceRepository, resolveDatabasePath } from "@/data/database/repository";

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const url = new URL(request.url);
    const region = z.string().trim().max(40).default("").parse(url.searchParams.get("region") ?? "");

    if (!region) {
      return NextResponse.json({ success: true, data: { trails: [], count: 0 }, error: null, meta: { requestId } });
    }

    const repo = new SqlitePlaceRepository(resolveDatabasePath());
    try {
      const trails = repo.loadTrailsByRegion(region);
      return NextResponse.json({
        success: true,
        data: { trails, count: trails.length },
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
    return NextResponse.json({ success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "산책 코스를 불러오지 못했습니다." }, meta: { requestId } }, { status: 502 });
  }
}
