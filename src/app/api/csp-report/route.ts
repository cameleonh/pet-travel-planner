import { NextResponse } from "next/server";
import { recordCspReport, type CspReportInput } from "@/app/api/_shared/csp-reports";

export const dynamic = "force-dynamic";

// Collects Content-Security-Policy violation reports (report-uri / report-to).
// Browsers POST these without Fetch Metadata, so the middleware exempts this
// path from the scrape gate. Reports are stored anonymously in the database.
type LegacyReport = {
  "csp-report"?: {
    "document-uri"?: string;
    "blocked-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    disposition?: string;
    "source-file"?: string;
    "line-number"?: number;
  };
};
type ModernReport = {
  type?: string;
  body?: {
    documentURL?: string;
    blockedURL?: string;
    effectiveDirective?: string;
    disposition?: string;
    sourceFile?: string;
    lineNumber?: number;
  };
};

function parseReport(body: string, userAgent: string | null): CspReportInput | null {
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return null; }
  const empty: CspReportInput = { documentUri: null, blockedUri: null, violatedDirective: null, effectiveDirective: null, disposition: null, sourceFile: null, lineNumber: null, userAgent };

  if (Array.isArray(parsed)) {
    const modern = (parsed as ModernReport[]).find((entry) => entry && typeof entry === "object" && entry.type === "csp-violation");
    const b = modern?.body;
    if (!b) return null;
    return {
      ...empty,
      documentUri: b.documentURL ?? null,
      blockedUri: b.blockedURL ?? null,
      violatedDirective: b.effectiveDirective ?? null,
      effectiveDirective: b.effectiveDirective ?? null,
      disposition: b.disposition ?? null,
      sourceFile: b.sourceFile ?? null,
      lineNumber: typeof b.lineNumber === "number" ? b.lineNumber : null,
    };
  }
  if (parsed && typeof parsed === "object") {
    const r = (parsed as LegacyReport)["csp-report"];
    if (!r) return null;
    return {
      ...empty,
      documentUri: r["document-uri"] ?? null,
      blockedUri: r["blocked-uri"] ?? null,
      violatedDirective: r["violated-directive"] ?? null,
      effectiveDirective: r["effective-directive"] ?? null,
      disposition: r.disposition ?? null,
      sourceFile: r["source-file"] ?? null,
      lineNumber: typeof r["line-number"] === "number" ? r["line-number"] : null,
    };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.text()).slice(0, 4000);
    const entry = parseReport(body, request.headers.get("user-agent"));
    if (entry) {
      recordCspReport(entry);
      console.error(`[csp-report] directive=${entry.effectiveDirective ?? entry.violatedDirective ?? "?"} blocked=${entry.blockedUri ?? "?"}`);
    }
  } catch {
    // Reporting must never fail the request.
  }
  return new NextResponse(null, { status: 204 });
}

export function GET() {
  return new NextResponse(null, { status: 204 });
}
