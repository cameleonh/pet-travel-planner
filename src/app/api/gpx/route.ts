import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const ALLOWED_PREFIX = "https://www.durunubi.kr/";

const paramsSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .url()
    .refine((u) => u.startsWith(ALLOWED_PREFIX), { message: "허용되지 않은 출처입니다." }),
  name: z.string().trim().min(1).max(120),
});

/**
 * Build a Content-Disposition header that works for both ASCII-only and
 * UTF-8 (Korean) filenames per RFC 5987:
 *   attachment; filename="ascii.gpx"; filename*=UTF-8''%ED%95%9C.gpx
 */
function buildContentDisposition(rawName: string): string {
  const cleaned = rawName.replace(/\.gpx$/i, "").trim() || "trail";
  const asciiFallback =
    cleaned
      .replace(/["\\]/g, "")
      .replace(/[<>:/|?*\x00-\x1f]/g, "")
      .replace(/[^\x20-\x7e]/g, "")
      .trim()
      .slice(0, 80) || "trail";
  const utf8Encoded = encodeURIComponent(cleaned.slice(0, 80));
  return `attachment; filename="${asciiFallback}.gpx"; filename*=UTF-8''${utf8Encoded}.gpx`;
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const { searchParams } = new URL(request.url);
    const parsed = paramsSchema.safeParse({
      url: searchParams.get("url") ?? "",
      name: searchParams.get("name") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "INVALID_QUERY", message: "요청 매개변수를 확인해 주세요." }, meta: { requestId } },
        { status: 400 }
      );
    }

    const { url: gpxUrl, name } = parsed.data;

    const upstream = await fetch(gpxUrl, { redirect: "follow" });
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "UPSTREAM_ERROR", message: "GPX 파일을 가져오지 못했습니다." }, meta: { requestId } },
        { status: 502 }
      );
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "UPSTREAM_ERROR", message: "GPX 파일이 비어 있습니다." }, meta: { requestId } },
        { status: 502 }
      );
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": buildContentDisposition(name),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "GPX 파일을 불러오지 못했습니다." }, meta: { requestId } },
      { status: 502 }
    );
  }
}
