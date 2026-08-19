import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchKakaoLocal } from "@/app/api/_shared/kakao-local";

const querySchema = z.object({
  region: z.string().trim().min(1).max(40),
});

const kakaoDocumentSchema = z
  .object({
    id: z.string(),
    place_name: z.string(),
    address_name: z.string(),
    road_address_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    category_name: z.string().nullable().optional(),
    y: z.string(),
    x: z.string(),
    place_url: z.string().nullable().optional(),
  })
  .passthrough();

const kakaoResponseSchema = z
  .object({ documents: z.array(kakaoDocumentSchema).default([]), meta: z.unknown().optional() })
  .passthrough();

type KakaoDocument = z.infer<typeof kakaoDocumentSchema>;

const API_BASE = "https://dapi.kakao.com/v2/local/search/keyword.json";
const PRIMARY_KEYWORD = "반려동물동반 카페";
const FALLBACK_KEYWORD = "강아지동반 카페";
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
    id: `kakao:${doc.id}`,
    name: doc.place_name,
    address: doc.address_name,
    roadAddress: doc.road_address_name ?? null,
    phone: doc.phone && doc.phone !== "" ? doc.phone : null,
    category: doc.category_name ?? null,
    latitude: toNumberOrNull(doc.y),
    longitude: toNumberOrNull(doc.x),
    placeUrl: doc.place_url ?? null,
  };
}

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
    const { region } = querySchema.parse({ region: url.searchParams.get("region") ?? undefined });

    const searchKeyword = async (keyword: string, timeoutMs: number) => {
      const apiUrl = new URL(API_BASE);
      apiUrl.searchParams.set("query", `${region} ${keyword}`);
      apiUrl.searchParams.set("size", String(PAGE_SIZE));
      const response = await fetchKakaoLocal(apiUrl, apiKey, request.signal, { timeoutMs, maxAttempts: 1 });
      if (!response.ok) return [] as KakaoDocument[];
      const json: unknown = await response.json();
      const parsed = kakaoResponseSchema.safeParse(json);
      return parsed.success ? parsed.data.documents : ([] as KakaoDocument[]);
    };

    const primary = await searchKeyword(PRIMARY_KEYWORD, PRIMARY_TIMEOUT_MS);
    const fallback = primary.length < 5 ? await searchKeyword(FALLBACK_KEYWORD, FALLBACK_TIMEOUT_MS) : [];

    const seen = new Map<string, KakaoDocument>();
    for (const doc of [...primary, ...fallback]) {
      if (!seen.has(doc.id)) seen.set(doc.id, doc);
    }
    const cafes = [...seen.values()].map(mapDocument);

    return NextResponse.json(
      {
        success: true,
        data: { cafes, count: cafes.length, region },
        error: null,
        meta: { requestId, disclosure: "keyword-search" },
      },
      { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600", "Content-Language": "ko", "X-Request-Id": requestId } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "INVALID_QUERY", message: "지역 검색어를 확인해 주세요." }, meta: { requestId } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "반려동물 동반 카페 정보를 불러오지 못했습니다." }, meta: { requestId } },
      { status: 502 },
    );
  }
}
