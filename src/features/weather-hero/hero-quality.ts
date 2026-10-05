export type QualityPresetName = "potato" | "low" | "medium" | "high" | "ultra";

export const PRESET_LADDER: readonly QualityPresetName[] = ["ultra", "high", "medium", "low", "potato"];

/**
 * The hero is a backdrop, not the product: even on an ultra-class GPU the
 * top tier (150k spray particles, 480×300 ocean grid) is waste, so detected
 * presets are capped at "high".
 */
export function capInitialPreset(detected: string): QualityPresetName {
  const idx = PRESET_LADDER.indexOf(detected as QualityPresetName);
  if (idx < 0) return "low";
  const capped = Math.max(idx, 1);
  return PRESET_LADDER[capped] ?? "low";
}

export type SimWatchdog = {
  /** Frames to skip while shaders warm up before the watchdog can fire. */
  warmupFrames: number;
  /** Median frame time (ms) above which the sim is abandoned for the video. */
  abortMedianMs: number;
};

export const HERO_WATCHDOG: SimWatchdog = { warmupFrames: 45, abortMedianMs: 46 };

/**
 * True when the simulation should be torn down and the hero video restored.
 * Uses the median so one long shader-compile hitch never kills the sim.
 */
export function shouldAbortSim(frameMsSamples: number[], policy: SimWatchdog = HERO_WATCHDOG): boolean {
  if (frameMsSamples.length < policy.warmupFrames) return false;
  const sorted = [...frameMsSamples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid] ?? 0 : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return median > policy.abortMedianMs;
}
