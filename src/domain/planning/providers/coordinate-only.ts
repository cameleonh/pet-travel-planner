import { distanceKm } from "@/domain/geo";
import type { RoutingProvider } from "@/domain/planning/providers/routing-provider";

function mapLink(fromItemId: string, toItemId: string) {
  return `https://map.kakao.com/link/from/${encodeURIComponent(fromItemId)}/to/${encodeURIComponent(toItemId)}`;
}

export const coordinateOnlyRoutingProvider: RoutingProvider = {
  capability: "coordinate-only",
  async route(input) {
    const roundedDistance = Math.round(distanceKm(input.from, input.to) * 100) / 100;
    return {
      id: input.legId,
      fromItemId: input.fromItemId,
      toItemId: input.toItemId,
      basis: "coordinate-only",
      provider: "haversine",
      distanceKm: roundedDistance,
      durationMinutes: null,
      durationBasis: "unknown",
      trafficDetailsBasis: "unavailable",
      forecastDepartureAt: null,
      fetchedAt: null,
      congestedRoads: [],
      cost: { taxiFareKrw: null, tollFeeKrw: null },
      mapLink: mapLink(input.fromItemId, input.toItemId),
      naviLink: mapLink(input.fromItemId, input.toItemId),
      issueCode: null,
    };
  },
};
