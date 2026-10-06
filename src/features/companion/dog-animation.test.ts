import { describe, expect, it } from "vitest";
import { clipBaseName, resolveCompanionClips } from "./dog-animation";

const REAL_CLIP_NAMES = [
  "AnimalArmature|AnimalArmature|AnimalArmature|Death",
  "AnimalArmature|AnimalArmature|AnimalArmature|Headbutt",
  "AnimalArmature|AnimalArmature|AnimalArmature|Idle",
  "AnimalArmature|AnimalArmature|AnimalArmature|Idle_Eating",
  "AnimalArmature|AnimalArmature|AnimalArmature|Jump_Loop",
  "AnimalArmature|AnimalArmature|AnimalArmature|Jump_Start",
  "AnimalArmature|AnimalArmature|AnimalArmature|Run",
  "AnimalArmature|AnimalArmature|AnimalArmature|Walk",
];

describe("clipBaseName", () => {
  it("returns the last pipe segment", () => {
    expect(clipBaseName("AnimalArmature|AnimalArmature|AnimalArmature|Idle")).toBe("Idle");
  });

  it("returns a plain name unchanged", () => {
    expect(clipBaseName("Walk")).toBe("Walk");
  });
});

describe("resolveCompanionClips", () => {
  it("maps idle / walk / happy from the real clip set", () => {
    const clips = resolveCompanionClips(REAL_CLIP_NAMES);
    expect(clipBaseName(clips.idle ?? "")).toBe("Idle");
    expect(clipBaseName(clips.walk ?? "")).toBe("Walk");
    expect(clipBaseName(clips.happy ?? "")).toBe("Headbutt");
  });

  it("returns null for moods the model does not have", () => {
    expect(resolveCompanionClips(["Idle"])).toEqual({ idle: "Idle", walk: null, happy: null });
  });

  it("handles an empty clip list", () => {
    expect(resolveCompanionClips([])).toEqual({ idle: null, walk: null, happy: null });
  });
});
