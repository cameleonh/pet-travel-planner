import type { RawPlace } from "@/data/contracts";

// A farmstay inherits a pet policy only when BOTH conditions hold:
//  1. coordinates are within MAX_METERS of a Pet Travel catalog place (TM conversion
//     accuracy is tens of meters, so pure coordinate identity is too strict), AND
//  2. the normalized names are compatible (one contains the other, or they share
//     a meaningful token). Distance alone would conflate neighbouring buildings.
const MAX_METERS = 150;
const MIN_SHARED_TOKEN_LENGTH = 2;

export type FarmstayCandidate = {
  farmstayId: string;
  businessName: string;
  latitude: number;
  longitude: number;
};

export type PetPolicyMatch = {
  farmstayId: string;
  placeId: string;
  placeName: string;
  distanceMeters: number;
  sourceText: string;
  sourceUrl: string;
  observedAt: string;
};

export function haversineMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function normalizeBusinessName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")          // parenthetical descriptors
    .replace(/[^\p{Script=Hangul}\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokens(name: string): string[] {
  return normalizeBusinessName(name).split(" ").filter((token) => token.length >= MIN_SHARED_TOKEN_LENGTH);
}

function namesCompatible(farmstayName: string, placeName: string): boolean {
  const a = normalizeBusinessName(farmstayName);
  const b = normalizeBusinessName(placeName);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const setB = new Set(tokens(placeName));
  return tokens(farmstayName).some((token) => setB.has(token));
}

// Matches farmstays against Pet Travel catalog places of category "accommodation"
// (the only category whose pet policy could truthfully transfer to a guesthouse).
export function matchFarmstaysToFarmstays(
  farmstays: FarmstayCandidate[],
  places: Pick<RawPlace, "id" | "name" | "category" | "coordinates" | "petPolicy">[],
): PetPolicyMatch[] {
  const accommodations = places.filter((place) => place.category === "accommodation");
  const matches: PetPolicyMatch[] = [];
  for (const farmstay of farmstays) {
    let best: { place: (typeof accommodations)[number]; distance: number } | null = null;
    for (const place of accommodations) {
      const distance = haversineMeters(farmstay.latitude, farmstay.longitude, place.coordinates.latitude, place.coordinates.longitude);
      if (distance > MAX_METERS) continue;
      if (!namesCompatible(farmstay.businessName, place.name)) continue;
      if (!best || distance < best.distance) best = { place, distance };
    }
    if (best) {
      matches.push({
        farmstayId: farmstay.farmstayId,
        placeId: best.place.id,
        placeName: best.place.name,
        distanceMeters: Math.round(best.distance),
        sourceText: best.place.petPolicy.sourceText,
        sourceUrl: best.place.petPolicy.sourceUrl,
        observedAt: best.place.petPolicy.observedAt,
      });
    }
  }
  return matches;
}
