import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteOwnerRepository } from "@/data/database/owner-repository";

const directories: string[] = [];
const originalAllowlist = process.env.OWNER_EMAIL_ALLOWLIST;

afterEach(() => {
  if (originalAllowlist === undefined) delete process.env.OWNER_EMAIL_ALLOWLIST;
  else process.env.OWNER_EMAIL_ALLOWLIST = originalAllowlist;
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function temporaryDatabase(): string {
  const directory = mkdtempSync(join(tmpdir(), "pet-travel-owner-"));
  directories.push(directory);
  return join(directory, "owner.sqlite");
}

describe("SQLite owner repository", () => {
  it("keeps Google identity separate from owner approval", () => {
    const repository = new SqliteOwnerRepository(temporaryDatabase());
    const user = repository.upsertGoogleUser({ subject: "google-subject", email: "pending@example.com", displayName: "Pending", avatarUrl: null });
    const claim = repository.claimPlace(user, "tour-api:123", null, "운영자 확인 요청");
    expect(user.role).toBe("pending_owner");
    expect(claim.status).toBe("pending");
    expect(repository.canManagePlace(user, "tour-api:123")).toBe(false);
    repository.close();
  });

  it("allows an approved owner to maintain weekly and temporary closures", () => {
    process.env.OWNER_EMAIL_ALLOWLIST = "owner@example.com";
    const repository = new SqliteOwnerRepository(temporaryDatabase());
    const user = repository.upsertGoogleUser({ subject: "owner-subject", email: "owner@example.com", displayName: "Owner", avatarUrl: null });
    const claim = repository.claimPlace(user, "tour-api:456", "02-1234-5678", null);
    expect(claim.status).toBe("approved");
    const weekly = repository.addClosure(user, { placeId: claim.placeId, closureKind: "weekly", weekday: 1, closureDate: null, reason: "매주 월요일 휴무" });
    repository.addClosure(user, { placeId: claim.placeId, closureKind: "date", weekday: null, closureDate: "2026-08-15", reason: "임시 휴무" });
    expect(repository.listClosures(claim.placeId)).toHaveLength(2);
    expect(repository.deleteClosure(user, weekly.id)).toBe(true);
    expect(repository.listClosures(claim.placeId)).toHaveLength(1);
    repository.close();
  });

  it("rejects expired sessions", () => {
    const repository = new SqliteOwnerRepository(temporaryDatabase());
    const user = repository.upsertGoogleUser({ subject: "session-subject", email: "session@example.com", displayName: "Session", avatarUrl: null });
    const session = repository.createSession(user, -1);
    expect(repository.getSession(session.token)).toBeNull();
    repository.close();
  });
});
