import { SqliteOwnerRepository, type OwnerSession } from "@/data/database/owner-repository";

export const ownerSessionCookie = "gachi-owner-session";
export const ownerStateCookie = "gachi-owner-oauth-state";

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
}

export function loadOwnerSession(request: Request): OwnerSession | null {
  const token = readCookie(request, ownerSessionCookie);
  if (!token) return null;
  const repository = new SqliteOwnerRepository();
  try {
    return repository.getSession(token);
  } finally {
    repository.close();
  }
}

export function getGoogleRedirectUri(request: Request): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
  return `${base.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function hasGoogleOAuthConfig(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function secureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}
