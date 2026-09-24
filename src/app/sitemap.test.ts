import { describe, expect, it } from "vitest";
import { buildSitemapEntries } from "@/app/sitemap";
import { FixturePlaceProvider } from "@/data/providers/fixture-provider";

describe("sitemap", () => {
  it("never publishes deterministic fixture place URLs", async () => {
    const snapshot = await new FixturePlaceProvider().getSnapshot();
    const entries = buildSitemapEntries(snapshot.places, "fixture");

    expect(entries.map(({ url }) => url)).toEqual([
      "https://gggo.blog",
      "https://gggo.blog/temple-stay",
    ]);
  });

  it("includes only fetched, non-fixture records from the selected catalog", async () => {
    const snapshot = await new FixturePlaceProvider().getSnapshot();
    const [example] = snapshot.places;
    const entries = buildSitemapEntries([
      { ...example!, id: "tour-api:published", sourceModifiedAt: "2026-08-05T15:10:40.323Z", petDetailStatus: "fetched" },
      { ...example!, id: "tour-api:pending", petDetailStatus: "not-fetched" },
      { ...example!, id: "tour-api:failed", petDetailStatus: "failed" },
      { ...example!, id: "fixture-attraction-001", petDetailStatus: "fetched" },
    ], "database");

    expect(entries.map(({ url }) => url)).toEqual([
      "https://gggo.blog",
      "https://gggo.blog/temple-stay",
      "https://gggo.blog/place/tour-api%3Apublished",
    ]);
    expect(entries.at(-1)?.lastModified).toEqual(new Date("2026-08-05T15:10:40.323Z"));
  });
});
