import type { Coordinates } from "@/domain/geo";

export type DailyWeather = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProb: number;
};

export type WeatherCondition = { icon: string; ko: string; en: string; zh: string };

const CONDITION_GROUPERS: { codes: readonly number[]; condition: WeatherCondition }[] = [
  { codes: [0], condition: { icon: "☀️", ko: "맑음", en: "Clear", zh: "晴" } },
  { codes: [1, 2], condition: { icon: "⛅", ko: "구름 조금", en: "Partly cloudy", zh: "少云" } },
  { codes: [3], condition: { icon: "☁️", ko: "흐림", en: "Overcast", zh: "阴" } },
  { codes: [45, 48], condition: { icon: "🌫️", ko: "안개", en: "Fog", zh: "雾" } },
  { codes: [51, 53, 55, 56, 57], condition: { icon: "🌦️", ko: "이슬비", en: "Drizzle", zh: "毛毛雨" } },
  { codes: [61, 63, 65, 66, 67], condition: { icon: "🌧️", ko: "비", en: "Rain", zh: "雨" } },
  { codes: [71, 73, 75, 77], condition: { icon: "❄️", ko: "눈", en: "Snow", zh: "雪" } },
  { codes: [80, 81, 82], condition: { icon: "🌦️", ko: "소나기", en: "Rain showers", zh: "阵雨" } },
  { codes: [85, 86], condition: { icon: "🌨️", ko: "눈 소나기", en: "Snow showers", zh: "阵雪" } },
  { codes: [95, 96, 99], condition: { icon: "⛈️", ko: "뇌우", en: "Thunderstorm", zh: "雷雨" } },
];

const FALLBACK_CONDITION: WeatherCondition = { icon: "☁️", ko: "흐림", en: "Overcast", zh: "阴" };

export function weatherConditionFor(weatherCode: number): WeatherCondition {
  return CONDITION_GROUPERS.find((group) => group.codes.includes(weatherCode))?.condition ?? FALLBACK_CONDITION;
}

export type DogWalkSafetyReason = "fine" | "rain" | "snow" | "hot" | "cold";
export type DogWalkSafety = {
  level: "safe" | "caution" | "indoor";
  reason: DogWalkSafetyReason;
};

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

// Paw-safety thresholds for dogs: asphalt burn risk starts well below human
// heat-stress temperatures, and small dogs lose body heat quickly near 0°C.
export function classifyDogWalkSafety(day: Pick<DailyWeather, "weatherCode" | "tempMax" | "tempMin" | "precipProb">): DogWalkSafety {
  if (RAIN_CODES.has(day.weatherCode) || day.precipProb >= 70) return { level: "indoor", reason: "rain" };
  if (day.tempMax >= 27) return { level: "caution", reason: "hot" };
  if (SNOW_CODES.has(day.weatherCode)) return { level: "caution", reason: "snow" };
  if (day.tempMin <= 0) return { level: "caution", reason: "cold" };
  return { level: "safe", reason: "fine" };
}

export const WEATHER_FORECAST_DAYS = 8;

export const REGION_CENTER_COORDINATES: Record<string, Coordinates> = {
  서울: { latitude: 37.5665, longitude: 126.978 },
  경기: { latitude: 37.4138, longitude: 127.5183 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  강원: { latitude: 37.8813, longitude: 127.7298 },
  충북: { latitude: 36.6424, longitude: 127.489 },
  충남: { latitude: 36.8151, longitude: 127.1131 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  세종: { latitude: 36.48, longitude: 127.289 },
  전북: { latitude: 35.8242, longitude: 127.148 },
  전남광주: { latitude: 35.1595, longitude: 126.8526 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  전남: { latitude: 34.8158, longitude: 126.4633 },
  경북: { latitude: 36.5684, longitude: 128.7294 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  울산: { latitude: 35.5384, longitude: 129.3114 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  경남: { latitude: 35.2279, longitude: 128.6811 },
  제주: { latitude: 33.4996, longitude: 126.5312 },
};

export function regionCenter(region: string): Coordinates | null {
  return REGION_CENTER_COORDINATES[region.trim()] ?? null;
}
