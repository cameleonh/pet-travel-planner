import { NextResponse } from "next/server";
import { IpRateLimiter } from "@/domain/api-gate";

// The middleware runtime is stateless in production (each invocation gets a
// fresh context, so in-memory buckets never accumulate there). Route handlers
// run in the persistent Node process, so the per-IP limiter lives here.
const store = globalThis as typeof globalThis & { __ggRouteRateLimiter?: IpRateLimiter };
const limiter = store.__ggRouteRateLimiter ??= new IpRateLimiter(120, 120);

export function enforceRateLimit(request: Request): NextResponse | null {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (!limiter.take(ip)) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "RATE_LIMITED", message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, meta: {} },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }
  return null;
}
