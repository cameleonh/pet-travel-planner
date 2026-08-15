import { z } from "zod";
import { formatKstInstant, parseKstInstant, formatProviderDeparture } from "@/domain/planning/kst-time";
import type { RoutingProvider } from "@/domain/planning/providers/routing-provider";

const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    summary: z.object({ distanceKm: z.number().nonnegative(), durationMinutes: z.number().int().nonnegative(), taxiFare: z.number().int().nonnegative().nullable(), tollFee: z.number().int().nonnegative().nullable() }),
    congestion: z.object({ smooth: z.number().int().nonnegative(), slow: z.number().int().nonnegative(), congested: z.number().int().nonnegative(), jammed: z.number().int().nonnegative() }),
    congestedRoads: z.array(z.object({ name: z.string(), distance: z.number().nonnegative(), speed: z.number().nonnegative(), state: z.number().int() })),
    trafficBasis: z.enum(["live", "forecast"]).optional(),
    departureTime: z.string().nullable().optional(),
    mapLink: z.string().url(),
    naviLink: z.string().url(),
  }).nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable().optional(),
  meta: z.object({ requestId: z.string().optional() }).optional(),
});

export type DirectionsApiProviderOptions = {
  endpoint?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export function createDirectionsApiProvider(options: DirectionsApiProviderOptions = {}): RoutingProvider {
  const endpoint = options.endpoint ?? "/api/directions";
  const timeoutMs = options.timeoutMs ?? 5_000;
  const fetcher = options.fetcher ?? fetch;
  return {
    capability: "provider-road",
    async route(input, signal) {
      const query = new URLSearchParams({
        origin: `${input.from.longitude},${input.from.latitude}`,
        destination: `${input.to.longitude},${input.to.latitude}`,
        originName: input.fromItemId,
        destName: input.toItemId,
      });
      const departure = input.departureAt ? formatProviderDeparture(parseKstInstant(input.departureAt)) : null;
      if (departure) query.set("departureTime", departure);
      const timeout = AbortSignal.timeout(timeoutMs);
      const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      const response = await fetcher(`${endpoint}?${query.toString()}`, { signal: requestSignal });
      const body = responseSchema.safeParse(await response.json());
      if (!body.success || !response.ok || !body.data.success || !body.data.data) {
        const error = new Error(body.success ? body.data.error?.message ?? "Route provider unavailable" : "Invalid route response");
        (error as Error & { code?: string }).code = body.success ? body.data.error?.code : "INVALID_RESPONSE";
        throw error;
      }
      const data = body.data.data;
      const fetchedAt = formatKstInstant(Date.now());
      return {
        id: input.legId,
        fromItemId: input.fromItemId,
        toItemId: input.toItemId,
        basis: "provider-road",
        provider: "kakao",
        distanceKm: Math.round(data.summary.distanceKm * 100) / 100,
        durationMinutes: data.summary.durationMinutes,
        durationBasis: data.trafficBasis ?? "live",
        trafficDetailsBasis: data.trafficBasis === "forecast" ? "unavailable" : "live",
        forecastDepartureAt: input.departureAt,
        fetchedAt,
        congestedRoads: data.congestedRoads.map((road) => ({ name: road.name, distanceMeters: road.distance, speedKph: road.speed, state: road.state >= 4 ? "jammed" : road.state === 3 ? "congested" : "slow" })),
        cost: { taxiFareKrw: data.summary.taxiFare, tollFeeKrw: data.summary.tollFee },
        mapLink: data.mapLink,
        naviLink: data.naviLink,
        issueCode: null,
      };
    },
  };
}
