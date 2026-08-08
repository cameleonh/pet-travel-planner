import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  origin: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/),
  destination: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/),
  waypoints: z.string().optional(),
});

const roadSchema = z.object({
  name: z.string().default(""),
  distance: z.number().default(0),
  duration: z.number().default(0),
  traffic_speed: z.number().nullable().default(0),
  traffic_state: z.number().nullable().default(0),
  vertexes: z.string().default(""),
}).passthrough();

const sectionSchema = z.object({
  distance: z.number().default(0),
  duration: z.number().default(0),
  roads: z.array(roadSchema).default([]),
}).passthrough();

const guideSchema = z.object({
  name: z.string().default(""),
  distance: z.number().default(0),
  duration: z.number().default(0),
  type: z.string().optional(),
}).passthrough();

const routeSchema = z.object({
  summary: z.object({
    distance: z.number(),
    duration: z.number(),
    fare: z.object({ taxi: z.number().optional(), toll: z.number().optional() }).passthrough().optional(),
  }).passthrough(),
  sections: z.array(sectionSchema).default([]),
  guides: z.array(guideSchema).default([]),
}).passthrough();

const naviResponseSchema = z.object({
  routes: z.array(z.unknown()),
}).passthrough();

const STATE_LABELS: Record<number, string> = { 0: "정보없음", 1: "원활", 2: "서행", 3: "지정체", 4: "정체" };
const STATE_COLORS: Record<number, string> = { 0: "#999", 1: "#4ade80", 2: "#facc15", 3: "#fb923c", 4: "#f87171" };

const API_BASE = "https://apis-navi.kakaomobility.com/v1/directions";

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const apiKey = process.env.KAKAO_REST_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "API 키가 설정되지 않았습니다." }, meta: { requestId } },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const { origin, destination, waypoints } = querySchema.parse({
      origin: url.searchParams.get("origin") ?? undefined,
      destination: url.searchParams.get("destination") ?? undefined,
      waypoints: url.searchParams.get("waypoints") ?? undefined,
    });

    const apiUrl = new URL(API_BASE);
    apiUrl.searchParams.set("origin", origin);
    apiUrl.searchParams.set("destination", destination);
    if (waypoints) apiUrl.searchParams.set("waypoints", waypoints);
    apiUrl.searchParams.set("priority", "RECOMMEND");
    apiUrl.searchParams.set("vehicle", "car");
    apiUrl.searchParams.set("summary", "false");

    const response = await fetch(apiUrl.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}`, "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "경로 정보를 불러오지 못했습니다." }, meta: { requestId } },
        { status: 502 },
      );
    }

    const json: unknown = await response.json();
    const parsed = naviResponseSchema.safeParse(json);
    if (!parsed.success || parsed.data.routes.length === 0) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "NO_ROUTE", message: "경로를 찾을 수 없습니다." }, meta: { requestId } },
        { status: 404 },
      );
    }

    const route = parsed.data.routes[0] as z.infer<typeof routeSchema>;
    const summary = route.summary;
    const allRoads = (route.sections ?? []).flatMap((s) => s.roads ?? []);

    const congestionSummary = { smooth: 0, slow: 0, congested: 0, jammed: 0, unknown: 0 };
    for (const road of allRoads) {
      const state = road.traffic_state ?? 0;
      if (state === 1) congestionSummary.smooth++;
      else if (state === 2) congestionSummary.slow++;
      else if (state === 3) congestionSummary.congested++;
      else if (state === 4) congestionSummary.jammed++;
      else congestionSummary.unknown++;
    }

    const congestedRoads = allRoads
      .filter((r) => (r.traffic_state ?? 0) >= 3)
      .map((r) => ({
        name: r.name || "(이름없음)",
        distance: r.distance,
        speed: r.traffic_speed ?? 0,
        state: r.traffic_state ?? 0,
        stateLabel: STATE_LABELS[r.traffic_state ?? 0] ?? "정보없음",
        stateColor: STATE_COLORS[r.traffic_state ?? 0] ?? "#999",
      }));

    const guides = (route.guides ?? []).map((g) => ({
      name: g.name,
      distance: g.distance,
      duration: g.duration,
    }));

    const [originLng, originLat] = origin.split(",").map(Number);
    const [destLng, destLat] = destination.split(",").map(Number);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          distanceMeters: summary.distance,
          durationSeconds: summary.duration,
          distanceKm: Math.round(summary.distance / 10) / 100,
          durationMinutes: Math.round(summary.duration / 60),
          taxiFare: summary.fare?.taxi ?? null,
          tollFee: summary.fare?.toll ?? null,
        },
        congestion: {
          totalSegments: allRoads.length,
          smooth: congestionSummary.smooth,
          slow: congestionSummary.slow,
          congested: congestionSummary.congested,
          jammed: congestionSummary.jammed,
          hasCongestion: congestionSummary.congested + congestionSummary.jammed > 0,
        },
        congestedRoads: congestedRoads.slice(0, 10),
        guides: guides.slice(0, 15),
        mapLink: `https://map.kakao.com/link/from/출발지/${originLat},${originLng}/to/도착지/${destLat},${destLng}`,
        naviLink: `https://map.kakao.com/link/to/도착지,${destLat},${destLng}`,
      },
      error: null,
      meta: { requestId },
    }, { headers: { "Content-Language": "ko", "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, data: null, error: { code: "INVALID_QUERY", message: "출발지와 도착지 좌표를 확인해 주세요." }, meta: { requestId } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "경로 정보를 불러오지 못했습니다." }, meta: { requestId } },
      { status: 502 },
    );
  }
}
