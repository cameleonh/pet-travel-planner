import { describe, expect, it } from "vitest";
import { parseOpenMeteoDaily } from "./weather-provider";

const sample = {
  daily: {
    time: ["2026-08-28", "2026-08-29"],
    weather_code: [0, 61],
    temperature_2m_max: [29.4, 24.1],
    temperature_2m_min: [21.8, 19.3],
    precipitation_probability_max: [10, 80],
  },
};

describe("parseOpenMeteoDaily", () => {
  it("maps the daily arrays into rounded DailyWeather entries", () => {
    expect(parseOpenMeteoDaily(sample)).toEqual([
      { date: "2026-08-28", weatherCode: 0, tempMax: 29, tempMin: 22, precipProb: 10 },
      { date: "2026-08-29", weatherCode: 61, tempMax: 24, tempMin: 19, precipProb: 80 },
    ]);
  });

  it("normalizes null values to safe defaults", () => {
    const withNulls = {
      daily: {
        time: ["2026-08-30"],
        weather_code: [2],
        temperature_2m_max: [null],
        temperature_2m_min: [null],
        precipitation_probability_max: [null],
      },
    };
    expect(parseOpenMeteoDaily(withNulls)).toEqual([
      { date: "2026-08-30", weatherCode: 2, tempMax: 0, tempMin: 0, precipProb: 0 },
    ]);
  });

  it("rejects malformed payloads", () => {
    expect(() => parseOpenMeteoDaily({ daily: { time: "not-a-list" } })).toThrow();
    expect(() => parseOpenMeteoDaily({ daily: { time: ["20260828"] } })).toThrow();
  });
});
