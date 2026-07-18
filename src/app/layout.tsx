import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegistration } from "@/app/pwa-registration";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/noto-sans-kr/800.css";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "함께갈지도 — 반려견과 갈 수 있는 곳 찾기",
  description: "반려견 크기와 필요한 조건을 고르면 모두 맞는 장소와 확인 근거를 보여드려요.",
  applicationName: "함께갈지도",
  icons: { icon: "/icon.svg", apple: "/icon.svg" }
};

export const viewport: Viewport = { themeColor: "#18584d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>
        <a className="skip-link" href="#search">검색으로 바로가기</a>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
