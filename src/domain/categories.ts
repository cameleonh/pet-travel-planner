import type { RawPlace } from "@/data/contracts";

export type DisplayCategory =
  | "park" | "beach" | "mountain" | "nature" | "culture"
  | "market" | "outlet" | "department" | "dutyfree"
  | "restaurant" | "cafe" | "accommodation" | "shopping"
  | "camping" | "veterinary" | "petShop" | "petCafe"
  | "place";

export const displayCategoryLabel: Record<DisplayCategory, string> = {
  park: "공원",
  beach: "해변",
  mountain: "산/등산",
  nature: "자연",
  culture: "문화/사찰",
  market: "시장",
  outlet: "아울렛",
  department: "백화점",
  dutyfree: "면세점",
  restaurant: "식당",
  cafe: "카페",
  accommodation: "숙소",
  shopping: "쇼핑",
  camping: "캠핑",
  veterinary: "동물병원",
  petShop: "펫샵",
  petCafe: "펫카페",
  place: "기타",
};

export const displayCategoryIcon: Record<DisplayCategory, string> = {
  park: "🌳",
  beach: "🏖️",
  mountain: "⛰️",
  nature: "🌿",
  culture: "🏛️",
  market: "🏪",
  outlet: "🛍️",
  department: "🏬",
  dutyfree: "💼",
  restaurant: "🍽️",
  cafe: "☕",
  accommodation: "🏨",
  shopping: "🛒",
  camping: "⛺",
  veterinary: "🏥",
  petShop: "🐾",
  petCafe: "🐶",
  place: "📍",
};

export function resolveDisplayCategory(place: { name: string; category: string }): DisplayCategory {
  const n = place.name;
  switch (place.category) {
    case "attraction":
      if (/해변|해수욕장|해안|비치/i.test(n)) return "beach";
      if (/산|봉$|능선|등산|암|봉우리/i.test(n)) return "mountain";
      if (/공원|파크/i.test(n)) return "park";
      if (/정원|수목원|식물원|계곡|폭포|약수|호수|늪|섬|도/i.test(n)) return "nature";
      if (/박물관|미술관|전시|사찰|절|궁|탑|문화/i.test(n)) return "culture";
      return "place";
    case "shopping":
      if (/면세/i.test(n)) return "dutyfree";
      if (/아울렛|프리미엄/i.test(n)) return "outlet";
      if (/백화점/i.test(n)) return "department";
      if (/시장|5일장|장$/i.test(n)) return "market";
      return "shopping";
    case "restaurant":
      return "restaurant";
    case "cafe":
      return "cafe";
    case "accommodation":
      return "accommodation";
    default:
      return "place";
  }
}
