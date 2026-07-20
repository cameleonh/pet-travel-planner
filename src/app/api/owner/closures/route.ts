import { NextResponse } from "next/server";
import { z } from "zod";
import { SqliteOwnerRepository, closureKinds } from "@/data/database/owner-repository";
import { loadOwnerSession } from "@/server/owner-auth";

const closureSchema = z.object({
  placeId: z.string().trim().min(1).max(120),
  closureKind: z.enum(closureKinds),
  weekday: z.coerce.number().int().min(0).max(6).nullable().optional(),
  closureDate: z.string().date().nullable().optional(),
  reason: z.string().trim().min(1).max(120),
}).superRefine((value, context) => {
  if (value.closureKind === "weekly" && value.weekday === null || value.closureKind === "weekly" && value.weekday === undefined) context.addIssue({ code: "custom", path: ["weekday"], message: "정기 휴무 요일을 선택해 주세요." });
  if (value.closureKind === "date" && !value.closureDate) context.addIssue({ code: "custom", path: ["closureDate"], message: "임시 휴무일을 선택해 주세요." });
});

export function GET(request: Request): Response {
  const session = loadOwnerSession(request);
  const placeId = new URL(request.url).searchParams.get("placeId")?.trim();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Google 로그인 후 이용해 주세요." } }, { status: 401 });
  if (!placeId) return NextResponse.json({ success: false, error: { code: "INVALID_PLACE", message: "장소 ID가 필요합니다." } }, { status: 400 });
  const repository = new SqliteOwnerRepository();
  try {
    if (!repository.canManagePlace(session.user, placeId)) return NextResponse.json({ success: false, error: { code: "PLACE_NOT_APPROVED", message: "승인된 운영 장소만 관리할 수 있습니다." } }, { status: 403 });
    return NextResponse.json({ success: true, closures: repository.listClosures(placeId) });
  } finally { repository.close(); }
}

export async function POST(request: Request): Promise<Response> {
  const session = loadOwnerSession(request);
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Google 로그인 후 이용해 주세요." } }, { status: 401 });
  try {
    const input = closureSchema.parse(await request.json());
    const repository = new SqliteOwnerRepository();
    try {
      const closure = repository.addClosure(session.user, { placeId: input.placeId, closureKind: input.closureKind, weekday: input.weekday ?? null, closureDate: input.closureDate ?? null, reason: input.reason });
      return NextResponse.json({ success: true, closure });
    } finally { repository.close(); }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { code: "INVALID_CLOSURE", message: "정기 휴무 요일 또는 임시 휴무일을 확인해 주세요." } }, { status: 400 });
    if (error instanceof Error && error.message === "PLACE_NOT_APPROVED") return NextResponse.json({ success: false, error: { code: "PLACE_NOT_APPROVED", message: "장소 운영자 승인이 완료된 뒤 휴무를 등록할 수 있습니다." } }, { status: 403 });
    return NextResponse.json({ success: false, error: { code: "CLOSURE_FAILED", message: "휴무 정보를 저장하지 못했습니다." } }, { status: 500 });
  }
}

export function DELETE(request: Request): Response {
  const session = loadOwnerSession(request);
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Google 로그인 후 이용해 주세요." } }, { status: 401 });
  if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_CLOSURE", message: "휴무 ID가 필요합니다." } }, { status: 400 });
  const repository = new SqliteOwnerRepository();
  try { return NextResponse.json({ success: repository.deleteClosure(session.user, id) }); } finally { repository.close(); }
}
