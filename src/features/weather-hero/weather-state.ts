import type { SunParams } from "./time-of-day";

export type HeroSceneTarget = {
  windSpeed: number;
  windAngle: number;
  gustiness: number;
  swellHs: number;
  swellPeriod: number;
  swellAngle: number;
  spread: number;
  amplitude: number;
  choppiness: number;
  rain: number;
  turbidity: number;
  mieG: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudBottom: number;
  cloudTop: number;
  cloudAnvil: number;
  storm: number;
  fog: number;
  spray: number;
  lightningRate: number;
  foamStrength: number;
  /** Scene attenuation of the sun; final intensity is decided by time-of-day. */
  sunScale: number;
  waterScatter: [number, number, number];
  waterAbsorb: [number, number, number];
};

export type HeroScene =
  | { mode: "sim"; target: HeroSceneTarget }
  | { mode: "video"; reason: "snow" };

export type EngineWeatherTarget = HeroSceneTarget & {
  sunElevation: number;
  sunAzimuth: number;
  sunIntensity: number;
  starIntensity: number;
};

const BASE: HeroSceneTarget = {
  windSpeed: 5.5,
  windAngle: 0.62,
  gustiness: 0.18,
  swellHs: 1.3,
  swellPeriod: 12,
  swellAngle: 0.9,
  spread: 0.6,
  amplitude: 1,
  choppiness: 1.05,
  rain: 0,
  turbidity: 1.1,
  mieG: 0.76,
  cloudCoverage: 0.26,
  cloudDensity: 0.4,
  cloudBottom: 1000,
  cloudTop: 2800,
  cloudAnvil: 0,
  storm: 0,
  fog: 0.08,
  spray: 0,
  lightningRate: 0,
  foamStrength: 0.6,
  sunScale: 1,
  waterScatter: [0.012, 0.052, 0.104],
  waterAbsorb: [0.003, 0.018, 0.04],
};

export const SNOW_WEATHER_CODES: readonly number[] = [71, 73, 75, 77, 85, 86];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);
const spreadForWind = (wind: number) => mix(0.55, 0.9, (wind - 4) / 26);

type SceneBuilder = (t: number) => Partial<HeroSceneTarget>;

const PARTLY_CLOUDY_SCENE: { codes: readonly number[]; build: SceneBuilder } = {
  codes: [1, 2],
  build: (t) => ({
    windSpeed: mix(7, 9.5, t),
    gustiness: mix(0.2, 0.26, t),
    cloudCoverage: mix(0.42, 0.56, t),
    cloudDensity: 0.5,
    cloudBottom: 850,
    cloudTop: 3400,
    fog: 0.12,
    turbidity: 1.4,
    swellHs: 1.6,
    choppiness: 1.18,
    foamStrength: 0.75,
    sunScale: 0.95,
  }),
};

