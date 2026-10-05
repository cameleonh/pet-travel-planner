import { describe, expect, it } from "vitest";
import { auxiliaryPlaceSchema } from "@/data/contracts";
import { mapGyeonggiRows, parkRecordSchema, vetRecordSchema } from "@/data/providers/gg-pet-provider";

function parkRecord(overrides: Record<string, string> = {}) {
  return parkRecordSchema.parse({
    park_nm: "수진동 탄천 반려견 놀이공간",
    signgu_nm: "성남시 수정구",
    roadnm_addr: " 경기 성남시 수정구 수진동 4690-1",
    lotno_addr: "경기 성남시 수정구 수진동 4690-1",
    opr_inst_nm: "성남시청",
    rprs_telno: "031-729-4343",
    refine_wgs84_lat: "37.4369100968",
    refine_wgs84_logt: "127.1196602121",
    ...overrides,
  });
}

function vetRecord(overrides: Record<string, string> = {}) {
  return vetRecordSchema.parse({
    indutype_nm: "동물병원",
    cmpnm_nm: "태양동물병원",
    locplc_roadnm_addr: "경기도 하남시 신장로 126 (신장동)",
    locplc_lotno_addr: "경기도 하남시 신장동 512-1번지",
    refine_wgs84_lat: "37.5399",
    refine_wgs84_logt: "127.2156",
    dat_crtr_ymd: "20221120",
    ...overrides,
  });
}

describe("GyeonggiPetFacilityProvider", () => {
  it("maps a park record into a confirmed park auxiliary place", () => {
    const { places, stats } = mapGyeonggiRows([parkRecord()], []);
    expect(stats.parkSaved).toBe(1);
    const park = places[0]!;
    expect(park.category).toBe("park");
    expect(park.petStatus).toBe("confirmed");
    expect(park.address).toBe("경기 성남시 수정구 수진동 4690-1");
    expect(park.evidence.sourceUrl).toContain("data.gg.go.kr");
    expect(() => auxiliaryPlaceSchema.parse(park)).not.toThrow();
  });

  it("maps 동물병원 rows and converts dat_crtr_ymd to ISO observedAt", () => {
    const { places, stats } = mapGyeonggiRows([], [vetRecord()]);
    expect(stats.vetSaved).toBe(1);
    const vet = places[0]!;
    expect(vet.category).toBe("veterinary");
    expect(vet.evidence.observedAt).toBe("2022-11-20T00:00:00.000Z");
  });

  it("excludes non-hospital medical rows (동물약국) and non-medical rows", () => {
    const { stats, places } = mapGyeonggiRows([], [vetRecord({ indutype_nm: "동물약국", cmpnm_nm: "태양약국" }), vetRecord({ indutype_nm: "동물장묘업" })]);
    expect(stats.skippedNonVet).toBe(2);
    expect(places).toHaveLength(0);
  });

  it("skips rows without coordinates or address and counts duplicates by name+address", () => {
    const { stats } = mapGyeonggiRows(
      [parkRecord({ refine_wgs84_lat: "", refine_wgs84_logt: "" })],
      [vetRecord(), vetRecord({ locplc_roadnm_addr: "다른 주소", locplc_lotno_addr: "다른 주소" }), vetRecord()],
    );
    expect(stats.skippedInvalid).toBe(1);
    expect(stats.vetSaved).toBe(2);
    expect(stats.duplicates).toBe(1);
  });

  it("produces stable ids for identical records", () => {
    const first = mapGyeonggiRows([], [vetRecord()]).places[0]!;
    const second = mapGyeonggiRows([], [vetRecord()]).places[0]!;
    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^gg-pet:vet-[0-9a-f]{10}$/);
  });

  it("maps vet contact details: first phone of multiple, hours, closing day, detail address", () => {
    const { places, stats } = mapGyeonggiRows([], [vetRecord({
      rprs_telno_info: "031-792-5277 / 010-1234-5678",
      opr_hr_info: "09:00~18:00",
      sat_opr_hr: "09:00~14:00",
      sun_opr_hr: "",
      restday_info: "매주 일요일",
      detail_addr: "2,3층 201호",
    })]);
    expect(stats.vetSaved).toBe(1);
    const vet = places[0]!;
    expect(vet.phone).toBe("031-792-5277");
    expect(vet.weekdayHours).toBe("09:00~18:00");
    expect(vet.saturdayHours).toBe("09:00~14:00");
    expect(vet.sundayHours).toBeUndefined();
    expect(vet.closingDay).toBe("매주 일요일");
    expect(vet.address).toContain("(2,3층 201호)");
    expect(() => auxiliaryPlaceSchema.parse(vet)).not.toThrow();
  });

  it("maps park fee and rejects non-numeric phone strings", () => {
    const { places } = mapGyeonggiRows([parkRecord({ utlz_chrg: "무료", rprs_telno: "운영기관 문의" })], []);
    const park = places[0]!;
    expect(park.usageFee).toBe("무료");
    expect(park.phone).toBeUndefined();
    expect(park.weekdayHours).toBeUndefined();
  });

  it("omits phone when the vet record has none", () => {
    const { places } = mapGyeonggiRows([], [vetRecord({ rprs_telno_info: "" })]);
    expect(places[0]!.phone).toBeUndefined();
  });
});
