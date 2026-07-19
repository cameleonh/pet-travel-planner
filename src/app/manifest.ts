import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "같이갈개",
    short_name: "같이갈개",
    description: "같이갈개, 함께라서 더 가치 있는 여행",
    start_url: "/",
    display: "standalone",
    background_color: "#f6faf8",
    theme_color: "#176b5b",
    lang: "ko",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
  };
}
