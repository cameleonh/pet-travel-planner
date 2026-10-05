import { NextResponse } from "next/server";
import { loadOwnerSession } from "@/server/owner-auth";
import { cspReportStats } from "@/app/api/_shared/csp-reports";

export function GET(request: Request): Response {
  const session = loadOwnerSession(request);
  if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Google 로그인 후 이용해 주세요." } }, { status: 401 });
  return NextResponse.json({ success: true, data: cspReportStats() });
}
