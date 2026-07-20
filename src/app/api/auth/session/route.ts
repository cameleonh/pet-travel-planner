import { NextResponse } from "next/server";
import { loadOwnerSession } from "@/server/owner-auth";

export function GET(request: Request): Response {
  const session = loadOwnerSession(request);
  return NextResponse.json({ authenticated: Boolean(session), user: session?.user ?? null });
}