import { NextResponse, type NextRequest } from "next/server";
import { evaluateApiGate, IpRateLimiter } from "@/domain/api-gate";

// Cache on globalThis: the middleware bundle can be re-evaluated per isolate,
// which resets plain module state and silently disarms the limiter (observed
// in production next start). The global object persists per process.
const globalStore = globalThis as typeof globalThis & { __ggApiRateLimiter?: IpRateLimiter };
const limiter = globalStore.__ggApiRateLimiter ??= new IpRateLimiter(120, 120);

// Everything except script-src; script-src gets a per-request nonce so inline
// scripts are allowed only when Next stamps them (no 'unsafe-inline').
const CSP_DIRECTIVES = "default-src 'self'; base-uri 'self'; connect-src 'self' https://*.vworld.kr https://tong.visitkorea.or.kr https://*.kakaocdn.net https://*.pstatic.net https://*.daumcdn.net https://fonts.gstatic.com https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://*.vworld.kr; form-action 'none'; frame-ancestors 'self'; img-src 'self' data: blob: https://cdn.jsdelivr.net https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://tong.visitkorea.or.kr https://*.kakaocdn.net https://*.pstatic.net https://*.daumcdn.net https://*.vworld.kr https://*.googleusercontent.com; media-src 'self'; object-src 'none'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://*.vworld.kr; upgrade-insecure-requests";

function apiError(status: number, code: string, message: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message }, meta: {} },
    { status, headers: extraHeaders },
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    // Health checks are meant for plain HTTP monitors, so they bypass the
    // browser-signal gate and the per-IP rate limiter entirely.
    if (pathname === "/api/health") return NextResponse.next();

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
    const rateLimitDisabled = process.env.GG_RATE_LIMIT_DISABLED === "1";
    if (!rateLimitDisabled && !limiter.take(ip)) {
      return apiError(429, "RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", { "Retry-After": "30" });
    }

    return NextResponse.next();
  }

  // Page routes: issue a per-request nonce. Next reads the CSP from the request
  // header and stamps the nonce onto the scripts it renders.
  const nonce = btoa(crypto.randomUUID());
  const csp = `${CSP_DIRECTIVES}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.vworld.kr https://cdn.jsdelivr.net`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Run on pages + API, but not on static assets or the static HTML pages that
  // carry their own (Apache) CSP.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|night-view\\.html|offline\\.html|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp4|webm|css|js|map|txt|xml|webmanifest)$).*)",
  ],
};
