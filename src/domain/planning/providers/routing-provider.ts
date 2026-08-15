import type { Coordinates } from "@/domain/geo";
import type { RouteLeg } from "@/domain/planning/contracts";

export type RoutingRequest = {
  legId: string;
  fromItemId: string;
  toItemId: string;
  from: Coordinates;
  to: Coordinates;
  departureAt: string | null;
};

export type RoutingProvider = {
  capability: "provider-road" | "coordinate-only";
  route(input: RoutingRequest, signal?: AbortSignal): Promise<RouteLeg>;
};