const SCENES: { codes: readonly number[]; build: SceneBuilder }[] = [
  {
    codes: [0],
    build: () => ({}),
  },
  PARTLY_CLOUDY_SCENE,
  {
    codes: [3],
    build: () => ({
      windSpeed: 11,
      gustiness: 0.3,
      cloudCoverage: 0.68,
      cloudDensity: 0.78,
      cloudBottom: 750,
      cloudTop: 4200,
      fog: 0.22,
      turbidity: 2.6,
      sunScale: 0.6,
      swellHs: 2.1,
      choppiness: 1.3,
      foamStrength: 0.9,
      storm: 0.12,
    }),
  },
  {
    codes: [45, 48],
    build: (t) => ({
      windSpeed: 4,
      gustiness: 0.15,
      cloudCoverage: mix(0.62, 0.72, t),
      cloudDensity: 0.7,
      cloudBottom: 650,
      cloudTop: 3000,
      fog: mix(0.62, 0.82, t),
      turbidity: 3.2,
      sunScale: 0.42,
      swellHs: 0.9,
      choppiness: 1,
      foamStrength: 0.55,
      storm: 0.1,
    }),
  },
  {
    codes: [51, 53, 55, 56, 57],
    build: (t) => ({
      windSpeed: mix(9, 11, t),
      gustiness: 0.35,
      rain: mix(0.18, 0.35, t),
      cloudCoverage: 0.62,
      cloudDensity: 0.82,
      cloudBottom: 620,
      cloudTop: 4000,
      fog: 0.34,
      turbidity: 3.4,
      sunScale: 0.5,
      storm: 0.28,
      spray: 0.12,
      swellHs: 1.9,
      choppiness: 1.35,
      foamStrength: 1,
    }),
  },
  {
    codes: [61, 63, 65, 66, 67],
    build: (t) => ({
      windSpeed: mix(13, 17, t),
      gustiness: mix(0.42, 0.54, t),
      rain: mix(0.45, 0.85, t),
      cloudCoverage: 0.7,
      cloudDensity: 0.92,
      cloudBottom: 560,
      cloudTop: 4600,
      cloudAnvil: mix(0.15, 0.25, t),
      fog: mix(0.42, 0.54, t),
      turbidity: 4.5,
      sunScale: 0.45,
      storm: mix(0.45, 0.65, t),
      spray: mix(0.35, 0.65, t),
      swellHs: mix(2.6, 4, t),
      choppiness: 1.45,
      foamStrength: 1.25,
      waterScatter: [0.009, 0.04, 0.082],
      waterAbsorb: [0.003, 0.014, 0.03],
    }),
  },
  {
    codes: [80, 81, 82],
    build: (t) => ({
      windSpeed: mix(16, 20, t),
      gustiness: mix(0.5, 0.6, t),
      rain: mix(0.55, 0.9, t),
      cloudCoverage: 0.72,
      cloudDensity: 0.98,
      cloudBottom: 540,
      cloudTop: 4800,
      cloudAnvil: 0.3,
      fog: 0.5,
      turbidity: 5,
      sunScale: 0.42,
      storm: 0.55,
      spray: 0.6,
      swellHs: mix(3.2, 4.4, t),
      choppiness: 1.5,
      foamStrength: 1.35,
      lightningRate: mix(0.12, 0.32, t),
      waterScatter: [0.008, 0.036, 0.074],
      waterAbsorb: [0.003, 0.013, 0.028],
    }),
  },
  {
    codes: [95, 96, 99],
    build: (t) => ({
      windSpeed: mix(20, 24, t),
      gustiness: mix(0.55, 0.65, t),
      rain: mix(0.78, 0.95, t),
      cloudCoverage: 0.74,
      cloudDensity: 1.05,
      cloudBottom: 500,
      cloudTop: 5000,
      cloudAnvil: 0.4,
      fog: 0.55,
      turbidity: 5.5,
      sunScale: 0.38,
      storm: mix(0.78, 0.92, t),
      spray: 0.8,
      swellHs: mix(4.2, 5.4, t),
      choppiness: 1.55,
      foamStrength: 1.5,
      lightningRate: mix(0.5, 0.85, t),
      waterScatter: [0.007, 0.03, 0.062],
      waterAbsorb: [0.003, 0.012, 0.026],
    }),
  },
];

/**
 * Maps a WMO weather code (as returned by Open-Meteo) to a hero scene.
 * Snow has no representation in the ocean engine, so it falls back to the
 * existing hero video; unknown codes degrade to "partly cloudy".
 */
export function heroSceneForWeatherCode(code: number): HeroScene {
  if (SNOW_WEATHER_CODES.includes(code)) return { mode: "video", reason: "snow" };
  const scene = SCENES.find((entry) => entry.codes.includes(code)) ?? PARTLY_CLOUDY_SCENE;
  const t = scene.codes.length > 1 ? scene.codes.indexOf(code) / (scene.codes.length - 1) : 0;
  return { mode: "sim", target: buildTarget(scene, t) };
}

function buildTarget(scene: { build: SceneBuilder }, t: number): HeroSceneTarget {
  const overrides = scene.build(t);
  const target = { ...BASE, ...overrides };
  target.spread = spreadForWind(target.windSpeed);
  return target;
}

/** Folds time-of-day lighting into a scene target, producing engine values. */
export function applySunToTarget(target: HeroSceneTarget, sun: SunParams): EngineWeatherTarget {
  return {
    ...target,
    sunElevation: sun.sunElevation,
    sunAzimuth: sun.sunAzimuth,
    sunIntensity: sun.sunIntensity * target.sunScale,
    starIntensity: sun.starIntensity * (1 - 0.5 * clamp01(target.storm)),
  };
}
