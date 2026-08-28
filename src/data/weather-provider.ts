import { z } from "zod";
import type { Coordinates } from "@/domain/geo";
import { WEATHER_FORECAST_DAYS, type DailyWeather } from "@/domain/weather";

const openMeteoDailySchema = z.object({
  daily: z.object({
    time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    weather_code: z.array(z.number()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    precipitation_probability_max: z.array(z.number().nullable()),
  }),
});

export type OpenMeteoDaily = z.infer<typeof openMeteoDailySchema>;

export function parseOpenMeteoDaily(payload: unknown): DailyWeather[] {
  const parsed = openMeteoDailySchema.parse(payload);
  return parsed.daily.time.map((date, index) => ({
    date,
    weatherCode: parsed.daily.weather_code[index] ?? 0,
    tempMax: Math.round(parsed.daily.temperature_2m_max[index] ?? 0),
    tempMin: Math.round(parsed.daily.temperature_2m_min[index] ?? 0),
    precipProb: parsed.daily.precipitation_probability_max[index] ?? 0,
  }));
}

export async function fetchDailyForecast(coordinates: Coordinates): Promise<DailyWeather[]> {
  const parameters = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Seoul",
    forecast_days: String(WEATHER_FORECAST_DAYS),
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${parameters}`, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
  return parseOpenMeteoDaily(await response.json());
}
