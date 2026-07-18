import { describe, expect, it } from "vitest";
import { loadPlaceSnapshot } from "@/data/providers";

describe("provider outage regressions", () => {
  // Regression: ISSUE-001 — a transient live-provider 502 crashed the complete home page.
  // Found by /qa on 2026-07-16.
  // Report: .gstack/qa-reports/qa-report-localhost-2026-07-16.md
  it("falls back to the deterministic fixture when the live provider is temporarily unavailable", async () => {
    const result = await loadPlaceSnapshot({
      provider: {
        name: "tour-api",
        getSnapshot: async () => { throw new Error("Tour API request failed with status 502."); },
      },
    });

    expect(result.snapshot.provider).toBe("fixture");
    expect(result.dataSource).toBe("fixture");
    expect(result.snapshot.places).toHaveLength(2);
    expect(result.notice).toContain("공식 관광 데이터를 불러오지 못해");
  });

  it("falls back with a database-specific notice when no successful snapshot exists", async () => {
    const result = await loadPlaceSnapshot({
      provider: {
        name: "database",
        getSnapshot: async () => { throw new Error("No snapshot"); },
      },
    });
    expect(result.dataSource).toBe("fixture");
    expect(result.notice).toContain("저장된 관광 데이터가 아직 없어");
  });
});
