"use client";

import {
  getTmapDeepLink,
  getKakaoNaviDeepLink,
  getKakaoMapWebLink,
  getNaverMapDeepLink,
  type Coordinate,
} from "@/domain/navigation";

interface NaviActionButtonsProps {
  name: string;
  coordinates: Coordinate;
}

export function NaviActionButtons({ name, coordinates }: NaviActionButtonsProps) {
  const handleTmap = () => {
    const deepLink = getTmapDeepLink(name, coordinates);
    const webFallback = getKakaoMapWebLink(name, coordinates);
    const start = Date.now();
    window.location.href = deepLink;
    setTimeout(() => {
      if (Date.now() - start < 1500) {
        window.open(webFallback, "_blank");
      }
    }, 1000);
  };

  const handleKakaoNavi = () => {
    const deepLink = getKakaoNaviDeepLink(name, coordinates);
    const webFallback = getKakaoMapWebLink(name, coordinates);
    const start = Date.now();
    window.location.href = deepLink;
    setTimeout(() => {
      if (Date.now() - start < 1500) {
        window.open(webFallback, "_blank");
      }
    }, 1000);
  };

  const handleNaverMap = () => {
    const deepLink = getNaverMapDeepLink(name, coordinates);
    const webFallback = getKakaoMapWebLink(name, coordinates);
    const start = Date.now();
    window.location.href = deepLink;
    setTimeout(() => {
      if (Date.now() - start < 1500) {
        window.open(webFallback, "_blank");
      }
    }, 1000);
  };

  return (
    <div className="navi-btn-group" aria-label="내비게이션 길안내 바로가기">
      <span className="navi-label">🚗 바로 길안내:</span>
      <button
        type="button"
        className="navi-btn tmap"
        onClick={handleTmap}
        title="티맵으로 길안내 시작"
      >
        티맵
      </button>
      <button
        type="button"
        className="navi-btn kakao"
        onClick={handleKakaoNavi}
        title="카카오내비로 길안내 시작"
      >
        카카오내비
      </button>
      <button
        type="button"
        className="navi-btn naver"
        onClick={handleNaverMap}
        title="네이버지도로 길안내 시작"
      >
        네이버
      </button>
    </div>
  );
}
