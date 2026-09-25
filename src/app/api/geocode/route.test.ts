import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/geocode/route";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("geocode API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KAKAO_REST_API_KEY;
  });

  it("prefers a road-address match and returns coordinates", async () => {
    process.env.KAKAO_REST_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => jsonResponse({
      documents: [{
        address_name: "부산 해운대구 우동 1234",
        y: "35.163",
        x: "129.163",
        road_address: { address_name: "부산 해운대구 해운대로 1" },
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("http://localhost/api/geocode?q=%ED%95%B4%EC%9A%B4%EB%8C%80%EC%97%AD"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      name: "부산 해운대구 해운대로 1",
      address: "부산 해운대구 우동 1234",
      roadAddress: "부산 해운대구 해운대로 1",
      latitude: 35.163,
      longitude: 129.163,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to keyword search when no address matches", async () => {
    process.env.KAKAO_REST_API_KEY = "test-key";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const target = String(input);
      if (target.includes("/search/address.json")) return jsonResponse({ documents: [] });
      return jsonResponse({ documents: [{ place_name: "해운대역", address_name: "부산 해운대구 우동", road_address_name: "부산 해운대구 해운대로 796", y: "35.1632", x: "129.1589" }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("http://localhost/api/geocode?q=%ED%95%B4%EC%9A%B4%EB%8C%80%EC%97%AD"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      name: "해운대역",
      address: "부산 해운대구 우동",
      roadAddress: "부산 해운대구 해운대로 796",
      latitude: 35.1632,
      longitude: 129.1589,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prefers the closest keyword name over Kakao's default ranking", async () => {
    process.env.KAKAO_REST_API_KEY = "test-key";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const target = String(input);
      if (target.includes("/search/address.json")) return jsonResponse({ documents: [] });
      return jsonResponse({
        documents: [
          { place_name: "강토탈 속초역주유소", address_name: "강원특별자치도 속초시", road_address_name: null, y: "38.19", x: "128.59" },
          { place_name: "속초역", address_name: "강원특별자치도 속초시", road_address_name: "강원특별자치도 속초시 중앙로 1", y: "38.188", x: "128.588" },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("http://localhost/api/geocode?q=%EC%86%8D%EC%B4%88%EC%97%AD"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe("속초역");
    expect(body.data.latitude).toBe(38.188);
  });

  it("returns NOT_FOUND when neither lookup matches", async () => {
    process.env.KAKAO_REST_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ documents: [] })));

    const response = await GET(new Request("http://localhost/api/geocode?q=%EC%97%86%EB%8A%94%EC%A7%80%EC%97%AD"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("rejects one-character queries", async () => {
    process.env.KAKAO_REST_API_KEY = "test-key";
    const response = await GET(new Request("http://localhost/api/geocode?q=%EA%B0%80"));
    expect(response.status).toBe(400);
  });

  it("reports a missing API key without calling the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new Request("http://localhost/api/geocode?q=%ED%95%B4%EC%9A%B4%EB%8C%80%EC%97%AD"));
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
