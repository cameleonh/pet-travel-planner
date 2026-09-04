import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.json({
    ip: (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown",
    xff: request.headers.get("x-forwarded-for") ?? null,
    forwarded: request.headers.get("forwarded") ?? null,
    host: request.headers.get("host") ?? null,
    ua: request.headers.get("user-agent") ?? null,
    sec: request.headers.get("sec-fetch-mode") ?? null,
  });
}
