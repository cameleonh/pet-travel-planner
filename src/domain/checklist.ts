import type { PlanPlace } from "@/domain/plan";

export interface ChecklistItem {
  id: string;
  category: "essential" | "indoor" | "outdoor" | "water" | "comfort";
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  recommendedReasonKo?: string;
  recommendedReasonEn?: string;
}

export function generateSmartChecklist(places: PlanPlace[]): ChecklistItem[] {
  const items: ChecklistItem[] = [
    {
      id: "leash",
      category: "essential",
      titleKo: "기본 리드줄 (1.5m~2m)",
      titleEn: "Standard Leash (1.5m~2m)",
      descKo: "외출 시 동물보호법 준수 및 안전을 위한 필수 착용",
      descEn: "Mandatory for pet safety and legal compliance",
    },
    {
      id: "waste-bag",
      category: "essential",
      titleKo: "배변봉투 & 물티슈",
      titleEn: "Waste Bags & Pet Wet Wipes",
      descKo: "깨끗한 펫티켓을 위한 필수품 (휴대용 소독제 추천)",
      descEn: "Essential for petiquette and keeping venues clean",
    },
    {
      id: "water-bottle",
      category: "essential",
      titleKo: "휴대용 물병 & 접이식 식기",
      titleEn: "Portable Water Bottle & Foldable Bowl",
      descKo: "드라이브 및 야외 산책 시 수분 보충",
      descEn: "Stay hydrated during walks and car drives",
    },
    {
      id: "id-tag",
      category: "essential",
      titleKo: "인식표 및 동물등록번호",
      titleEn: "ID Tag & Registration Info",
      descKo: "목줄 부착 인식표 또는 외장칩 필수 소지",
      descEn: "Must wear name tag or registration chip",
    },
  ];

  const hasIndoor = places.some(
    (p) => p.category === "cafe" || p.category === "shopping" || p.category === "restaurant"
  );
  if (hasIndoor) {
    items.push({
      id: "manner-belt",
      category: "indoor",
      titleKo: "매너벨트 & 기저귀",
      titleEn: "Manner Belt & Diaper",
      descKo: "실내 카페/식당 이용 시 마킹 방지 필수템",
      descEn: "Required for marking prevention in indoor cafes",
      recommendedReasonKo: "방문 예정 장소에 실내 동반 시설이 포함되어 있어요!",
      recommendedReasonEn: "Indoor friendly venue included in your itinerary",
    });
    items.push({
      id: "carrier-bag",
      category: "indoor",
      titleKo: "이동가방 (슬링백 또는 개모차)",
      titleEn: "Pet Carrier / Sling Bag / Stroller",
      descKo: "실내 이동 및 대기 시 안전한 안식처 제공",
      descEn: "Safe cozy space when moving indoors",
      recommendedReasonKo: "실내 쇼핑몰/복합문화공간 동반 시 유용해요",
      recommendedReasonEn: "Useful for indoor mall/venue visits",
    });
  }

  const hasNature = places.some(
    (p) => p.category === "attraction" || p.category === "accommodation"
  );
  if (hasNature) {
    items.push({
      id: "tick-spray",
      category: "outdoor",
      titleKo: "해충/진드기 기피제",
      titleEn: "Tick & Mosquito Repellent",
      descKo: "풀밭 및 산책로 진드기 예방 필수",
      descEn: "Protect your pet from ticks in grass trails",
      recommendedReasonKo: "자연 명소 및 산책 코스가 포함되어 있어요!",
      recommendedReasonEn: "Nature trail included in your trip",
    });
    items.push({
      id: "mat-cushion",
      category: "comfort",
      titleKo: "휴대용 방석 또는 카시트",
      titleEn: "Portable Mat Cushion / Car Seat",
      descKo: "차량 이동 및 카페 좌석에서 편안한 휴식",
      descEn: "Comfortable resting in cars and cafe seats",
    });
  }

  const hasBeachOrWater = places.some(
    (p) =>
      /해변|해수욕장|바다|계곡|워터|수영/i.test(p.name) ||
      /해변|해수욕장|바다|계곡/i.test(p.address)
  );
  if (hasBeachOrWater) {
    items.push({
      id: "towel-lifejacket",
      category: "water",
      titleKo: "댕댕이 흡수 타월 & 구명조끼",
      titleEn: "Quick-Dry Towel & Life Jacket",
      descKo: "바다/계곡 물놀이 후 빠른 체온 유지 및 안전",
      descEn: "Safety in water and quick drying afterwards",
      recommendedReasonKo: "물놀이나 바닷가 코스가 포함되어 있어요!",
      recommendedReasonEn: "Beach or water spot included",
    });
  }

  return items;
}
