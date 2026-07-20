import { NextResponse } from "next/server";
import { z } from "zod";
import { SqliteOwnerRepository } from "@/data/database/owner-repository";
import { loadOwnerSession } from "@/server/owner-auth";

const claimSchema = z.object({ placeId: z.string().trim().min(1).max(120), businessPhone: z.string().trim().max(40).nullish(), note: z.string().trim().max(300).nullish() });

export function GET(request: Request): Response {
  const session = loadOwnerSession(request);
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Google 로그인 후 이용해 주세요." } }, { status: 401 });
  const repository = new SqliteOwnerRepository();
  try { return NextResponse.json({ success: true, claims: repository.listClaims(session.user.id), user: session.user }); } finally { repository.close(); }
}

export async function POST(request: Request): Promise<Response> {
  const session = loadOwnerSession(request);
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Google 로그인 후 이용해 주세요." } }, { status: 401 });
  try {
    const input = claimSchema.parse(await request.json());
    const repository = new SqliteOwnerRepository();
    try {
      if (!repository.isKnownPlace(input.placeId)) return NextResponse.json({ success: false, error: { code: "UNKNOWN_PLACE", message: "현재 관광 데이터에 없는 장소입니다. 장소 ID를 다시 확인해 주세요." } }, { status: 404 });
      const claim = repository.claimPlace(session.user, input.placeId, input.businessPhone ?? null, input.note ?? null);
      return NextResponse.json({ success: true, claim });
    } finally { repository.close(); }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: "INVALID_CLAIM", message: "장소 ID와 연락처 형식을 확인해 주세요." } }, { status: 400 });
    return NextResponse.json({ success: false, error: { code: "CLAIM_FAILED", message: "장소 등록 요청을 저장하지 못했습니다." } }, { status: 500 });
  }
}