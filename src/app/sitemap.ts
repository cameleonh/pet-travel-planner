import type { MetadataRoute } from "next";
import type { RawPlace } from "@/data/contracts";
import { loadPlaceSnapshot, type DataSource } from "@/data/providers";

const SITE_URL = "https://gggo.blog";
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/temple-stay`, changeFrequency: "weekly", priority: 0.7 },
];

// Rebuild at most once a day instead of on every request: the full catalog
// sitemap is ~9.7k URLs and is expensive to regenerate for each crawler hit.
export const revalidate = 86400;

export function buildSitemapEntries(places: readonly RawPlace[], dataSource: DataSource): MetadataRoute.Sitemap {
  const entries = [...STATIC_ROUTES];
  if (dataSource === "fixture") return entries;

  const seen = new Set(entries.map((entry) => entry.url));
  for (const place of places) {
    if (place.id.startsWith("fixture-") || (place.petDetailStatus ?? "fetched") !== "fetched") continue;
    const url = `${SITE_URL}/place/${encodeURIComponent(place.id)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const lastModified = new Date(place.sourceModifiedAt ?? place.petPolicy.observedAt);
    entries.push({
      url,
      changeFrequency: "monthly",
      priority: 0.6,
      ...(Number.isNaN(lastModified.getTime()) ? {} : { lastModified }),
    });
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { snapshot, dataSource } = await loadPlaceSnapshot();
  return buildSitemapEntries(snapshot.places, dataSource);
}
