"use client";

import { getKakaoMapWebLink, getNaverMapWebLink, type Coordinate } from "@/domain/navigation";

interface NaviActionButtonsProps {
  name: string;
  coordinates: Coordinate;
}

// Tmap only ships an app deep link (tmap://) with no web page, so on desktop the
// button silently did nothing. Kakao Map and Naver Map have real web URLs that
// also hand off to their apps on mobile, so those two cover every case.
export function NaviActionButtons({ name, coordinates }: NaviActionButtonsProps) {
  return (
    <div className="navi-btn-group" aria-label="지도에서 길찾기">
      <span className="navi-label">🗺️ 길찾기:</span>
      <a
        className="navi-btn kakao"
        href={getKakaoMapWebLink(name, coordinates)}
        target="_blank"
        rel="noreferrer"
        title="카카오지도에서 길찾기"
      >
        카카오지도
      </a>
      <a
        className="navi-btn naver"
        href={getNaverMapWebLink(name, coordinates)}
        target="_blank"
        rel="noreferrer"
        title="네이버지도에서 길찾기"
      >
        네이버지도
      </a>
    </div>
  );
}
