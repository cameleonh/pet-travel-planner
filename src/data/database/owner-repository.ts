import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { applyMigrations, resolveDatabasePath } from "@/data/database/repository";

export const ownerRoles = ["traveler", "pending_owner", "owner", "admin"] as const;
export type OwnerRole = (typeof ownerRoles)[number];

export const closureKinds = ["weekly", "date"] as const;
export type ClosureKind = (typeof closureKinds)[number];

export type GoogleProfile = {
  readonly subject: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
};

export type OwnerUser = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly role: OwnerRole;
};

export type OwnerSession = {
  readonly token: string;
  readonly user: OwnerUser;
  readonly expiresAt: string;
};

export type PlaceClaim = {
  readonly id: string;
  readonly placeId: string;
  readonly status: "pending" | "approved" | "rejected";
  readonly businessPhone: string | null;
  readonly note: string | null;
  readonly createdAt: string;
};

export type PlaceClosure = {
  readonly id: string;
  readonly placeId: string;
  readonly closureKind: ClosureKind;
  readonly weekday: number | null;
  readonly closureDate: string | null;
  readonly reason: string;
  readonly updatedAt: string;
};

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: OwnerRole;
};

type ClaimRow = {
  id: string;
  place_id: string;
  status: PlaceClaim["status"];
  business_phone: string | null;
  note: string | null;
  created_at: string;
};

