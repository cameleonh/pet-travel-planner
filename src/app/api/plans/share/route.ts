import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/app/api/_shared/rate-limit";
import { saveSharedPlan } from "@/app/api/_shared/shared-plans";
import { sharedPlanRequestSchema } from "@/app/api/_shared/shared-plan-schema";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;
  const parsed = sharedPlanRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_QUERY", message: "계획 데이터 형식을 확인해 주세요." }, meta: {} }, { status: 400 });
  }
  const code = saveSharedPlan(JSON.stringify(parsed.data.plan));
  if (!code) {
    return NextResponse.json({ success: false, data: null, error: { code: "SAVE_FAILED", message: "공유 링크 생성에 실패했습니다." }, meta: {} }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: { code, url: `/p/${code}` }, meta: {} }, { status: 201 });
}
