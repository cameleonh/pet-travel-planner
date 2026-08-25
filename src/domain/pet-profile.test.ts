import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSavedPetProfile,
  DEFAULT_AVATARS,
  getSavedPetProfile,
  savePetProfile,
  type PetProfile,
} from "./pet-profile";

describe("pet-profile storage", () => {
  const mockProfile: PetProfile = {
    name: "초코",
    avatar: "🐶",
    breed: "푸들",
    weight: "5.5",
    size: "smallDog",
    dangerousDog: false,
    notes: "착해요",
  };

  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(store)) delete store[k];
      }),
    };
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports default avatars", () => {
    expect(DEFAULT_AVATARS).toContain("🐶");
    expect(DEFAULT_AVATARS.length).toBeGreaterThan(0);
  });

  it("saves and retrieves pet profile correctly", () => {
    expect(getSavedPetProfile()).toBeNull();
    savePetProfile(mockProfile);
    const retrieved = getSavedPetProfile();
    expect(retrieved).toEqual(mockProfile);
  });

  it("clears saved pet profile", () => {
    savePetProfile(mockProfile);
    expect(getSavedPetProfile()).toEqual(mockProfile);
    clearSavedPetProfile();
    expect(getSavedPetProfile()).toBeNull();
  });

  it("returns null on corrupted JSON in localStorage", () => {
    localStorage.setItem("pet_travel_profile_v1", "{corrupted json");
    expect(getSavedPetProfile()).toBeNull();
  });

  it("handles window undefined gracefully", () => {
    vi.stubGlobal("window", undefined);
    expect(getSavedPetProfile()).toBeNull();
    expect(() => savePetProfile(mockProfile)).not.toThrow();
    expect(() => clearSavedPetProfile()).not.toThrow();
  });
});
