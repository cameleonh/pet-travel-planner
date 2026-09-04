import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { AuxiliaryPlace } from "@/data/contracts";

// 경기 데이터드림(data.gg.go.kr) 반려동물 시설 — 2026-09-04 다운로드 원본(자료/)을
// AuxiliaryPlace(park/veterinary)로 변환. 동물약국·미용·위탁관리는 현재
// auxiliary 카테고리 라벨(동물병원/공원/...)과 맞지 않아 v1에서 제외.
const PARK_SOURCE_URL = "https://data.gg.go.kr/portal/data/service/selectServicePage.do?infId=ZOHUVMLWBLPU4VFVI2QA32311465&infSeq=3";
const VET_SOURCE_URL = "https://data.gg.go.kr/portal/data/service/selectServicePage.do?infId=69D0HTUDZL4743JTTWMM32308298&infSeq=3";
const PORTAL_FALLBACK_OBSERVED_AT = "2022-12-29T00:00:00.000Z"; // 포털 최종수정일자(시설 3종 공통)

export const parkRecordSchema = z.object({
  park_nm: z.string().min(1),
  signgu_nm: z.string().optional(),
  roadnm_addr: z.string().optional(),
  lotno_addr: z.string().optional(),
  opr_inst_nm: z.string().optional(),
  rprs_telno: z.string().optional(),
  refine_wgs84_lat: z.string().optional(),
  refine_wgs84_logt: z.string().optional(),
});

export const vetRecordSchema = z.object({
  indutype_nm: z.string().min(1),
  cmpnm_nm: z.string().min(1),
  locplc_roadnm_addr: z.string().optional(),
  locplc_lotno_addr: z.string().optional(),
  refine_wgs84_lat: z.string().optional(),
  refine_wgs84_logt: z.string().optional(),
  dat_crtr_ymd: z.string().optional(),
});

export function extractPortalRows(value: unknown): unknown[] {
  const findRows = (node: unknown): unknown[] => {
    if (Array.isArray(node)) return node;
    if (node && typeof node === "object") {
      for (const child of Object.values(node as Record<string, unknown>)) {
        const rows = findRows(child);
        if (rows.length > 0 && typeof rows[0] === "object") return rows;
      }
    }
    return [];
  };
  return findRows(value);
}

function toCoordinate(raw: string | undefined): number {
  const trimmed = (raw ?? "").trim();
  return trimmed.length === 0 ? Number.NaN : Number(trimmed);
}

function toIsoDate(raw: string | undefined, fallback: string): string {
  const trimmed = (raw ?? "").trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}T00:00:00.000Z`;
  }
  return fallback;
}

function buildId(kind: "park" | "vet", name: string, address: string): string {
  const digest = createHash("sha256").update(`${name}|${address}`).digest("hex").slice(0, 10);
  return `gg-pet:${kind}-${digest}`;
}

function firstAddress(...candidates: Array<string | undefined>): string {
  const found = candidates.map((value) => (value ?? "").trim()).find((value) => value.length > 0);
  return found ?? "";
}

export type GyeonggiPetFacilityStats = {
  parkRaw: number;
  vetRaw: number;
  parkSaved: number;
  vetSaved: number;
  skippedInvalid: number;
  skippedNonVet: number;
  duplicates: number;
};

export type GyeonggiPetFacilityResult = {
  places: AuxiliaryPlace[];
  stats: GyeonggiPetFacilityStats;
};

export function mapGyeonggiRows(parkRows: Array<z.infer<typeof parkRecordSchema>>, vetRows: Array<z.infer<typeof vetRecordSchema>>): GyeonggiPetFacilityResult {
  const places: AuxiliaryPlace[] = [];
  const seenIds = new Set<string>();
  const stats: GyeonggiPetFacilityStats = { parkRaw: parkRows.length, vetRaw: vetRows.length, parkSaved: 0, vetSaved: 0, skippedInvalid: 0, skippedNonVet: 0, duplicates: 0 };

  const push = (kind: "park" | "vet", name: string, address: string, latitude: number, longitude: number, observedAt: string, sourceUrl: string, sourceText: string) => {
    const id = buildId(kind, name, address);
    if (seenIds.has(id)) {
      stats.duplicates += 1;
      return;
    }
    if (!address || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      stats.skippedInvalid += 1;
      return;
    }
    seenIds.add(id);
    places.push({
      id,
      name,
      category: kind === "park" ? "park" : "veterinary",
      address,
      coordinates: { latitude, longitude },
      petStatus: "confirmed",
      evidence: { label: "경기데이터드림 반려동물 시설", sourceText, sourceUrl, observedAt },
    });
    stats[kind === "park" ? "parkSaved" : "vetSaved"] += 1;
  };

  for (const row of parkRows) {
    const name = row.park_nm.trim();
    push(
      "park",
      name,
      firstAddress(row.roadnm_addr, row.lotno_addr),
      toCoordinate(row.refine_wgs84_lat),
      toCoordinate(row.refine_wgs84_logt),
      PORTAL_FALLBACK_OBSERVED_AT,
      PARK_SOURCE_URL,
      `경기도 반려동물 놀이시설 구비 공원 (${row.signgu_nm ?? "경기도"}${row.opr_inst_nm ? ` � ${row.opr_inst_nm.trim()}` : ""})`,
    );
  }

  for (const row of vetRows) {
    if (row.indutype_nm.trim() !== "동물병원") {
      stats.skippedNonVet += 1;
      continue;
    }
    const name = row.cmpnm_nm.trim();
    push(
      "vet",
      name,
      firstAddress(row.locplc_roadnm_addr, row.locplc_lotno_addr),
      toCoordinate(row.refine_wgs84_lat),
      toCoordinate(row.refine_wgs84_logt),
      toIsoDate(row.dat_crtr_ymd, PORTAL_FALLBACK_OBSERVED_AT),
      VET_SOURCE_URL,
      "경기도 반려동물 의료 및 복지시설(동물병원)",
    );
  }

  return { places, stats };
}

export class GyeonggiPetFacilityProvider {
  async loadFromJsonFiles(parkPath: string, vetPath: string): Promise<GyeonggiPetFacilityResult> {
    const parkRows = parkRecordSchema.array().parse(extractPortalRows(JSON.parse(await readFile(parkPath, "utf8"))));
    const vetRows = vetRecordSchema.array().parse(extractPortalRows(JSON.parse(await readFile(vetPath, "utf8"))));
    return mapGyeonggiRows(parkRows, vetRows);
  }
}
