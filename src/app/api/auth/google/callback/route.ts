import { NextResponse } from "next/server";
import { z } from "zod";
import { SqliteOwnerRepository } from "@/data/database/owner-repository";
import { getGoogleRedirectUri, hasGoogleOAuthConfig, ownerSessionCookie, ownerStateCookie, readCookie, secureCookie } from "@/server/owner-auth";

const tokenSchema = z.object({ access_token: z.string().min(1) });
const profileSchema = z.object({ sub: z.string().min(1), email: z.string().email(), name: z.string().min(1).default("운영자"), picture: z.string().url().nullish() });

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = readCookie(request, ownerStateCookie);
  if (!code || !state || !savedState || state !== savedState) return NextResponse.json({ success: false, error: { code: "INVALID_OAUTH_STATE", message: "로그인 요청이 만료되었습니다. 다시 시도해 주세요." } }, { status: 400 });
  if (!hasGoogleOAuthConfig()) return NextResponse.json({ success: false, error: { code: "GOOGLE_OAUTH_NOT_CONFIGURED", message: "Google OAuth 환경변수를 설정해 주세요." } }, { status: 503 });

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
        redirect_uri: getGoogleRedirectUri(request),
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error(`Google token exchange failed with ${tokenResponse.status}`);
    const token = tokenSchema.parse(await tokenResponse.json());
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    if (!profileResponse.ok) throw new Error(`Google profile lookup failed with ${profileResponse.status}`);
    const profile = profileSchema.parse(await profileResponse.json());
    const repository = new SqliteOwnerRepository();
    try {
      const user = repository.upsertGoogleUser({ subject: profile.sub, email: profile.email, displayName: profile.name, avatarUrl: profile.picture ?? null });
      const session = repository.createSession(user);
      const response = NextResponse.redirect(new URL("/owner/places", request.url));
      response.cookies.set(ownerSessionCookie, session.token, { httpOnly: true, sameSite: "lax", secure: secureCookie(), maxAge: 60 * 60 * 24 * 30, path: "/" });
      response.cookies.set(ownerStateCookie, "", { httpOnly: true, sameSite: "lax", secure: secureCookie(), maxAge: 0, path: "/" });
      return response;
    } finally {
      repository.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google 로그인에 실패했습니다.";
    return NextResponse.json({ success: false, error: { code: "GOOGLE_OAUTH_FAILED", message } }, { status: 502 });
  }
}
