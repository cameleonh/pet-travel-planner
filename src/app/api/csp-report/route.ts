import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Collects Content-Security-Policy violation reports (report-uri / report-to).
// Browsers POST these without Fetch Metadata, so the middleware exempts this
// path from the scrape gate. Reports are written to the server log (journald).
export async function POST(request: Request) {
  try {
    const body = (await request.text()).slice(0, 2000);
    if (body) console.error(`[csp-report] ${body}`);
  } catch {
    // Reporting must never fail the request.
  }
  return new NextResponse(null, { status: 204 });
}

export function GET() {
  return new NextResponse(null, { status: 204 });
}
