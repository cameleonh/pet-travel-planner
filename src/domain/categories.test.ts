import { describe, expect, it } from "vitest";
import { resolveDisplayCategory } from "@/domain/categories";

describe("display category resolution", () => {
  it.each([
    ["해운대 해수욕장", "attraction", "beach"],
    ["설악산", "attraction", "mountain"],
    ["서울숲 공원", "attraction", "park"],
    ["아침고요수목원", "attraction", "nature"],
    ["국립박물관", "attraction", "culture"],
    ["일반 관광지", "attraction", "place"],
    ["공항 면세점", "shopping", "dutyfree"],
    ["프리미엄 아울렛", "shopping", "outlet"],
    ["중앙 백화점", "shopping", "department"],
    ["속초중앙시장", "shopping", "market"],
    ["반려용품점", "shopping", "shopping"],
    ["맛있는 식당", "restaurant", "restaurant"],
    ["카페 플랜비", "restaurant", "cafe"],
    ["커피하우스 그린", "restaurant", "cafe"],
    ["멍멍 카페", "cafe", "cafe"],
    ["바다 호텔", "accommodation", "accommodation"],
    ["기타", "unknown", "place"],
  ] as const)("maps %s (%s) to %s", (name, category, expected) => {
    expect(resolveDisplayCategory({ name, category })).toBe(expected);
  });
});
