import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "함께갈지도",
    short_name: "함께갈지도",
    description: "근거로 확인하는 반려동물 동반 여행",
    start_url: "/",
    display: "standalone",
    background_color: "#f6faf8",
    theme_color: "#176b5b",
    lang: "ko",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
  };
}
