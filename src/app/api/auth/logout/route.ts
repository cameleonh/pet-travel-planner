import { NextResponse } from "next/server";
import { loadOwnerSession, ownerSessionCookie, readCookie, secureCookie } from "@/server/owner-auth";
import { SqliteOwnerRepository } from "@/data/database/owner-repository";

export function POST(request: Request): Response {
  const token = readCookie(request, ownerSessionCookie);
  const session = loadOwnerSession(request);
  if (token && session) {
    const repository = new SqliteOwnerRepository();
    try { repository.deleteSession(token); } finally { repository.close(); }
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(ownerSessionCookie, "", { httpOnly: true, sameSite: "lax", secure: secureCookie(), maxAge: 0, path: "/" });
  return response;
}