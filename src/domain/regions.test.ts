import { describe, expect, it } from "vitest";
import { buildRegionOptions, getRegionSearchTerm } from "@/domain/regions";

describe("region options", () => {
  it("groups address aliases and exposes only administrative districts", () => {
    const options = buildRegionOptions([
      { address: "경기도 파주시 문산로 1" },
      { address: "경기도 고양시 중앙로 2" },
      { address: "경기 파주시 평화로 3" },
      { address: "세종특별자치시 한누리대로 10" },
      { address: "세종특별자치시 조치원읍 길 4" },
    ]);

    expect(options.find((option) => option.value === "경기")).toEqual({
      value: "경기",
      label: "경기도",
      districts: [
        { value: "경기 고양시", label: "고양시" },
        { value: "경기 파주시", label: "파주시" },
      ],
    });
    expect(options.find((option) => option.value === "세종")?.districts).toEqual([
      { value: "세종 조치원읍", label: "조치원읍" },
    ]);
  });

  it("normalizes long province names into searchable aliases", () => {
    expect(getRegionSearchTerm("경상북도")).toBe("경북");
    expect(getRegionSearchTerm("강원특별자치도")).toBe("강원");
  });
});
