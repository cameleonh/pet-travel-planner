import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getGoogleRedirectUri, hasGoogleOAuthConfig, ownerStateCookie, secureCookie } from "@/server/owner-auth";

export function GET(request: Request): Response {
  if (!hasGoogleOAuthConfig()) {
    return NextResponse.json({ success: false, error: { code: "GOOGLE_OAUTH_NOT_CONFIGURED", message: "Google OAuth 환경변수를 설정한 뒤 운영자 로그인을 사용할 수 있습니다." } }, { status: 503 });
  }
  const state = randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
    redirect_uri: getGoogleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set(ownerStateCookie, state, { httpOnly: true, sameSite: "lax", secure: secureCookie(), maxAge: 600, path: "/" });
  return response;
}
