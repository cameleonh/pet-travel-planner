import { NextResponse } from "next/server";
import { z } from "zod";
import type { Coordinates } from "@/domain/geo";
import { regionCenter } from "@/domain/weather";
import { fetchDailyForecast } from "@/data/weather-provider";

const querySchema = z.object({
  region: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: { message: "Invalid weather query" } }, { status: 400 });
  }
  let coordinates: Coordinates | null = null;
  if (parsed.data.lat !== undefined && parsed.data.lon !== undefined) {
    coordinates = { latitude: parsed.data.lat, longitude: parsed.data.lon };
  } else if (parsed.data.region) {
    coordinates = regionCenter(parsed.data.region);
  }
  if (!coordinates) {
    return NextResponse.json({ success: false, data: null, error: { message: "Unknown region or coordinates" } }, { status: 400 });
  }
  try {
    const days = await fetchDailyForecast(coordinates);
    return NextResponse.json({ success: true, data: { coordinates, days }, error: null });
  } catch {
    return NextResponse.json({ success: false, data: null, error: { message: "Weather provider unavailable" } }, { status: 502 });
  }
}
