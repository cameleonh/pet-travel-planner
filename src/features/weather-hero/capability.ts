export const HERO_MIN_VIEWPORT_WIDTH = 1024;

export type CapabilityEnv = {
  isCoarsePointer: boolean;
  viewportWidth: number;
  reducedMotion: boolean;
  webgl2Supported: boolean;
  floatBufferSupported: boolean;
};

export type HeroGateReason = "reduced-motion" | "coarse-pointer" | "small-viewport" | "no-webgl2" | "no-float";

export type HeroGateResult = { ok: boolean; reason: HeroGateReason | null };

/**
 * The procedural hero only runs on pointer-precise screens wide enough to
 * justify the GPU cost; everything else keeps the existing hero video.
 */
export function evaluateHeroCapability(env: CapabilityEnv): HeroGateResult {
  if (env.reducedMotion) return { ok: false, reason: "reduced-motion" };
  if (env.isCoarsePointer) return { ok: false, reason: "coarse-pointer" };
  if (env.viewportWidth < HERO_MIN_VIEWPORT_WIDTH) return { ok: false, reason: "small-viewport" };
  if (!env.webgl2Supported) return { ok: false, reason: "no-webgl2" };
  if (!env.floatBufferSupported) return { ok: false, reason: "no-float" };
  return { ok: true, reason: null };
}

export function probeWebGLSupport(): { webgl2: boolean; floatBuffer: boolean } {
  if (typeof document === "undefined") return { webgl2: false, floatBuffer: false };
  const canvas = document.createElement("canvas");
  try {
    const gl = canvas.getContext("webgl2");
    if (!gl) return { webgl2: false, floatBuffer: false };
    const floatBuffer = gl.getExtension("EXT_color_buffer_float") !== null;
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return { webgl2: true, floatBuffer };
  } catch {
    return { webgl2: false, floatBuffer: false };
  }
}

export function detectCapabilityEnv(): CapabilityEnv {
  const webgl = probeWebGLSupport();
  return {
    isCoarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl2Supported: webgl.webgl2,
    floatBufferSupported: webgl.floatBuffer,
  };
}
