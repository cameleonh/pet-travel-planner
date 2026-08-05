import { z } from "zod";

const OFFICIAL_CATALOG_URL = "https://www.data.go.kr/data/15067306/openapi.do";

const headerSchema = z.object({ resultCode: z.string(), resultMsg: z.string() });

const routeItemSchema = z.object({
  routeIdx: z.string(),
  themeNm: z.string(),
  linemsg: z.string().optional(),
  themedescs: z.string().optional(),
  brdDiv: z.string().optional(),
}).passthrough();

const courseItemSchema = z.object({
  routeIdx: z.string(),
  crsIdx: z.string(),
  crsKorNm: z.string(),
  crsDstnc: z.string().optional(),
  crsTotlRqrmHour: z.string().optional(),
  crsLevel: z.string().optional(),
  crsCycle: z.string().optional(),
  sigun: z.string().optional(),
  brdDiv: z.string().optional(),
  gpxpath: z.string().optional(),
  crsSummary: z.string().optional(),
  crsTourInfo: z.string().optional(),
  travelerinfo: z.string().optional(),
  themeNm: z.string().optional(),
}).passthrough();

export type RouteItem = z.infer<typeof routeItemSchema>;
export type CourseItem = z.infer<typeof courseItemSchema>;

function envelopeSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    response: z.object({
      header: headerSchema,
      body: z.object({
        items: z.union([
          z.object({ item: z.union([z.array(itemSchema), itemSchema]) }),
          z.literal(""),
          z.null(),
        ]),
        numOfRows: z.coerce.number(),
        pageNo: z.coerce.number(),
        totalCount: z.coerce.number(),
      }),
    }),
  });
}

const routeEnvelopeSchema = envelopeSchema(routeItemSchema);
const courseEnvelopeSchema = envelopeSchema(courseItemSchema);

type Options = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  requestIntervalMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type TrailRecord = {
  crs_idx: string;
  route_idx: string;
  crs_kor_nm: string;
  theme_nm: string | null;
  linemsg: string | null;
  crs_dstnc: number | null;
  crs_totl_rqrm_hour: number | null;
  crs_level: number | null;
  crs_cycle: string | null;
  sigun: string | null;
  brd_div: string | null;
  gpxpath: string | null;
  crs_summary: string | null;
  crs_tour_info: string | null;
  travelerinfo: string | null;
};

export class TrailProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly requestIntervalMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: Options = {}) {
    this.apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    this.baseUrl = options.baseUrl ?? "http://apis.data.go.kr/B551011/Durunubi";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestIntervalMs = options.requestIntervalMs ?? 300;
    this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

    if (!this.apiKey) {
      throw new Error("TOUR_API_KEY is required for the trail provider.");
    }
  }

  async fetchAllRoutes(): Promise<RouteItem[]> {
    const url = new URL(`${this.baseUrl}/routeList`);
    url.searchParams.set("serviceKey", this.apiKey);
    url.searchParams.set("numOfRows", "100");
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "같이갈개");
    url.searchParams.set("_type", "json");

    const response = await this.fetchImpl(url.toString());
    const json = await response.json();
    const parsed = routeEnvelopeSchema.safeParse(json);
    if (!parsed.success) return [];

    const body = parsed.data.response.body;
    return body.items === "" || body.items === null ? [] : (Array.isArray(body.items.item) ? body.items.item : [body.items.item]);
  }

  async fetchCoursesForRoute(routeIdx: string): Promise<CourseItem[]> {
    const url = new URL(`${this.baseUrl}/courseList`);
    url.searchParams.set("serviceKey", this.apiKey);
    url.searchParams.set("routeIdx", routeIdx);
    url.searchParams.set("numOfRows", "100");
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "같이갈개");
    url.searchParams.set("_type", "json");

    const response = await this.fetchImpl(url.toString());
    const json = await response.json();
    const parsed = courseEnvelopeSchema.safeParse(json);
    if (!parsed.success) return [];

    const body = parsed.data.response.body;
    return body.items === "" || body.items === null ? [] : (Array.isArray(body.items.item) ? body.items.item : [body.items.item]);
  }

  async fetchAllCourses(): Promise<TrailRecord[]> {
    const routes = await this.fetchAllRoutes();
    const allCourses: CourseItem[] = [];

    for (const route of routes) {
      await this.sleep(this.requestIntervalMs);
      const courses = await this.fetchCoursesForRoute(route.routeIdx);
      allCourses.push(...courses);
    }

    const routeMap = new Map(routes.map((r) => [r.routeIdx, r]));

    return allCourses.map((course): TrailRecord => ({
      crs_idx: course.crsIdx,
      route_idx: course.routeIdx,
      crs_kor_nm: course.crsKorNm,
      theme_nm: course.themeNm ?? routeMap.get(course.routeIdx)?.themeNm ?? null,
      linemsg: routeMap.get(course.routeIdx)?.linemsg ?? null,
      crs_dstnc: course.crsDstnc ? parseFloat(course.crsDstnc) : null,
      crs_totl_rqrm_hour: course.crsTotlRqrmHour ? parseInt(course.crsTotlRqrmHour, 10) : null,
      crs_level: course.crsLevel ? parseInt(course.crsLevel, 10) : null,
      crs_cycle: course.crsCycle ?? null,
      sigun: course.sigun ?? null,
      brd_div: course.brdDiv ?? null,
      gpxpath: course.gpxpath ?? null,
      crs_summary: course.crsSummary ?? null,
      crs_tour_info: course.crsTourInfo ?? null,
      travelerinfo: course.travelerinfo ?? null,
    }));
  }

  get catalogUrl(): string {
    return OFFICIAL_CATALOG_URL;
  }
}