type ClosureRow = {
  id: string;
  place_id: string;
  closure_kind: ClosureKind;
  weekday: number | null;
  closure_date: string | null;
  reason: string;
  updated_at: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function rowToUser(row: UserRow): OwnerUser {
  return { id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url, role: row.role };
}

function rowToClaim(row: ClaimRow): PlaceClaim {
  return { id: row.id, placeId: row.place_id, status: row.status, businessPhone: row.business_phone, note: row.note, createdAt: row.created_at };
}

function rowToClosure(row: ClosureRow): PlaceClosure {
  return {
    id: row.id,
    placeId: row.place_id,
    closureKind: row.closure_kind,
    weekday: row.weekday,
    closureDate: row.closure_date,
    reason: row.reason,
    updatedAt: row.updated_at,
  };
}

function allowlistedEmail(email: string): boolean {
  const allowlist = process.env.OWNER_EMAIL_ALLOWLIST?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  return allowlist.includes(email.toLowerCase());
}

export class SqliteOwnerRepository {
  readonly path: string;
  private readonly db: Database.Database;

  constructor(path = resolveDatabasePath()) {
    this.path = path === ":memory:" ? path : resolve(path);
    if (this.path !== ":memory:") mkdirSync(dirname(this.path), { recursive: true });
    this.db = new Database(this.path);
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    if (this.path !== ":memory:") this.db.pragma("journal_mode = WAL");
    applyMigrations(this.db);
  }

  upsertGoogleUser(profile: GoogleProfile): OwnerUser {
    const now = new Date().toISOString();
    const existing = this.db.prepare("SELECT id, email, display_name, avatar_url, role FROM owner_users WHERE google_subject = ?").get(profile.subject) as UserRow | undefined;
    if (existing) {
      const role: OwnerRole = existing.role === "admin" || existing.role === "owner" || allowlistedEmail(profile.email) ? (existing.role === "admin" ? "admin" : "owner") : existing.role;
      this.db.prepare("UPDATE owner_users SET email = ?, display_name = ?, avatar_url = ?, role = ?, updated_at = ? WHERE id = ?").run(profile.email, profile.displayName, profile.avatarUrl, role, now, existing.id);
      return rowToUser({ ...existing, email: profile.email, display_name: profile.displayName, avatar_url: profile.avatarUrl, role });
    }
    const role: OwnerRole = allowlistedEmail(profile.email) ? "owner" : "pending_owner";
    const id = randomUUID();
    this.db.prepare("INSERT INTO owner_users (id, google_subject, email, display_name, avatar_url, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, profile.subject, profile.email, profile.displayName, profile.avatarUrl, role, now, now);
    return { id, email: profile.email, displayName: profile.displayName, avatarUrl: profile.avatarUrl, role };
  }

  createSession(user: OwnerUser, durationMs = 1000 * 60 * 60 * 24 * 30): OwnerSession {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + durationMs).toISOString();
    this.db.prepare("INSERT INTO owner_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(hashToken(token), user.id, expiresAt, new Date().toISOString());
    return { token, user, expiresAt };
  }

  getSession(token: string): OwnerSession | null {
    const row = this.db.prepare("SELECT s.expires_at, u.id, u.email, u.display_name, u.avatar_url, u.role FROM owner_sessions s JOIN owner_users u ON u.id = s.user_id WHERE s.token_hash = ?").get(hashToken(token)) as (UserRow & { expires_at: string }) | undefined;
    if (!row) return null;
    if (Date.parse(row.expires_at) <= Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return { token, user: rowToUser(row), expiresAt: row.expires_at };
  }

  deleteSession(token: string): void {
    this.db.prepare("DELETE FROM owner_sessions WHERE token_hash = ?").run(hashToken(token));
  }

  listClaims(userId: string): readonly PlaceClaim[] {
    const rows = this.db.prepare("SELECT id, place_id, status, business_phone, note, created_at FROM place_claims WHERE user_id = ? ORDER BY created_at DESC").all(userId) as ClaimRow[];
    return rows.map(rowToClaim);
  }

  isKnownPlace(placeId: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 AS ok
      FROM places
      WHERE snapshot_id = (
        SELECT s.id
        FROM sync_runs r
        JOIN source_snapshots s ON s.id = r.snapshot_id
        WHERE r.status = 'success'
        ORDER BY r.finished_at DESC, r.id DESC
        LIMIT 1
      ) AND place_id = ?
      LIMIT 1
    `).get(placeId) as { ok: number } | undefined;
    return row?.ok === 1;
  }

  claimPlace(user: OwnerUser, placeId: string, businessPhone: string | null, note: string | null): PlaceClaim {
    const existing = this.db.prepare("SELECT id, place_id, status, business_phone, note, created_at FROM place_claims WHERE user_id = ? AND place_id = ?").get(user.id, placeId) as ClaimRow | undefined;
    if (existing) return rowToClaim(existing);
    const now = new Date().toISOString();
    const status = user.role === "owner" || user.role === "admin" ? "approved" : "pending";
    const row: ClaimRow = { id: randomUUID(), place_id: placeId, status, business_phone: businessPhone, note, created_at: now };
    this.db.prepare("INSERT INTO place_claims (id, place_id, user_id, status, business_phone, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(row.id, row.place_id, user.id, row.status, row.business_phone, row.note, row.created_at);
    return rowToClaim(row);
  }

  canManagePlace(user: OwnerUser, placeId: string): boolean {
    if (user.role === "admin") return true;
    if (user.role !== "owner") return false;
    const claim = this.db.prepare("SELECT 1 AS ok FROM place_claims WHERE user_id = ? AND place_id = ? AND status = 'approved'").get(user.id, placeId) as { ok: number } | undefined;
    return claim?.ok === 1;
  }

  listClosures(placeId: string): readonly PlaceClosure[] {
    const rows = this.db.prepare("SELECT id, place_id, closure_kind, weekday, closure_date, reason, updated_at FROM place_closures WHERE place_id = ? AND active = 1 ORDER BY closure_kind, weekday, closure_date").all(placeId) as ClosureRow[];
    return rows.map(rowToClosure);
  }

  addClosure(user: OwnerUser, input: { readonly placeId: string; readonly closureKind: ClosureKind; readonly weekday: number | null; readonly closureDate: string | null; readonly reason: string }): PlaceClosure {
    if (!this.canManagePlace(user, input.placeId)) throw new Error("PLACE_NOT_APPROVED");
    const now = new Date().toISOString();
    const row: ClosureRow = { id: randomUUID(), place_id: input.placeId, closure_kind: input.closureKind, weekday: input.weekday, closure_date: input.closureDate, reason: input.reason, updated_at: now };
    this.db.prepare("INSERT INTO place_closures (id, place_id, owner_user_id, closure_kind, weekday, closure_date, reason, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)").run(row.id, row.place_id, user.id, row.closure_kind, row.weekday, row.closure_date, row.reason, now, now);
    return rowToClosure(row);
  }

  deleteClosure(user: OwnerUser, closureId: string): boolean {
    const row = this.db.prepare("SELECT place_id FROM place_closures WHERE id = ? AND active = 1").get(closureId) as { place_id: string } | undefined;
    if (!row || !this.canManagePlace(user, row.place_id)) return false;
    const result = this.db.prepare("UPDATE place_closures SET active = 0, updated_at = ? WHERE id = ? AND active = 1").run(new Date().toISOString(), closureId);
    return result.changes === 1;
  }

  close(): void {
    this.db.close();
  }
}
