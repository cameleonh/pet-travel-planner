import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegistration } from "@/app/pwa-registration";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/noto-sans-kr/800.css";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "같이갈개 — 반려견과 함께 갈 수 있는 곳",
  description: "함께라서 더 가치 있는 여행, 같이갈개. 반려견 크기와 필요한 조건에 맞는 장소를 찾아드려요.",
  applicationName: "같이갈개",
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
