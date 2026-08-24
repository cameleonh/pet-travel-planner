import type { ConditionKey } from "@/domain/types";

export interface PetProfile {
  name: string;
  avatar: string;
  breed: string;
  weight: string;
  size: ConditionKey | null;
  dangerousDog: boolean;
  notes?: string;
}

const STORAGE_KEY = "pet_travel_profile_v1";

export const DEFAULT_AVATARS = ["🐶", "🐩", "🐕", "🐾", "🦴", "🤎", "🤍", "🖤"];

export function getSavedPetProfile(): PetProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PetProfile;
  } catch {
    return null;
  }
}

export function savePetProfile(profile: PetProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function clearSavedPetProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
