export const HERO_WEATHER_EVENT = "gggo:hero-weather";
export const HERO_STRIKE_EVENT = "gggo:hero-strike";

export type HeroWeatherDetail = {
  code: number | null;
  date?: string | null;
};

/** Tells the hero backdrop to mirror a (trip) day's weather; null resets to today. */
export function dispatchHeroWeather(code: number | null, date?: string | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<HeroWeatherDetail>(HERO_WEATHER_EVENT, { detail: { code, date: date ?? null } }));
}

/** Easter egg hook: fires a single lightning strike in the hero, if running. */
export function dispatchHeroStrike(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HERO_STRIKE_EVENT));
}
