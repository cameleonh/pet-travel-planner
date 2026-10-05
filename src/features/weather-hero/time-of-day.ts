export type SunParams = {
  /** Sun elevation in radians; negative at night. */
  sunElevation: number;
  /** Sun azimuth in radians, sweeping east-to-west across the day. */
  sunAzimuth: number;
  sunIntensity: number;
  starIntensity: number;
};

const AZIMUTH_DAWN = 2.35;
const AZIMUTH_SPAN = 1.7;
const DAY_START_HOUR = 6;
const DAY_HOURS = 12;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Peak solar elevation by month (1–12), northern mid-latitude approximation. */
export function maxSunElevationForMonth(month: number): number {
  const m = (((month - 1) % 12) + 12) % 12 + 1;
  return 0.52 + 0.23 * Math.cos(((m - 6.5) / 6) * Math.PI);
}

/**
 * Lighting for a local hour of the day. The elevation follows a sine from
 * sunrise (06:00) to sunset (18:00) and continues negative through the night
 * so the sky, stars and moonlight blend continuously.
 */
export function sunParamsForHour(hour: number, month: number): SunParams {
  const h = ((hour % 24) + 24) % 24;
  const maxElevation = maxSunElevationForMonth(month);
  const elevation = maxElevation * Math.sin(((h - DAY_START_HOUR) / DAY_HOURS) * Math.PI);
  const azimuth = Math.min(
    AZIMUTH_DAWN + 0.25,
    Math.max(AZIMUTH_DAWN - AZIMUTH_SPAN - 0.25, AZIMUTH_DAWN - ((h - DAY_START_HOUR) / DAY_HOURS) * AZIMUTH_SPAN),
  );
  const dayness = clamp01(elevation / maxElevation);
  const sunIntensity = elevation > 0 ? 13 + 11 * dayness : 9;
  const starIntensity = elevation < 0.05 ? 0.9 * clamp01((0.05 - elevation) / 0.25) : 0;
  return {
    sunElevation: elevation,
    sunAzimuth: azimuth,
    sunIntensity,
    starIntensity,
  };
}

export function currentMonth(date = new Date()): number {
  return date.getMonth() + 1;
}
