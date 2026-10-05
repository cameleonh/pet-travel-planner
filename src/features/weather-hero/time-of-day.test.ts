import { describe, expect, it } from "vitest";
import { maxSunElevationForMonth, sunParamsForHour } from "@/features/weather-hero/time-of-day";

describe("maxSunElevationForMonth", () => {
  it("peaks in summer and bottoms out in winter", () => {
    expect(maxSunElevationForMonth(6)).toBeGreaterThan(maxSunElevationForMonth(12));
    expect(maxSunElevationForMonth(12)).toBeGreaterThan(0.1);
    expect(maxSunElevationForMonth(6)).toBeLessThan(Math.PI / 2);
  });

  it("wraps out-of-range months", () => {
    expect(maxSunElevationForMonth(13)).toBeCloseTo(maxSunElevationForMonth(1), 10);
    expect(maxSunElevationForMonth(0)).toBeCloseTo(maxSunElevationForMonth(12), 10);
  });
});

describe("sunParamsForHour", () => {
  it("puts the sun high at noon and below the horizon at night", () => {
    const noon = sunParamsForHour(12, 6);
    const night = sunParamsForHour(0, 6);
    expect(noon.sunElevation).toBeGreaterThan(0.4);
    expect(night.sunElevation).toBeLessThan(0);
  });

  it("crosses the horizon around 06:00 and 18:00", () => {
    expect(Math.abs(sunParamsForHour(6, 6).sunElevation)).toBeLessThan(0.01);
    expect(Math.abs(sunParamsForHour(18, 6).sunElevation)).toBeLessThan(0.01);
  });

  it("shows stars at night and none in the afternoon", () => {
    expect(sunParamsForHour(3, 6).starIntensity).toBeGreaterThan(0.5);
    expect(sunParamsForHour(14, 6).starIntensity).toBe(0);
    expect(sunParamsForHour(23, 6).starIntensity).toBeGreaterThan(0);
  });

  it("keeps azimuth sweeping monotonically through the day", () => {
    let previous = sunParamsForHour(7, 6).sunAzimuth;
    for (let hour = 8; hour <= 17; hour++) {
      const current = sunParamsForHour(hour, 6).sunAzimuth;
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });

  it("dims the sun near the horizon compared to noon", () => {
    const noon = sunParamsForHour(12, 6);
    const evening = sunParamsForHour(19, 6);
    expect(noon.sunIntensity).toBeGreaterThan(evening.sunIntensity);
    expect(evening.sunIntensity).toBeGreaterThan(0);
  });

  it("normalises hours outside 0–24", () => {
    expect(sunParamsForHour(25, 6).sunElevation).toBeCloseTo(sunParamsForHour(1, 6).sunElevation, 10);
    expect(sunParamsForHour(-2, 6).sunElevation).toBeCloseTo(sunParamsForHour(22, 6).sunElevation, 10);
  });

  it("lowers the winter sun relative to summer at noon", () => {
    expect(sunParamsForHour(12, 12).sunElevation).toBeLessThan(sunParamsForHour(12, 6).sunElevation);
  });
});
