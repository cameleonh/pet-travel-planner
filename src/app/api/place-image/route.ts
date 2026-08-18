import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().min(1).max(60),
  cid: z.string().regex(/^\d{1,12}$/).optional(),
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

const KAKAO_API_BASE = "https://dapi.kakao.com/v2/search/image";
const KTO_IMAGE_API = "https://apis.data.go.kr/B551011/KorPetTourService2/detailImage2";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
  "Content-Language": "ko",
};

/** 관광공사 공식 이미지 — 장소 정확·품질 보장. 없으면 null. */
async function ktoOfficialImage(contentId: string, tourApiKey: string, signal: AbortSignal): Promise<string | null> {
  if (!tourApiKey) return null;
  try {
    const params = new URLSearchParams({
      serviceKey: tourApiKey,
      MobileOS: "ETC",
      MobileApp: "HamkkeGaljido",
      contentId,
      _type: "json",
    });
    const response = await fetch(`${KTO_IMAGE_API}?${params}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(3_000)]),
    });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    const body = (json as { response?: { body?: { items?: { item?: unknown } } } })?.response?.body;
    const raw = body?.items?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const item of items) {
      const origin = (item as { originimgurl?: unknown })?.originimgurl;
      if (typeof origin === "string" && /^https?:\/\//.test(origin)) return origin;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const url = new URL(request.url);
    const { q, cid } = querySchema.parse({ q: url.searchParams.get("q") ?? undefined, cid: url.searchParams.get("cid") ?? undefined });

    // 1순위: 관광공사 공식 이미지 (장소 contentid로)
    const tourApiKey = process.env.TOUR_API_KEY ?? "";
    if (cid) {
      const official = await ktoOfficialImage(cid, tourApiKey, request.signal);
      if (official) {
        return NextResponse.json(
          { success: true, data: { thumbnailUrl: official, imageUrl: official, source: "kto-official" }, error: null, meta: { requestId } },
          { headers: { ...CACHE_HEADERS, "X-Request-Id": requestId } },
        );
      }
    }

    // 2순위: 카카오 이미지 검색 (공식 이미지 없을 때)
    const apiKey = process.env.KAKAO_REST_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "API 키가 설정되지 않았습니다." }, meta: { requestId } },
        { status: 503 },
      );
    }

    const apiUrl = new URL(KAKAO_API_BASE);
    apiUrl.searchParams.set("query", q);
    apiUrl.searchParams.set("size", "10");
    apiUrl.searchParams.set("sort", "accuracy");

    const response = await fetch(apiUrl.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(3_000)]),
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
        { headers: { ...CACHE_HEADERS, "X-Request-Id": requestId } },
      );
    }

    // 카드 표시 폭(~400px 레티나)에 맞는 후보 선택: 폭을 알 수 있으면 400 이상에서
    // 가장 작은(=불필요하게 거대하지 않은) 것, 폭 미상이면 첫 번째.
    const candidates = parsed.data.documents;
    const withWidth = candidates.filter((d) => typeof d.width === "number" && d.width >= 400);
    const sized = withWidth.slice().sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
    const doc = sized[0] ?? candidates[0]!;
    return NextResponse.json(
      { success: true, data: { thumbnailUrl: doc.thumbnail_url, imageUrl: doc.image_url ?? doc.thumbnail_url, source: "kakao-search" }, error: null, meta: { requestId } },
      { headers: { ...CACHE_HEADERS, "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { success: true, data: { thumbnailUrl: null }, error: null, meta: { requestId } },
    );
  }
}
