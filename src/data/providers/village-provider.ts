import { readFile } from "node:fs/promises";
import { z } from "zod";

const OFFICIAL_CATALOG_URL = "https://www.data.go.kr/data/15013113/standard.do";

const rawRecordSchema = z.object({
  "체험마을명": z.string().min(1),
  "시도명": z.string().optional(),
  "시군구명": z.string().optional(),
  "체험프로그램구분": z.string().optional(),
  "체험프로그램명": z.string().optional(),
  "보유시설정보": z.string().optional(),
  "체험휴양마을면적": z.string().optional(),
  "체험휴양마을사진": z.string().optional(),
  "소재지도로명주소": z.string().optional(),
  "소재지지번주소": z.string().optional(),
  "대표자명": z.string().optional(),
  "대표전화번호": z.string().optional(),
  "지정일자": z.string().optional(),
  "홈페이지주소": z.string().optional(),
  "관리기관명": z.string().optional(),
  "위도": z.string().optional(),
  "경도": z.string().optional(),
  "데이터기준일자": z.string().optional(),
  "제공기관코드": z.string().optional(),
  "제공기관명": z.string().optional(),
}).passthrough();

const standardDataSchema = z.object({
  fields: z.array(z.object({ id: z.string().optional() })).optional(),
  records: z.array(rawRecordSchema),
});

export type VillageProgram = {
  program_class: string;
  program_name: string;
};

export type VillageRecord = {
  village_id: string;
  name: string;
  sido: string | null;
  sigungu: string | null;
  village_kind: "farm" | "fishing";
  address_road: string | null;
  address_jibun: string | null;
  phone: string | null;
  homepage: string | null;
  designated_at: string | null;
  facility_info: string | null;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  provider_org: string | null;
  data_reference_date: string | null;
  programs: VillageProgram[];
};

// Program lists are "+"-separated, but names like "수상레포츠(요트+물총보트)"
// use "+" inside parentheses as a detail list — only split on top-level "+".
function splitByPlus(value: string | undefined): string[] {
  if (!value) return [];
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(" || ch === "（") depth++;
    else if (ch === ")" || ch === "）") depth = Math.max(0, depth - 1);
    if (ch === "+" && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function slugify(name: string, index: number): string {
  return `village-${index}-${name.replace(/[^0-9A-Za-z가-힣]/g, "").slice(0, 24)}`;
}

export function mapRecordsToVillages(records: z.infer<typeof rawRecordSchema>[]): VillageRecord[] {
  const villages: VillageRecord[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    const latitude = parseFloat(record["위도"] ?? "");
    const longitude = parseFloat(record["경도"] ?? "");
    if (!Number.isFinite(latitude) || latitude < 33 || latitude > 39) continue;
    if (!Number.isFinite(longitude) || longitude < 124 || longitude > 133) continue;
    const address = record["소재지도로명주소"] || record["소재지지번주소"] || "";
    if (!address) continue;

    const name = record["체험마을명"].trim();
    if (seen.has(name)) continue;
    seen.add(name);

    const providerOrg = record["제공기관명"] ?? record["관리기관명"] ?? "";
    // "한국농어촌공사" contains the substring 어촌, so match on the fishing-corporation
    // name or the village's own 어촌 designation instead.
    const villageKind: "farm" | "fishing" = providerOrg.includes("어촌어항") || name.includes("어촌") ? "fishing" : "farm";

    const classes = splitByPlus(record["체험프로그램구분"]);
    const names = splitByPlus(record["체험프로그램명"]);
    const programs: VillageProgram[] = [];
    if (classes.length > 0 || names.length > 0) {
      const max = Math.max(classes.length, names.length);
      for (let i = 0; i < max; i++) {
        programs.push({
          program_class: classes[i] ?? classes[classes.length - 1] ?? "기타체험",
          program_name: names[i] ?? names[names.length - 1] ?? "체험 프로그램",
        });
      }
    }

    villages.push({
      village_id: slugify(name, villages.length),
      name,
      sido: record["시도명"] ?? null,
      sigungu: record["시군구명"] ?? null,
      village_kind: villageKind,
      address_road: record["소재지도로명주소"] || null,
      address_jibun: record["소재지지번주소"] || null,
      phone: record["대표전화번호"]?.trim() || null,
      homepage: record["홈페이지주소"]?.trim() || null,
      designated_at: record["지정일자"] ?? null,
      facility_info: record["보유시설정보"] ?? null,
      photo_url: record["체험휴양마을사진"] ?? null,
      latitude,
      longitude,
      provider_org: record["제공기관명"] ?? record["관리기관명"] ?? null,
      data_reference_date: record["데이터기준일자"] ?? null,
      programs,
    });
  }
  return villages;
}

export class VillageProvider {
  async loadFromJsonFile(path: string): Promise<{ villages: VillageRecord[]; rawCount: number; skipped: number }> {
    const content = await readFile(path, "utf8");
    const parsed = standardDataSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      throw new Error(`Village standard-data JSON failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown"}`);
    }
    const villages = mapRecordsToVillages(parsed.data.records);
    return { villages, rawCount: parsed.data.records.length, skipped: parsed.data.records.length - villages.length };
  }

  get catalogUrl(): string {
    return OFFICIAL_CATALOG_URL;
  }
}
