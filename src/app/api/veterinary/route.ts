import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

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
const SEARCH_KEYWORD = "동물병원";
const PAGE_SIZE = 15;

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

    const apiUrl = new URL(API_BASE);
    apiUrl.searchParams.set("query", SEARCH_KEYWORD);
    apiUrl.searchParams.set("y", String(lat));
    apiUrl.searchParams.set("x", String(lng));
    apiUrl.searchParams.set("radius", String(radius));
    apiUrl.searchParams.set("size", String(PAGE_SIZE));
    apiUrl.searchParams.set("sort", "distance");

    const response = await fetch(apiUrl.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "동물병원 정보를 불러오지 못했습니다." }, meta: { requestId } },
        { status: 502 },
      );
    }

    const json: unknown = await response.json();
    const parsed = kakaoResponseSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "동물병원 정보를 불러오지 못했습니다." }, meta: { requestId } },
        { status: 502 },
      );
    }

    const documents: KakaoDocument[] = parsed.data.documents;
    const hospitals = documents.map(mapDocument);

    return NextResponse.json(
      {
        success: true,
        data: { hospitals, count: hospitals.length, searchRange: { lat, lng, radius } },
        error: null,
        meta: { requestId },
      },
      { headers: { "Content-Language": "ko", "X-Request-Id": requestId } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "INVALID_QUERY", message: "검색 조건을 확인해 주세요." }, meta: { requestId } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "동물병원 정보를 불러오지 못했습니다." }, meta: { requestId } },
      { status: 502 },
    );
  }
}
