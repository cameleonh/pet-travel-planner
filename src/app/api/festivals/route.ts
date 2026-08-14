import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });
const festivalItemSchema = z.object({
  contentid: z.string(),
  title: z.string(),
  eventstartdate: z.string(),
  eventenddate: z.string(),
  addr1: z.string().optional(),
  tel: z.string().optional(),
  firstimage: z.string().optional(),
  mapx: z.string().optional(),
  mapy: z.string().optional(),
  areacode: z.string().optional(),
  sigungucode: z.string().optional(),
  cat1: z.string().optional(),
  cat2: z.string().optional(),
}).passthrough();

const festivalEnvelopeSchema = z.object({
  response: z.object({
    header: headerSchema,
    body: z.object({
      items: z.union([
        z.object({ item: z.union([z.array(festivalItemSchema), festivalItemSchema]) }),
        z.literal(""),
        z.null(),
      ]),
      numOfRows: z.coerce.number(),
      pageNo: z.coerce.number(),
      totalCount: z.coerce.number(),
    }),
  }),
});

type FestivalItem = z.infer<typeof festivalItemSchema>;

const API_BASE = "http://apis.data.go.kr/B551011/KorService2";

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function isOngoing(startDate: string, endDate: string): boolean {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return yyyymmdd >= startDate && yyyymmdd <= endDate;
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const apiKey = process.env.TOUR_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json({ success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "API 키가 설정되지 않았습니다." }, meta: { requestId } }, { status: 503 });
    }

    const url = new URL(request.url);
    const today = new Date();
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const defaultEnd = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const defaultEndStr = `${defaultEnd.getFullYear()}${String(defaultEnd.getMonth() + 1).padStart(2, "0")}${String(defaultEnd.getDate()).padStart(2, "0")}`;

    const startDate = z.string().default(todayStr).parse(url.searchParams.get("startDate") ?? todayStr);
    const endDate = z.string().default(defaultEndStr).parse(url.searchParams.get("endDate") ?? defaultEndStr);
    const region = z.string().trim().max(40).default("").parse(url.searchParams.get("region") ?? "");

    const apiUrl = new URL(`${API_BASE}/searchFestival2`);
    apiUrl.searchParams.set("serviceKey", apiKey);
    apiUrl.searchParams.set("eventStartDate", startDate);
    apiUrl.searchParams.set("eventEndDate", endDate);
    apiUrl.searchParams.set("numOfRows", "100");
    apiUrl.searchParams.set("pageNo", "1");
    apiUrl.searchParams.set("MobileOS", "ETC");
    apiUrl.searchParams.set("MobileApp", "같이갈개");
    apiUrl.searchParams.set("_type", "json");
    apiUrl.searchParams.set("arrange", "C");

    const response = await fetch(apiUrl.toString(), {
      next: { revalidate: 60 * 60 },
      signal: AbortSignal.timeout(3_000),
    });
    const json = await response.json();

    if (typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json) {
      return NextResponse.json({ success: true, data: { festivals: [], count: 0 }, error: null, meta: { requestId } });
    }

    const parsed = festivalEnvelopeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: true, data: { festivals: [], count: 0 }, error: null, meta: { requestId } });
    }

    const body = parsed.data.response.body;
    const items: FestivalItem[] = body.items === "" || body.items === null ? [] : (Array.isArray(body.items.item) ? body.items.item : [body.items.item]);

    // Filter by region if specified
    const filtered = region.trim()
      ? items.filter((item) => {
          const searchText = `${item.addr1 ?? ""}`.toLowerCase();
          return region.trim().toLowerCase().split(/\s+/).every((term: string) => searchText.includes(term));
        })
      : items;

    const festivals = filtered.map((item) => ({
      contentId: item.contentid,
      title: item.title,
      startDate: item.eventstartdate,
      endDate: item.eventenddate,
      startDateFormatted: formatDate(item.eventstartdate),
      endDateFormatted: formatDate(item.eventenddate),
      ongoing: isOngoing(item.eventstartdate, item.eventenddate),
      address: item.addr1 ?? null,
      tel: item.tel ?? null,
      imageUrl: item.firstimage ?? null,
      mapx: item.mapx ?? null,
      mapy: item.mapy ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: { festivals, count: festivals.length, searchRange: { startDate, endDate } },
      error: null,
      meta: { requestId },
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", "Content-Language": "ko", "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, data: null, error: { code: "INVALID_QUERY", message: "검색 조건을 확인해 주세요." }, meta: { requestId } }, { status: 400 });
    }
    return NextResponse.json({ success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "축제 정보를 불러오지 못했습니다." }, meta: { requestId } }, { status: 502 });
  }
}
