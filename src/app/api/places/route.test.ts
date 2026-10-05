import { describe, expect, it } from "vitest";
import { buildCatalogPage } from "@/data/catalog";
import { FixturePlaceProvider } from "@/data/providers/fixture-provider";
import { compactCatalogForTransport } from "@/data/catalog-transport";

describe("places API transport", () => {
  it("removes unused repeated matching internals while preserving visible proof", async () => {
    const snapshot = await new FixturePlaceProvider().getSnapshot();
    const catalog = buildCatalogPage(snapshot, {
      hard: [{ key: "smallDog", label: "소형견 가능", kind: "hard", protectedCategory: "admission" }],
      preferences: [],
      page: 1,
    });
    const compact = compactCatalogForTransport(catalog);
    const result = compact.results[0]!;
    const rawBytes = Buffer.byteLength(JSON.stringify(catalog));
    const compactBytes = Buffer.byteLength(JSON.stringify(compact));

    expect(result).not.toHaveProperty("failures");
    expect(result.place).not.toHaveProperty("facts");
    expect(result.place.requiredPreparations[0]?.evidence).toEqual(expect.objectContaining({
      excerpt: expect.any(String),
      sourceUrl: expect.any(String),
      observedAt: expect.any(String),
    }));
    expect(result.place.requiredPreparations[0]?.evidence).not.toHaveProperty("sourceText");
    expect(result.proof[0]?.fact).not.toHaveProperty("evidence");
    expect(result.proof[0]?.evidence).toEqual(expect.objectContaining({ excerpt: expect.any(String), sourceUrl: expect.any(String), observedAt: expect.any(String) }));
    expect(compactBytes).toBeLessThan(rawBytes * 0.65);
  });
});
