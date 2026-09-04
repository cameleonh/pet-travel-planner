import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchKakaoLocal } from "@/app/api/_shared/kakao-local";
import { enforceRateLimit } from "@/app/api/_shared/rate-limit";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(1).max(20000).default(5000),
});

const kakaoDocumentSchema = z
  .object({
    id: z.string(),
    place_name: z.string(),
    address_name: z.string(),
    road_address_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    distance: z.string().nullable().optional(),
    category_name: z.string().nullable().optional(),
    category_group_code: z.string().nullable().optional(),
    y: z.string(),
    x: z.string(),
    place_url: z.string().nullable().optional(),
  })
  .passthrough();

const kakaoResponseSchema = z
  .object({
    documents: z.array(kakaoDocumentSchema).default([]),
    meta: z.unknown().optional(),
  })
  .passthrough();

type KakaoDocument = z.infer<typeof kakaoDocumentSchema>;

const API_BASE = "https://dapi.kakao.com/v2/local/search/keyword.json";
const PRIMARY_SEARCH_KEYWORDS = ["반려동물동반 식당", "반려동물동반 카페"];
const FALLBACK_SEARCH_KEYWORDS = ["강아지동반 식당", "강아지동반 카페"];
const PAGE_SIZE = 15;
const PRIMARY_TIMEOUT_MS = 2_200;
const FALLBACK_TIMEOUT_MS = 1_200;

function toNumberOrNull(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapDocument(doc: KakaoDocument) {
  return {
    id: doc.id,
    name: doc.place_name,
    address: doc.address_name,
    roadAddress: doc.road_address_name ?? null,
    phone: doc.phone && doc.phone !== "" ? doc.phone : null,
    distance: toNumberOrNull(doc.distance ?? null),
    category: doc.category_name ?? null,
    latitude: toNumberOrNull(doc.y),
    longitude: toNumberOrNull(doc.x),
    placeUrl: doc.place_url ?? null,
  };
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const limited = enforceRateLimit(request);
    if (limited) return limited;
    const apiKey = process.env.KAKAO_REST_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "API 키가 설정되지 않았습니다." }, meta: { requestId } },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const { lat, lng, radius } = querySchema.parse({
      lat: url.searchParams.get("lat") ?? undefined,
      lng: url.searchParams.get("lng") ?? undefined,
      radius: url.searchParams.get("radius") ?? undefined,
    });

    const searchKeywords = async (keywords: string[], timeoutMs: number) => {
      const results = await Promise.allSettled(keywords.map(async (keyword) => {
        const apiUrl = new URL(API_BASE);
        apiUrl.searchParams.set("query", keyword);
        apiUrl.searchParams.set("y", String(lat));
        apiUrl.searchParams.set("x", String(lng));
        apiUrl.searchParams.set("radius", String(radius));
        apiUrl.searchParams.set("size", String(PAGE_SIZE));
        apiUrl.searchParams.set("sort", "distance");
        const response = await fetchKakaoLocal(apiUrl, apiKey, request.signal, { timeoutMs, maxAttempts: 1 });
        if (!response.ok) return { success: false, documents: [] as KakaoDocument[] };
        const json: unknown = await response.json();
        const parsed = kakaoResponseSchema.safeParse(json);
        return parsed.success
          ? { success: true, documents: parsed.data.documents }
          : { success: false, documents: [] as KakaoDocument[] };
      }));
      return results
        .filter((result): result is PromiseFulfilledResult<{ success: boolean; documents: KakaoDocument[] }> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((result) => result.success);
    };

    const primaryResults = await searchKeywords(PRIMARY_SEARCH_KEYWORDS, PRIMARY_TIMEOUT_MS);
    const primaryDocumentCount = primaryResults.reduce((count, result) => count + result.documents.length, 0);
    // If both primary searches timed out or failed, don't queue another pair
    // of provider calls. Return the partial failure quickly so the UI can show
    // its retry action instead of keeping this section in a long loading state.
    const needsFallbackSearch = primaryResults.length > 0 && primaryDocumentCount > 0 && primaryDocumentCount < 5;
    const fallbackResults = needsFallbackSearch ? await searchKeywords(FALLBACK_SEARCH_KEYWORDS, FALLBACK_TIMEOUT_MS) : [];
    const successfulResults = [...primaryResults, ...fallbackResults];
    const attemptedSearchCount = PRIMARY_SEARCH_KEYWORDS.length + (needsFallbackSearch ? FALLBACK_SEARCH_KEYWORDS.length : 0);
    if (successfulResults.length === 0) throw new Error("All Kakao Local restaurant searches failed");

    const seen = new Map<string, KakaoDocument>();
    for (const result of successfulResults) {
      for (const doc of result.documents) {
        if (!seen.has(doc.id)) seen.set(doc.id, doc);
      }
    }

    const merged = [...seen.values()].sort((a, b) => {
      const da = toNumberOrNull(a.distance ?? null) ?? Infinity;
      const db = toNumberOrNull(b.distance ?? null) ?? Infinity;
      return da - db;
    });

    const restaurants = merged.map(mapDocument);

    return NextResponse.json(
      {
        success: true,
        data: { restaurants, count: restaurants.length, searchRange: { lat, lng, radius } },
        error: null,
        meta: { requestId, partial: successfulResults.length < attemptedSearchCount },
      },
      { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600", "Content-Language": "ko", "X-Request-Id": requestId } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "INVALID_QUERY", message: "검색 조건을 확인해 주세요." }, meta: { requestId } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "반려동물 동반 식당 정보를 불러오지 못했습니다." }, meta: { requestId } },
      { status: 502 },
    );
  }
}
