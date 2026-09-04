import type { Coordinates } from "@/domain/geo";

export type PlanPlace = {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: Coordinates;
  policySourceText: string;
  exact: boolean;
  /** Per-place dwell override in minutes; null/undefined falls back to the global stay length. */
  dwellMinutes?: number | null;
};

export type PlanActivity = {
  id: string;
  title: string;
  type: "festival" | "trail";
  detail: string;
  url: string | null;
  address?: string;
  coordinates?: Coordinates;
};

export type RouteSegment = {
  fromPlaceId: string;
  toPlaceId: string;
  fromName: string;
  toName: string;
  distanceKm: number;
  durationMinutes: number | null;
  routeMode: "road" | "approximate";
  hasCongestion: boolean;
  congestedRoads: { name: string; distance: number; speed: number; stateLabel: string; stateColor: string }[];
  smoothSegments: number;
  slowSegments: number;
  congestedSegments: number;
  jammedSegments: number;
  mapLink: string;
  naviLink: string;
};

export type PlanItinerary = {
  day1Morning: PlanPlace[];
  day1Afternoon: PlanPlace[];
  day2Morning: PlanPlace[];
  day2Afternoon: PlanPlace[];
};

export type TravelPlan = {
  id: string;
  region: string;
  startDate: string;
  endDate: string;
  petSize: string;
  petWeight: string;
  places: PlanPlace[];
  routes: RouteSegment[];
  createdAt: string;
};
