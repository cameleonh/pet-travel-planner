"use client";

import { useEffect, useState } from "react";
import type { Coordinates } from "@/domain/geo";
import type { DailyWeather } from "@/domain/weather";

type WeatherApiResponse = {
  success: boolean;
  data: { coordinates: Coordinates; days: DailyWeather[] } | null;
  error: { message: string } | null;
};

type ForecastState = {
  key: string;
  days: DailyWeather[];
  failed: boolean;
};

const EMPTY_STATE: ForecastState = { key: "", days: [], failed: false };

export type DailyForecastState = {
  days: DailyWeather[];
  loading: boolean;
  failed: boolean;
};

export function useDailyForecast(coordinates: Coordinates | null): DailyForecastState {
  const [state, setState] = useState<ForecastState>(EMPTY_STATE);
  const key = coordinates ? `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}` : "";

  useEffect(() => {
    if (!coordinates) return;
    const controller = new AbortController();
    const requestKey = `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
    fetch(`/api/weather?lat=${coordinates.latitude}&lon=${coordinates.longitude}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as WeatherApiResponse;
        if (!response.ok || !json.success || !json.data) throw new Error(json.error?.message ?? "weather failed");
        setState({ key: requestKey, days: json.data.days, failed: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ key: requestKey, days: [], failed: true });
      });
    return () => controller.abort();
  }, [coordinates]);

  if (key === "") return { days: [], loading: false, failed: false };
  if (state.key !== key) return { days: [], loading: true, failed: false };
  return { days: state.days, loading: false, failed: state.failed };
}
