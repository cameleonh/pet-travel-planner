import { describe, expect, it } from "vitest";
import { assessVenueVisitWindow } from "@/domain/venue-hours";

describe("venue visit window assessment", () => {
  it("accepts a stay that fits in one clearly stated daily opening interval", () => {
    expect(assessVenueVisitWindow({
      tripDate: "2026-09-25",
      arrivalAt: new Date(2026, 8, 25, 10, 0),
      dwellMinutes: 120,
      useTime: "매일 09:00~18:00",
      restDate: "매주 월요일 휴무",
    })).toEqual({ status: "within-hours", closingDayChecked: true });
  });

  it("flags a scheduled visit that ends after the published closing time", () => {
    expect(assessVenueVisitWindow({
      tripDate: "2026-09-25",
      arrivalAt: new Date(2026, 8, 25, 17, 30),
      dwellMinutes: 90,
      useTime: "09:00~18:00",
      restDate: "연중무휴",
    })).toEqual({ status: "outside-hours", closingDayChecked: true });
  });

  it("identifies a matching weekly closing day without guessing an arrival", () => {
    expect(assessVenueVisitWindow({
      tripDate: "2026-09-28",
      arrivalAt: null,
      dwellMinutes: 90,
      useTime: null,
      restDate: "매주 월요일 휴무",
    })).toEqual({ status: "closed-day", closingDayChecked: true });
  });

  it("does not treat partially understood holiday closures as a complete weekly schedule", () => {
    expect(assessVenueVisitWindow({
      tripDate: "2026-09-25",
      arrivalAt: new Date(2026, 8, 25, 10, 0),
      dwellMinutes: 60,
      useTime: "09:00~18:00",
      restDate: "매주 월요일, 공휴일 휴무",
    })).toEqual({ status: "within-hours", closingDayChecked: false });
  });

  it("keeps split, seasonal, and unavailable hours unverified", () => {
    const base = { tripDate: "2026-09-25", arrivalAt: new Date(2026, 8, 25, 10, 0), dwellMinutes: 60, restDate: null };
    expect(assessVenueVisitWindow({ ...base, useTime: "09:00~12:00, 13:00~18:00" }).status).toBe("unknown");
    expect(assessVenueVisitWindow({ ...base, useTime: "평일 09:00~18:00, 주말 10:00~17:00" }).status).toBe("unknown");
    expect(assessVenueVisitWindow({ ...base, useTime: null }).status).toBe("unknown");
  });
});
