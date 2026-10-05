import * as THREE from "three";
import { applySunToTarget, heroSceneForWeatherCode } from "./weather-state";
import { currentMonth, sunParamsForHour } from "./time-of-day";
import { capInitialPreset, shouldAbortSim } from "./hero-quality";

/**
 * Structural handles onto the vendored JS engine (allowJs, unchecked) —
 * only the surface the driver actually touches.
 */
type HeroAppHandle = {
  init(): Promise<void>;
  dispose(): void;
  start(): void;
  stop(): void;
  running: boolean;
  frameMs?: number;
  beforeUpdate: ((dt: number) => void) | null;
  afterUpdate: ((dt: number) => void) | null;
  weather: unknown;
  post: { settings: { dof?: boolean } & Record<string, unknown> } | null;
  lightning: { burst(count: number, opts?: Record<string, unknown>): void } | null;
};

type WeatherHandle = {
  set(partial: Record<string, unknown>, immediate?: boolean): void;
  update(dt: number): void;
};

type DriverEvents = {
  onReady?: () => void;
  onFallback?: (reason: "snow" | "slow" | "context-lost" | "boot-failed") => void;
};

/**
 * Boots the vendored ABYSSAL engine for the hero and owns its lifecycle:
 * weather targets in, watchdog + fallback signalling out. Everything heavy
 * lives behind the dynamic import in WeatherHeroCanvas, so this module must
 * stay client-only.
 */
export class WeatherHeroDriver {
  private constructor(
    private readonly app: HeroAppHandle,
    private readonly weather: WeatherHandle,
    private readonly events: DriverEvents,
  ) {}

  static async create(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    events: DriverEvents,
  ): Promise<WeatherHeroDriver | null> {
    const { HeroApp } = await import("./sim/core/HeroApp.js");
    const { Weather } = await import("./sim/weather/Weather.js");
    const { autoDetectPreset } = await import("./sim/core/Quality.js");

    const app = new HeroApp(canvas, {
      container,
      getSize: () => ({ w: container.clientWidth, h: container.clientHeight }),
      preset: capInitialPreset(autoDetectPreset("")),
      adaptive: true,
    }) as unknown as HeroAppHandle;
    try {
      await app.init();
    } catch {
      app.dispose();
      events.onFallback?.("boot-failed");
      return null;
    }

    const weather = new Weather(app) as unknown as WeatherHandle;
    app.weather = weather;
    app.beforeUpdate = (dt: number) => weather.update(dt);
    if (app.post) app.post.settings.dof = false;

    const driver = new WeatherHeroDriver(app, weather, events);
    const samples: number[] = [];
    app.afterUpdate = () => {
      samples.push(app.frameMs ?? 16);
      if (samples.length > 120) samples.shift();
      if (shouldAbortSim(samples)) {
        events.onFallback?.("slow");
        driver.dispose();
      }
    };
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      events.onFallback?.("context-lost");
      driver.dispose();
    });

    app.start();
    events.onReady?.();
    return driver;
  }

  /** Applies a WMO code; snow signals the video fallback instead. */
  setWeather(code: number, hour: number): void {
    const scene = heroSceneForWeatherCode(code);
    if (scene.mode === "video") {
      this.events.onFallback?.("snow");
      return;
    }
    const engine = applySunToTarget(scene.target, sunParamsForHour(hour, currentMonth()));
    this.weather.set({
      ...engine,
      waterScatter: new THREE.Vector3(...engine.waterScatter),
      waterAbsorb: new THREE.Vector3(...engine.waterAbsorb),
    });
  }

  strike(): void {
    this.app.lightning?.burst(1);
  }

  get running(): boolean {
    return this.app.running;
  }

  resume(): void {
    if (!this.app.running) this.app.start();
  }

  pause(): void {
    this.app.stop();
  }

  dispose(): void {
    this.app.afterUpdate = null;
    this.app.dispose();
  }
}
