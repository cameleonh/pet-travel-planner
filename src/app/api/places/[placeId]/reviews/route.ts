import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/app/api/_shared/rate-limit";
import { listReviews, normalizeReviewerId, reviewSummary, upsertReview } from "@/app/api/_shared/reviews";

const postSchema = z.object({
  reviewerId: z.string().trim().min(8).max(64),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(200).optional().default(""),
});

type Ctx = { params: Promise<{ placeId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;
  const { placeId: raw } = await ctx.params;
  const placeId = decodeURIComponent(raw);
  const mineParam = new URL(request.url).searchParams.get("mine");
  const mine = mineParam ? normalizeReviewerId(mineParam) : null;
  return NextResponse.json({
    success: true,
    data: { summary: reviewSummary(placeId), reviews: listReviews(placeId, mine) },
    meta: {},
  });
}

export async function POST(request: Request, ctx: Ctx) {
  const limited = enforceRateLimit(request);
  if (limited) return limited;
  const { placeId: raw } = await ctx.params;
  const placeId = decodeURIComponent(raw);
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: { code: "INVALID_QUERY", message: "후기 형식을 확인해 주세요." }, meta: {} }, { status: 400 });
  }
  const saved = upsertReview(placeId, normalizeReviewerId(parsed.data.reviewerId), parsed.data.rating, parsed.data.comment);
  if (!saved) {
    return NextResponse.json({ success: false, data: null, error: { code: "SAVE_FAILED", message: "후기를 저장하지 못했습니다." }, meta: {} }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: { summary: reviewSummary(placeId), reviews: listReviews(placeId, normalizeReviewerId(parsed.data.reviewerId)) }, meta: {} }, { status: 201 });
}
