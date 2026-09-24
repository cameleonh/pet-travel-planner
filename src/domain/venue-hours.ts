export type VenueVisitWindowStatus = "within-hours" | "outside-hours" | "closed-day" | "unknown";

export type VenueVisitWindowAssessment = {
  status: VenueVisitWindowStatus;
  closingDayChecked: boolean;
};

type Input = {
  tripDate: string;
  arrivalAt: Date | null;
  dwellMinutes: number;
  useTime: string | null;
  restDate: string | null;
};

const WEEKDAY_INDEX: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

function cleanKtoText(value: string | null): string {
  return (value ?? "").replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseMinute(hourText: string, minuteText: string, allowEndOfDay = false): number | null {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (allowEndOfDay && hour === 24 && minute === 0) return 24 * 60;
  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

function checkClosingDay(tripDate: string, restDate: string | null): { closed: boolean; known: boolean } {
  const text = cleanKtoText(restDate);
  if (!text) return { closed: false, known: false };
  if (/연중\s*무휴/.test(text)) return { closed: false, known: true };

  const date = new Date(`${tripDate}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== tripDate) return { closed: false, known: false };
  const weeklyMatches = [...text.matchAll(/매주\s*([월화수목금토일])(?:요일)?/g)];
  if (weeklyMatches.length > 0) {
    const remainder = text
      .replace(/매주\s*[월화수목금토일](?:요일)?/g, "")
      .replace(/정기\s*휴무|휴무|휴관|휴점/g, "")
      .replace(/[\s,，·/및과()（）]/g, "");
    if (remainder !== "") return { closed: false, known: false };
    const weeklyDays = weeklyMatches.map((match) => WEEKDAY_INDEX[match[1]!]);
    return { closed: weeklyDays.includes(date.getUTCDay()), known: true };
  }
  if (/휴무|휴관|휴점/.test(text)) return { closed: false, known: false };
  return { closed: false, known: true };
}

export function assessVenueVisitWindow(input: Input): VenueVisitWindowAssessment {
  const closingDay = checkClosingDay(input.tripDate, input.restDate);
  if (closingDay.closed) return { status: "closed-day", closingDayChecked: true };

  const hoursText = cleanKtoText(input.useTime);
  const arrivalAt = input.arrivalAt;
  if (!hoursText || !arrivalAt || !Number.isFinite(arrivalAt.getTime()) || input.dwellMinutes < 0) {
    return { status: "unknown", closingDayChecked: closingDay.known };
  }
  if (/평일|주말|동절기|하절기|기간별|변동/.test(hoursText)) {
    return { status: "unknown", closingDayChecked: closingDay.known };
  }

  const ranges = [...hoursText.matchAll(/(\d{1,2}):(\d{2})\s*(?:~|∼|～|〜|–|-)\s*(\d{1,2}):(\d{2})/g)];
  if (ranges.length !== 1) return { status: "unknown", closingDayChecked: closingDay.known };
  const range = ranges[0]!;
  const opensAt = parseMinute(range[1]!, range[2]!);
  const closesAt = parseMinute(range[3]!, range[4]!, true);
  if (opensAt === null || closesAt === null || closesAt <= opensAt) {
    return { status: "unknown", closingDayChecked: closingDay.known };
  }

  const arrivalMinute = arrivalAt.getHours() * 60 + arrivalAt.getMinutes();
  const departureMinute = arrivalMinute + input.dwellMinutes;
  return {
    status: arrivalMinute >= opensAt && departureMinute <= closesAt ? "within-hours" : "outside-hours",
    closingDayChecked: closingDay.known,
  };
}
