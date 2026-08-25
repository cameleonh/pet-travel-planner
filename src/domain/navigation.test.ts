import { describe, expect, it } from "vitest";
import {
  getTmapDeepLink,
  getKakaoNaviDeepLink,
  getKakaoMapWebLink,
  getNaverMapDeepLink,
  getNaverMapWebLink,
  type Coordinate,
} from "./navigation";

describe("navigation deep link generators", () => {
  const coords: Coordinate = { latitude: 37.5665, longitude: 126.978 };
  const name = "서울 숲 공원";

  it("generates correct Tmap deep link", () => {
    const link = getTmapDeepLink(name, coords);
    expect(link).toContain("tmap://route?");
    expect(link).toContain(`goalname=${encodeURIComponent(name)}`);
    expect(link).toContain("goaly=37.5665");
    expect(link).toContain("goalx=126.978");
  });

  it("generates correct KakaoNavi deep link", () => {
    const link = getKakaoNaviDeepLink(name, coords);
    expect(link).toContain("kakaonavi://navigate?");
    expect(link).toContain("coord_type=wgs84");
    expect(link).toContain(`name=${encodeURIComponent(name)}`);
    expect(link).toContain("x=126.978");
    expect(link).toContain("y=37.5665");
  });

  it("generates correct KakaoMap web link", () => {
    const link = getKakaoMapWebLink(name, coords);
    expect(link).toBe(`https://map.kakao.com/link/to/${encodeURIComponent(name)},37.5665,126.978`);
  });

  it("generates correct Naver Map deep link", () => {
    const link = getNaverMapDeepLink(name, coords);
    expect(link).toContain("nmap://navigation?");
    expect(link).toContain("dlat=37.5665");
    expect(link).toContain("dlng=126.978");
    expect(link).toContain(`dname=${encodeURIComponent(name)}`);
  });

  it("generates correct Naver Map web link", () => {
    const link = getNaverMapWebLink(name, coords);
    expect(link).toContain("https://map.naver.com/v5/directions/-/-/");
    expect(link).toContain("126.978,37.5665");
    expect(link).toContain(encodeURIComponent(name));
  });
});
