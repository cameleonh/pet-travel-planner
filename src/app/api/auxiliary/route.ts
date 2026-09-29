import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadPlaceSnapshot } from "@/data/providers";

// Nearby auxiliary places (museum/park/parking/veterinary/toilet). Served on
// demand so the home page no longer ships ~1k rows inside its RSC payload.
export async function GET() {
  const requestId = randomUUID();
  try {
    const { snapshot } = await loadPlaceSnapshot();
    return NextResponse.json(
      { success: true, data: snapshot.auxiliaryPlaces, error: null, meta: { requestId } },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Content-Language": "ko",
          "X-Request-Id": requestId,
        },
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "주변 정보를 불러오지 못했습니다." }, meta: { requestId } },
      { status: 502 },
    );
  }
}
