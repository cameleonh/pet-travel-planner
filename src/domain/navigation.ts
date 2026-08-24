export interface Coordinate {
  latitude: number;
  longitude: number;
}

export function getTmapDeepLink(name: string, coords: Coordinate): string {
  return `tmap://route?goalname=${encodeURIComponent(name)}&goaly=${coords.latitude}&goalx=${coords.longitude}`;
}

export function getKakaoNaviDeepLink(name: string, coords: Coordinate): string {
  return `kakaonavi://navigate?coord_type=wgs84&name=${encodeURIComponent(name)}&x=${coords.longitude}&y=${coords.latitude}`;
}

export function getKakaoMapWebLink(name: string, coords: Coordinate): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${coords.latitude},${coords.longitude}`;
}

export function getNaverMapDeepLink(name: string, coords: Coordinate): string {
  return `nmap://navigation?dlat=${coords.latitude}&dlng=${coords.longitude}&dname=${encodeURIComponent(name)}&appname=pet-travel-planner`;
}

export function getNaverMapWebLink(name: string, coords: Coordinate): string {
  return `https://map.naver.com/v5/directions/-/-/${coords.longitude},${coords.latitude},${encodeURIComponent(name)}/car`;
}
