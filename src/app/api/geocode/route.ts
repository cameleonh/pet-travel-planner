import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchKakaoLocal } from "@/app/api/_shared/kakao-local";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

const addressDocumentSchema = z.object({
  address_name: z.string().min(1),
  y: z.string(),
  x: z.string(),
  road_address: z.object({ address_name: z.string() }).passthrough().nullable().optional(),
}).passthrough();

const keywordDocumentSchema = z.object({
  place_name: z.string().min(1),
  address_name: z.string().default(""),
  road_address_name: z.string().nullable().optional(),
  y: z.string(),
  x: z.string(),
}).passthrough();

const addressResponseSchema = z.object({ documents: z.array(addressDocumentSchema).default([]) }).passthrough();
const keywordResponseSchema = z.object({ documents: z.array(keywordDocumentSchema).default([]) }).passthrough();

const ADDRESS_API = "https://dapi.kakao.com/v2/local/search/address.json";
const KEYWORD_API = "https://dapi.kakao.com/v2/local/search/keyword.json";

function toNumberOrNull(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    const { q } = querySchema.parse({ q: url.searchParams.get("q") ?? undefined });

    const addressUrl = new URL(ADDRESS_API);
    addressUrl.searchParams.set("query", q);
    addressUrl.searchParams.set("size", "1");
    const addressResponse = await fetchKakaoLocal(addressUrl, apiKey, request.signal, { timeoutMs: 2_500, maxAttempts: 1 });
    if (addressResponse.ok) {
      const parsed = addressResponseSchema.safeParse(await addressResponse.json());
      const document = parsed.success ? parsed.data.documents[0] : undefined;
      const latitude = document ? toNumberOrNull(document.y) : null;
      const longitude = document ? toNumberOrNull(document.x) : null;
      if (document && latitude !== null && longitude !== null) {
        return NextResponse.json(
          {
            success: true,
            data: {
              name: document.road_address?.address_name ?? document.address_name,
              address: document.address_name,
              roadAddress: document.road_address?.address_name ?? null,
              latitude,
              longitude,
            },
            error: null,
            meta: { requestId, match: "address" },
          },
          { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600", "Content-Language": "ko", "X-Request-Id": requestId } },
        );
      }
    }

    const keywordUrl = new URL(KEYWORD_API);
    keywordUrl.searchParams.set("query", q);
    keywordUrl.searchParams.set("size", "1");
    const keywordResponse = await fetchKakaoLocal(keywordUrl, apiKey, request.signal, { timeoutMs: 1_800, maxAttempts: 1 });
    if (keywordResponse.ok) {
      const parsed = keywordResponseSchema.safeParse(await keywordResponse.json());
      const document = parsed.success ? parsed.data.documents[0] : undefined;
      const latitude = document ? toNumberOrNull(document.y) : null;
      const longitude = document ? toNumberOrNull(document.x) : null;
      if (document && latitude !== null && longitude !== null) {
        return NextResponse.json(
          {
            success: true,
            data: {
              name: document.place_name,
              address: document.address_name,
              roadAddress: document.road_address_name ?? null,
              latitude,
              longitude,
            },
            error: null,
            meta: { requestId, match: "place" },
          },
          { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600", "Content-Language": "ko", "X-Request-Id": requestId } },
        );
      }
    }

    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: "입력한 위치를 찾지 못했어요." }, meta: { requestId } },
      { status: 404, headers: { "Content-Language": "ko", "X-Request-Id": requestId } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "INVALID_QUERY", message: "위치 검색어를 확인해 주세요." }, meta: { requestId } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "위치를 확인하지 못했습니다." }, meta: { requestId } },
      { status: 502 },
    );
  }
}
