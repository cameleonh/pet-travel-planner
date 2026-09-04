import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/app/api/_shared/rate-limit";
import { recordUsage, USAGE_EVENT_KINDS } from "@/app/api/_shared/usage";

const bodySchema = z.object({
  kind: z.enum(USAGE_EVENT_KINDS),
  detail: z.string().trim().max(80).optional().default(""),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_QUERY", message: "이벤트 형식을 확인해 주세요." }, meta: {} }, { status: 400 });
  }
  recordUsage(parsed.data.kind, parsed.data.detail);
  return new NextResponse(null, { status: 204 });
}
