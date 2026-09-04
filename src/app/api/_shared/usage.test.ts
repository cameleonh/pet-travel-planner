import { describe, expect, it } from "vitest";
import { usageDayKey, USAGE_EVENT_KINDS } from "@/app/api/_shared/usage";

describe("usage counters", () => {
  it("buckets events by KST calendar day", () => {
    // 2026-09-04 23:30 UTC == 2026-09-05 08:30 KST → must land on the 5th.
    expect(usageDayKey(new Date("2026-09-04T23:30:00Z"))).toBe("2026-09-05");
    // 2026-09-04 10:00 UTC == 19:00 KST → same day.
    expect(usageDayKey(new Date("2026-09-04T10:00:00Z"))).toBe("2026-09-04");
  });

  it("keeps the event vocabulary closed and stable", () => {
    expect(USAGE_EVENT_KINDS).toContain("theme_apply");
    expect(USAGE_EVENT_KINDS).toContain("place_view");
    expect(USAGE_EVENT_KINDS).toContain("plan_generate");
    expect(new Set(USAGE_EVENT_KINDS).size).toBe(USAGE_EVENT_KINDS.length);
  });
});
