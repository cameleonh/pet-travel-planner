import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("shared plan store", () => {
  let dir: string;
  let previousPath: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "shared-plans-"));
    previousPath = process.env.DATABASE_PATH;
    process.env.DATABASE_PATH = join(dir, "test.sqlite");
    vi.resetModules();
  });

  afterEach(() => {
    if (previousPath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousPath;
    // The module keeps its SQLite handle open for the process lifetime, which
    // can keep the temp file locked on Windows; leaving it behind is harmless.
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore locked temp files
    }
  });

  it("round-trips a stored plan with camelCase fields", async () => {
    const { saveSharedPlan, loadSharedPlan } = await import("@/app/api/_shared/shared-plans");
    const payload = JSON.stringify({ tripDate: "2026-10-03", places: [{ name: "점검 장소" }], routes: [] });

    const code = saveSharedPlan(payload);
    expect(code).toMatch(/^[a-z2-9]{6}$/);

    const row = loadSharedPlan(code!);
    expect(row).not.toBeNull();
    expect(row?.planJson).toBe(payload);
    expect(typeof row?.createdAt).toBe("string");
  });

  it("returns null for an unknown code", async () => {
    const { loadSharedPlan } = await import("@/app/api/_shared/shared-plans");
    expect(loadSharedPlan("zzzz99")).toBeNull();
  });
});
