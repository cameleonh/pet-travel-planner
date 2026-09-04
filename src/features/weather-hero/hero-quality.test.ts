import { describe, expect, it } from "vitest";
import { HERO_WATCHDOG, capInitialPreset, shouldAbortSim } from "@/features/weather-hero/hero-quality";

describe("capInitialPreset", () => {
  it.each([
    ["ultra", "high"],
    ["high", "high"],
    ["medium", "medium"],
    ["low", "low"],
    ["potato", "potato"],
  ] as const)("caps %s to %s", (detected, expected) => {
    expect(capInitialPreset(detected)).toBe(expected);
  });

  it("falls back to low for unknown strings", () => {
    expect(capInitialPreset("cinematic")).toBe("low");
  });
});

describe("shouldAbortSim", () => {
  const policy = { warmupFrames: 5, abortMedianMs: 46 };

  it("never fires before the warmup window fills", () => {
    expect(shouldAbortSim([500, 600, 700], policy)).toBe(false);
  });

  it("aborts when the median frame time stays over budget", () => {
    const samples = [50, 52, 49, 51, 48, 53];
    expect(shouldAbortSim(samples, policy)).toBe(true);
  });

  it("survives a single long hitch thanks to the median", () => {
    const samples = [16, 17, 2000, 16, 17, 16];
    expect(shouldAbortSim(samples, policy)).toBe(false);
  });

  it("keeps a healthy sim running", () => {
    const samples = Array.from({ length: 10 }, () => 17);
    expect(shouldAbortSim(samples, policy)).toBe(false);
  });

  it("uses the shipped default policy", () => {
    const slow = Array.from({ length: HERO_WATCHDOG.warmupFrames }, () => HERO_WATCHDOG.abortMedianMs + 10);
    expect(shouldAbortSim(slow)).toBe(true);
  });
});
