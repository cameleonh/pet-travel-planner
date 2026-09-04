import { describe, expect, it } from "vitest";
import { evaluateHeroCapability, type CapabilityEnv } from "@/features/weather-hero/capability";

const capable: CapabilityEnv = {
  isCoarsePointer: false,
  viewportWidth: 1440,
  reducedMotion: false,
  webgl2Supported: true,
  floatBufferSupported: true,
};

describe("evaluateHeroCapability", () => {
  it("passes a capable desktop environment", () => {
    expect(evaluateHeroCapability(capable)).toEqual({ ok: true, reason: null });
  });

  it.each([
    ["reduced-motion", { reducedMotion: true }],
    ["coarse-pointer", { isCoarsePointer: true }],
    ["small-viewport", { viewportWidth: 430 }],
    ["no-webgl2", { webgl2Supported: false }],
    ["no-float", { floatBufferSupported: false }],
  ] as const)("rejects the environment for %s", (reason, patch) => {
    const result = evaluateHeroCapability({ ...capable, ...patch });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(reason);
  });

  it("lets a wide touch-laptop with a precise pointer through", () => {
    const result = evaluateHeroCapability({ ...capable, viewportWidth: 1280 });
    expect(result.ok).toBe(true);
  });
});
