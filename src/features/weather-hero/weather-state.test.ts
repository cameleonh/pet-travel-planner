import { describe, expect, it } from "vitest";
import { applySunToTarget, heroSceneForWeatherCode } from "@/features/weather-hero/weather-state";
import { sunParamsForHour } from "@/features/weather-hero/time-of-day";

describe("heroSceneForWeatherCode", () => {
  it.each([71, 73, 75, 77, 85, 86] as const)("maps snow code %i to the video fallback", (code) => {
    const scene = heroSceneForWeatherCode(code);
    expect(scene.mode).toBe("video");
    if (scene.mode === "video") expect(scene.reason).toBe("snow");
  });

  it("maps clear sky to a calm sim scene", () => {
    const scene = heroSceneForWeatherCode(0);
    expect(scene.mode).toBe("sim");
    if (scene.mode !== "sim") return;
    expect(scene.target.rain).toBe(0);
    expect(scene.target.cloudCoverage).toBeLessThan(0.35);
    expect(scene.target.lightningRate).toBe(0);
  });

  it("ramps rain intensity inside the rain group", () => {
    const light = heroSceneForWeatherCode(61);
    const heavy = heroSceneForWeatherCode(65);
    expect(light.mode).toBe("sim");
    expect(heavy.mode).toBe("sim");
    if (light.mode !== "sim" || heavy.mode !== "sim") return;
    expect(heavy.target.rain).toBeGreaterThan(light.target.rain);
    expect(heavy.target.windSpeed).toBeGreaterThan(light.target.windSpeed);
  });

  it("gives thunderstorms lightning and rougher seas than plain rain", () => {
    const rain = heroSceneForWeatherCode(63);
    const storm = heroSceneForWeatherCode(95);
    if (rain.mode !== "sim" || storm.mode !== "sim") throw new Error("expected sim scenes");
    expect(storm.target.lightningRate).toBeGreaterThan(0.3);
    expect(rain.target.lightningRate).toBe(0);
    expect(storm.target.swellHs).toBeGreaterThan(rain.target.swellHs);
    expect(storm.target.storm).toBeGreaterThan(rain.target.storm);
  });

  it("escalates thunderstorms with hail codes", () => {
    const base = heroSceneForWeatherCode(95);
    const hail = heroSceneForWeatherCode(99);
    if (base.mode !== "sim" || hail.mode !== "sim") throw new Error("expected sim scenes");
    expect(hail.target.lightningRate).toBeGreaterThan(base.target.lightningRate);
    expect(hail.target.rain).toBeGreaterThan(base.target.rain);
  });

  it("keeps fog in the sim with a high fog density", () => {
    const scene = heroSceneForWeatherCode(45);
    expect(scene.mode).toBe("sim");
    if (scene.mode !== "sim") return;
    expect(scene.target.fog).toBeGreaterThan(0.5);
    expect(scene.target.windSpeed).toBeLessThan(6);
  });

  it("densifies fog from code 45 to 48", () => {
    const thin = heroSceneForWeatherCode(45);
    const thick = heroSceneForWeatherCode(48);
    if (thin.mode !== "sim" || thick.mode !== "sim") throw new Error("expected sim scenes");
    expect(thick.target.fog).toBeGreaterThan(thin.target.fog);
  });

  it("falls back to partly-cloudy for unknown codes", () => {
    const scene = heroSceneForWeatherCode(999);
    expect(scene.mode).toBe("sim");
    if (scene.mode !== "sim") return;
    expect(scene.target.cloudCoverage).toBeGreaterThan(0.4);
    expect(scene.target.cloudCoverage).toBeLessThan(0.6);
  });

  it("keeps every numeric engine field finite for all known groups", () => {
    const codes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
    for (const code of codes) {
      const scene = heroSceneForWeatherCode(code);
      if (scene.mode !== "sim") continue;
      for (const [key, value] of Object.entries(scene.target)) {
        if (typeof value === "number") expect(Number.isFinite(value), `${code}.${key}`).toBe(true);
        if (Array.isArray(value)) expect(value.every((v) => Number.isFinite(v)), `${code}.${key}`).toBe(true);
      }
    }
  });
});

describe("applySunToTarget", () => {
  const noon = sunParamsForHour(12, 6);
  const midnight = sunParamsForHour(0, 6);

  it("attenuates the sun by the scene scale", () => {
    const clear = heroSceneForWeatherCode(0);
    const storm = heroSceneForWeatherCode(95);
    if (clear.mode !== "sim" || storm.mode !== "sim") throw new Error("expected sim scenes");
    const clearLit = applySunToTarget(clear.target, noon);
    const stormLit = applySunToTarget(storm.target, noon);
    expect(clearLit.sunIntensity).toBeCloseTo(noon.sunIntensity * clear.target.sunScale, 5);
    expect(stormLit.sunIntensity).toBeLessThan(clearLit.sunIntensity);
  });

  it("carries sun position through and dims stars under storm clouds", () => {
    const clear = heroSceneForWeatherCode(0);
    const storm = heroSceneForWeatherCode(95);
    if (clear.mode !== "sim" || storm.mode !== "sim") throw new Error("expected sim scenes");
    const clearNight = applySunToTarget(clear.target, midnight);
    const stormNight = applySunToTarget(storm.target, midnight);
    expect(clearNight.sunElevation).toBe(midnight.sunElevation);
    expect(clearNight.starIntensity).toBeGreaterThan(0);
    expect(stormNight.starIntensity).toBeLessThan(clearNight.starIntensity);
  });
});
