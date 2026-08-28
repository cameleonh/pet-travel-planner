import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegistration } from "@/app/pwa-registration";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/noto-sans-kr/800.css";
import "@/app/globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gggo.blog";
const OG_TITLE = "같이갈개 — 반려견과 함께 갈 수 있는 곳";
const OG_DESCRIPTION = "함께라서 더 가치 있는 여행, 같이갈개. 반려견 크기와 필요한 조건에 맞는 장소를 찾아드려요.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  applicationName: "같이갈개",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "같이갈개",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: "/og", width: 1200, height: 630, alt: "같이갈개 — 반려견과 함께 떠나는 여행" }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/og"],
  },
};

export const viewport: Viewport = { themeColor: "#18584d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>
        <a className="skip-link" href="#search">검색으로 바로가기 / Skip to search</a>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
