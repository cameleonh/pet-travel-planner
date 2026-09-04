import { NextResponse, type NextRequest } from "next/server";
import { evaluateApiGate, IpRateLimiter } from "@/domain/api-gate";

// Module-level so the bucket survives across requests within a runtime
// isolate; resets on deploy/restart, which is acceptable for this purpose.
const limiter = new IpRateLimiter(120, 120);

function apiError(status: number, code: string, message: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message }, meta: {} },
    { status, headers: extraHeaders },
  );
}

export function middleware(request: NextRequest) {
  const verdict = evaluateApiGate({
    userAgent: request.headers.get("user-agent") ?? "",
    secFetchMode: request.headers.get("sec-fetch-mode") ?? "",
    secFetchDest: request.headers.get("sec-fetch-dest") ?? "",
    secFetchSite: request.headers.get("sec-fetch-site") ?? "",
  });
  if (verdict.block) {
    return apiError(403, "FORBIDDEN", "허용되지 않는 접근입니다.");
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (!limiter.take(ip)) {
    return apiError(429, "RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", { "Retry-After": "30" });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
