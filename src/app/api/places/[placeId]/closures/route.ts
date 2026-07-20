import { NextResponse } from "next/server";
import { SqliteOwnerRepository } from "@/data/database/owner-repository";

export async function GET(_request: Request, context: { readonly params: Promise<{ readonly placeId: string }> }): Promise<Response> {
  const { placeId } = await context.params;
  const repository = new SqliteOwnerRepository();
  try {
    return NextResponse.json({ success: true, placeId, closures: repository.listClosures(placeId), interpretation: "등록된 휴무일만 표시합니다. 휴무가 없다고 확정 영업을 의미하지 않으므로 방문 전 운영자 확인이 필요합니다." });
  } finally { repository.close(); }
}
