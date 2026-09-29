import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Unauthenticated liveness probe. Excluded from the API scrape gate in
// middleware so uptime monitors with a plain HTTP client still get a 200.
export async function GET() {
  return NextResponse.json(
    { success: true, status: "ok", data: { uptimeSeconds: Math.round(process.uptime()) }, error: null, meta: { timestamp: new Date().toISOString() } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
