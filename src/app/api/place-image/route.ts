import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().min(1).max(60),
});

const imageDocSchema = z.object({
  thumbnail_url: z.string().url(),
  image_url: z.string().url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
}).passthrough();

const imageResponseSchema = z.object({
  documents: z.array(imageDocSchema).default([]),
  meta: z.unknown().optional(),
}).passthrough();

const API_BASE = "https://dapi.kakao.com/v2/search/image";

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const apiKey = process.env.KAKAO_REST_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "API 키가 설정되지 않았습니다." }, meta: { requestId } },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const { q } = querySchema.parse({ q: url.searchParams.get("q") ?? undefined });

    const apiUrl = new URL(API_BASE);
    apiUrl.searchParams.set("query", q);
    apiUrl.searchParams.set("size", "10");
    apiUrl.searchParams.set("sort", "accuracy");

    const response = await fetch(apiUrl.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(3_000)]),
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "이미지를 불러오지 못했습니다." }, meta: { requestId } },
        { status: 502 },
      );
    }

    const json: unknown = await response.json();
    const parsed = imageResponseSchema.safeParse(json);
    if (!parsed.success || parsed.data.documents.length === 0) {
      return NextResponse.json(
        { success: true, data: { thumbnailUrl: null }, error: null, meta: { requestId } },
        { headers: { "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800", "Content-Language": "ko", "X-Request-Id": requestId } },
      );
    }

    // 카드 표시 폭(~400px 레티나)에 맞는 후보 선택: 폭을 알 수 있으면 400 이상에서
    // 가장 작은(=불필요하게 거대하지 않은) 것, 폭 미상이면 첫 번째.
    const candidates = parsed.data.documents;
    const withWidth = candidates.filter((d) => typeof d.width === "number" && d.width >= 400);
    const sized = withWidth.slice().sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
    const doc = sized[0] ?? candidates[0]!;
    return NextResponse.json(
      { success: true, data: { thumbnailUrl: doc.thumbnail_url, imageUrl: doc.image_url ?? doc.thumbnail_url }, error: null, meta: { requestId } },
      { headers: { "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800", "Content-Language": "ko", "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { success: true, data: { thumbnailUrl: null }, error: null, meta: { requestId } },
    );
  }
}
