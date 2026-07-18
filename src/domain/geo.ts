import type { AuxiliaryPlace } from "@/data/contracts";

export type Coordinates = { latitude: number; longitude: number };

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371.0088;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type NearbyPlace = AuxiliaryPlace & { distanceKm: number };

export function orderNearbyPlaces(places: AuxiliaryPlace[], origin: Coordinates): NearbyPlace[] {
  return places.map((place) => ({ ...place, distanceKm: distanceKm(origin, place.coordinates) })).sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name, "ko"));
}

export function splitNearbyByPetStatus(places: NearbyPlace[]) {
  return {
    confirmed: places.filter((place) => place.petStatus === "confirmed"),
    confirmationNeeded: places.filter((place) => place.petStatus === "unknown")
  };
}
