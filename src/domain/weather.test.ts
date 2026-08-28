import { describe, expect, it } from "vitest";
import {
  classifyDogWalkSafety,
  regionCenter,
  REGION_CENTER_COORDINATES,
  weatherConditionFor,
  type DailyWeather,
} from "./weather";

function day(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return { date: "2026-08-30", weatherCode: 0, tempMax: 24, tempMin: 17, precipProb: 10, ...overrides };
}

describe("weatherConditionFor", () => {
  it("maps representative WMO codes", () => {
    expect(weatherConditionFor(0).ko).toBe("맑음");
    expect(weatherConditionFor(2).en).toBe("Partly cloudy");
    expect(weatherConditionFor(61).zh).toBe("雨");
    expect(weatherConditionFor(71).ko).toBe("눈");
    expect(weatherConditionFor(95).ko).toBe("뇌우");
  });

  it("falls back to overcast for unknown codes", () => {
    expect(weatherConditionFor(1234).ko).toBe("흐림");
  });
});

describe("classifyDogWalkSafety", () => {
  it("marks pleasant days as safe", () => {
    expect(classifyDogWalkSafety(day())).toEqual({ level: "safe", reason: "fine" });
  });

  it("marks rain codes and high precipitation probability as indoor", () => {
    expect(classifyDogWalkSafety(day({ weatherCode: 61 }))).toEqual({ level: "indoor", reason: "rain" });
    expect(classifyDogWalkSafety(day({ weatherCode: 95 }))).toEqual({ level: "indoor", reason: "rain" });
    expect(classifyDogWalkSafety(day({ precipProb: 75 }))).toEqual({ level: "indoor", reason: "rain" });
  });

  it("flags paw-burn heat as caution before snow and cold", () => {
    expect(classifyDogWalkSafety(day({ tempMax: 27 }))).toEqual({ level: "caution", reason: "hot" });
    expect(classifyDogWalkSafety(day({ tempMax: 31 }))).toEqual({ level: "caution", reason: "hot" });
  });

  it("flags snow and freezing mornings as caution", () => {
    expect(classifyDogWalkSafety(day({ weatherCode: 73 }))).toEqual({ level: "caution", reason: "snow" });
    expect(classifyDogWalkSafety(day({ tempMin: -2 }))).toEqual({ level: "caution", reason: "cold" });
  });

  it("treats dry drizzle codes as rain despite low probability", () => {
    expect(classifyDogWalkSafety(day({ weatherCode: 51, precipProb: 20 }))).toEqual({ level: "indoor", reason: "rain" });
  });
});

describe("regionCenter", () => {
  it("covers every canonical region value", () => {
    const canonical = [
      "서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종",
      "전북", "전남광주", "광주", "전남", "경북", "대구", "울산", "부산", "경남", "제주",
    ];
    for (const region of canonical) {
      expect(REGION_CENTER_COORDINATES[region]).toBeDefined();
    }
  });

  it("returns coordinates for known regions and null otherwise", () => {
    expect(regionCenter("제주")?.latitude).toBeCloseTo(33.4996);
    expect(regionCenter(" 서울 ")).not.toBeNull();
    expect(regionCenter("어딘가")).toBeNull();
  });
});
