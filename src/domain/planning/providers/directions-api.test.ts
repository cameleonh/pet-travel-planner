import { describe, expect, it, vi, beforeEach } from "vitest";
import { createDirectionsApiProvider } from "./directions-api";

describe("createDirectionsApiProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully fetches route from external directions API", async () => {
    const mockPayload = {
      success: true,
      data: {
        summary: {
          distanceKm: 12.5,
          durationMinutes: 15,
          taxiFare: 15000,
          tollFee: 1200,
        },
        congestion: {
          smooth: 10,
          slow: 2,
          congested: 1,
          jammed: 0,
        },
        congestedRoads: [
          { name: "올림픽대로", distance: 5000, speed: 20, state: 3 },
          { name: "강변북로", distance: 7500, speed: 60, state: 1 },
        ],
        trafficBasis: "live",
        departureTime: "202608200900",
        mapLink: "https://map.kakao.com/link/to/dest",
        naviLink: "https://kakaonavi.kakao.com/navigate",
      },
    };

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    } as Response);

    const provider = createDirectionsApiProvider({ fetcher: mockFetcher as unknown as typeof fetch });
    const result = await provider.route({
      legId: "leg-1",
      fromItemId: "a",
      toItemId: "b",
      from: { latitude: 37.5, longitude: 127.0 },
      to: { latitude: 37.6, longitude: 127.1 },
      departureAt: "2026-08-20T09:00:00+09:00",
    });

    expect(result.basis).toBe("provider-road");
    expect(result.distanceKm).toBe(12.5);
    expect(result.durationMinutes).toBe(15);
    expect(result.cost.tollFeeKrw).toBe(1200);
    expect(result.congestedRoads?.[0]?.name).toBe("올림픽대로");
    expect(result.congestedRoads?.[0]?.state).toBe("congested");
  });

  it("throws when API returns error response", async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: "API_LIMIT_EXCEEDED", message: "Quota exceeded" },
      }),
    } as Response);

    const provider = createDirectionsApiProvider({ fetcher: mockFetcher as unknown as typeof fetch });
    await expect(
      provider.route({
        legId: "leg-2",
        fromItemId: "a",
        toItemId: "b",
        from: { latitude: 37.5, longitude: 127.0 },
        to: { latitude: 37.6, longitude: 127.1 },
        departureAt: null,
      }),
    ).rejects.toThrow();
  });
});
