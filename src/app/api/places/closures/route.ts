import { NextResponse } from "next/server";
import { z } from "zod";
import { SqliteOwnerRepository } from "@/data/database/owner-repository";

const querySchema = z.object({ ids: z.string().trim().min(1).max(6_000) });

export function GET(request: Request): Response {
  const parsed = querySchema.safeParse({ ids: new URL(request.url).searchParams.get("ids") });
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_PLACE_IDS", message: "장소 ID가 필요합니다." } }, { status: 400 });
  const placeIds = [...new Set(parsed.data.ids.split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  const repository = new SqliteOwnerRepository();
  try {
    const closures = Object.fromEntries(placeIds.map((placeId) => [placeId, repository.listClosures(placeId)]));
    return NextResponse.json({ success: true, closures, interpretation: "등록된 휴무만 표시합니다. 휴무가 없다고 확정 영업을 의미하지 않으므로 방문 전 확인이 필요합니다." });
  } finally { repository.close(); }
}