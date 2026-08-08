import type { Coordinates } from "@/domain/geo";

export type PlanPlace = {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: Coordinates;
  policySourceText: string;
  exact: boolean;
};

export type RouteSegment = {
  fromPlaceId: string;
  toPlaceId: string;
  fromName: string;
  toName: string;
  distanceKm: number;
  durationMinutes: number;
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
