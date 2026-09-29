import { distanceKm } from "@/domain/geo";
import type {
  PlanIssue,
  PlanningItemSnapshot,
  PlanningRequestV1,
  RouteIssueCode,
  RouteLeg,
} from "@/domain/planning/contracts";
import { createPlanIssue } from "@/domain/planning/issues";
import type { RoutingProvider } from "@/domain/planning/providers/routing-provider";

export type RouteLegBuildResult = {
  legs: RouteLeg[];
  issues: PlanIssue[];
};

type RoutePair = {
  from: PlanningItemSnapshot;
  to: PlanningItemSnapshot;
  returnLeg: boolean;
};

function routeIssue(code: RouteIssueCode): PlanIssue["code"] {
  return code;
}

// Kakao map/navi links must use the place NAMES, not the internal item ids
// (e.g. "tour-api:127778"), otherwise the map shows the raw id.
function kakaoLinks(from: PlanningItemSnapshot, to: PlanningItemSnapshot): { mapLink: string; naviLink: string } {
  const label = (item: PlanningItemSnapshot) => encodeURIComponent(item.name);
  const coords = (item: PlanningItemSnapshot) => item.coordinates ? `,${item.coordinates.latitude},${item.coordinates.longitude}` : "";
  return {
    mapLink: `https://map.kakao.com/link/from/${label(from)}${coords(from)}/to/${label(to)}${coords(to)}`,
    naviLink: `https://map.kakao.com/?sName=${label(from)}&eName=${label(to)}`,
  };
}

function fallbackLeg(pair: RoutePair, issueCode: RouteIssueCode): RouteLeg | null {
  if (!pair.from.coordinates || !pair.to.coordinates) return null;
  const id = `${pair.from.id}->${pair.to.id}`;
  const distance = Math.round(distanceKm(pair.from.coordinates, pair.to.coordinates) * 100) / 100;
  const { mapLink, naviLink } = kakaoLinks(pair.from, pair.to);
  return {
    id,
    fromItemId: pair.from.id,
    toItemId: pair.to.id,
    basis: "coordinate-only",
    provider: "haversine",
    distanceKm: distance,
    durationMinutes: null,
    durationBasis: "unknown",
    trafficDetailsBasis: "unavailable",
    forecastDepartureAt: null,
    fetchedAt: null,
    congestedRoads: [],
    cost: { taxiFareKrw: null, tollFeeKrw: null },
    mapLink,
    naviLink,
    issueCode,
  };
}

function asErrorCode(error: unknown): RouteIssueCode {
  if (error instanceof DOMException && error.name === "AbortError") return "ROUTE_TIMEOUT";
  if (error instanceof Error && /timeout|abort/i.test(error.message)) return "ROUTE_TIMEOUT";
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "NO_ROUTE" || code === "ROUTE_TIMEOUT" || code === "ROUTE_PROVIDER_UNAVAILABLE") return code;
  }
  return "ROUTE_PROVIDER_UNAVAILABLE";
}

function pairs(items: PlanningItemSnapshot[], request: PlanningRequestV1): RoutePair[] {
  const values: RoutePair[] = items.slice(0, -1).map((from, index) => ({
    from,
    to: items[index + 1]!,
    returnLeg: false,
  }));
  if (request.endPolicy === "return-to-start" && items.length > 1) {
    values.push({ from: items.at(-1)!, to: items[0]!, returnLeg: true });
  }
  return values;
}

export async function buildRouteLegs(input: {
  request: PlanningRequestV1;
  orderedItems: PlanningItemSnapshot[];
  provider: RoutingProvider;
  signal?: AbortSignal;
  concurrency?: number;
}): Promise<RouteLegBuildResult> {
  const routePairs = pairs(input.orderedItems, input.request);
  const legsById = new Map<string, RouteLeg>();
  const issues: PlanIssue[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < routePairs.length) {
      const pair = routePairs[cursor++];
      if (!pair) return;
      const legId = `${pair.from.id}->${pair.to.id}`;
      if (!pair.from.coordinates || !pair.to.coordinates) {
        issues.push(createPlanIssue("ITEM_WITHOUT_COORDINATES", "warning", "build-route-legs", {
          itemId: pair.from.coordinates ? pair.to.id : pair.from.id,
          params: { returnLeg: pair.returnLeg },
        }));
        return;
      }
      try {
        const leg = await input.provider.route({
          legId,
          fromItemId: pair.from.id,
          toItemId: pair.to.id,
          from: pair.from.coordinates,
          to: pair.to.coordinates,
          departureAt: null,
        }, input.signal);
        // Providers key the map link by item id; replace it with a name-based one.
        const { mapLink, naviLink } = kakaoLinks(pair.from, pair.to);
        legsById.set(leg.id, { ...leg, mapLink, naviLink });
      } catch (error) {
        const code = asErrorCode(error);
        const fallback = fallbackLeg(pair, code);
        if (fallback) legsById.set(fallback.id, fallback);
        issues.push(createPlanIssue(routeIssue(code), "warning", "build-route-legs", {
          legId,
          params: { from: pair.from.name, to: pair.to.name },
        }));
      }
    }
  };
  const workers = Math.min(Math.max(input.concurrency ?? 3, 1), Math.max(routePairs.length, 1));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  const legs = routePairs.map((pair) => legsById.get(`${pair.from.id}->${pair.to.id}`)).filter((leg): leg is RouteLeg => Boolean(leg));
  return { legs, issues };
}
