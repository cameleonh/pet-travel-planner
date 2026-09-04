import type { MetadataRoute } from "next";
import { loadPlaceSnapshot } from "@/data/providers";

const SITE_URL = "https://gggo.blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { snapshot } = await loadPlaceSnapshot();
  return snapshot.places.map((place) => ({
    url: `${SITE_URL}/place/${encodeURIComponent(place.id)}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}
