"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates } from "@/domain/geo";
import { regionCenter } from "@/domain/weather";
import { useDailyForecast } from "@/features/weather/useDailyForecast";
import { detectCapabilityEnv, evaluateHeroCapability } from "./capability";

export type HeroSimState = "boot" | "active" | "fallback";

type WeatherHeroCanvasProps = {
  onStateChange?: (state: HeroSimState) => void;
  paused?: boolean;
};

const HERO_WEATHER_EVENT = "gggo:hero-weather";
const HERO_STRIKE_EVENT = "gggo:hero-strike";

function kstTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function gatePasses(): boolean {
  if (typeof window === "undefined") return false;
  return evaluateHeroCapability(detectCapabilityEnv()).ok;
}

/**
 * Live procedural ocean backdrop for capable desktop browsers; every failure
 * path (gate, snow, slow GPU, context loss) falls back to the existing hero
 * video, which stays mounted underneath at all times. The engine chunk is
 * imported only after the capability gate passes.
 */
export function WeatherHeroCanvas({ onStateChange, paused = false }: WeatherHeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<import("./hero-driver").WeatherHeroDriver | null>(null);
  const userPausedRef = useRef(paused);
  const [gateOk] = useState(gatePasses);
  const [state, setState] = useState<HeroSimState>("boot");
  const [override, setOverride] = useState<{ code: number | null; date: string | null }>({ code: null, date: null });

  const publish = useCallback(
    (next: HeroSimState) => {
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange],
  );
  const publishRef = useRef(publish);
  useEffect(() => {
    userPausedRef.current = paused;
    publishRef.current = publish;
  }, [paused, publish]);

  const onReady = useCallback(() => publishRef.current("active"), []);
  const onFallback = useCallback(() => publishRef.current("fallback"), []);

  // ---- boot: capability gate, then (and only then) the engine chunk
  useEffect(() => {
    if (!gateOk) return;
    let cancelled = false;
    void (async () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const { WeatherHeroDriver } = await import("./hero-driver");
      const driver = await WeatherHeroDriver.create(canvas, container, { onReady, onFallback });
      if (cancelled) {
        driver?.dispose();
        return;
      }
      if (driver) driverRef.current = driver;
    })();
    return () => {
      cancelled = true;
      driverRef.current?.dispose();
      driverRef.current = null;
    };
  }, [gateOk, onReady, onFallback]);

  // ---- default weather: today's forecast at the 서울 region centre
  const seoul: Coordinates | null = regionCenter("서울");
  const { days } = useDailyForecast(seoul);
  const today = kstTodayIso();
  const todayCode = days.find((day) => day.date === today)?.weatherCode ?? days[0]?.weatherCode ?? null;
  const effectiveCode = override.code ?? todayCode;
  const effectiveHour = override.date && override.date !== today ? 14 : new Date().getHours();

  // ---- weather selection: search override event, then target application
  useEffect(() => {
    const onHeroWeather = (event: Event) => {
      const detail = (event as CustomEvent<{ code: number | null; date?: string | null }>).detail;
      setOverride({ code: detail?.code ?? null, date: detail?.date ?? null });
    };
    window.addEventListener(HERO_WEATHER_EVENT, onHeroWeather);
    return () => window.removeEventListener(HERO_WEATHER_EVENT, onHeroWeather);
  }, []);

  useEffect(() => {
    if (state !== "active" || effectiveCode === null) return;
    driverRef.current?.setWeather(effectiveCode, effectiveHour);
  }, [state, effectiveCode, effectiveHour]);

  // ---- easter egg: logo click fires one lightning strike
  useEffect(() => {
    const onStrike = () => driverRef.current?.strike();
    window.addEventListener(HERO_STRIKE_EVENT, onStrike);
    return () => window.removeEventListener(HERO_STRIKE_EVENT, onStrike);
  }, []);

  // ---- GPU cost control: pause off-screen, on hidden tabs, on user toggle
  useEffect(() => {
    const container = containerRef.current;
    if (!container || state !== "active") return;
    const sync = (visible: boolean) => {
      const current = driverRef.current;
      if (!current) return;
      if (userPausedRef.current || !visible) current.pause();
      else current.resume();
    };
    const observer = new IntersectionObserver((entries) => sync(entries.some((entry) => entry.isIntersecting)));
    observer.observe(container);
    const onVisibility = () => sync(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "active") return;
    if (paused) driverRef.current?.pause();
    else if (document.visibilityState === "visible") driverRef.current?.resume();
  }, [paused, state]);

  return (
    <div ref={containerRef} className="hero-sim" data-state={state} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
