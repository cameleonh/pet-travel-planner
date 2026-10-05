export type RuralStayTag = "pension" | "hanok" | "guesthouse" | "farmstay";

export type RuralStay = {
  placeId: string;
  tag: RuralStayTag;
};

// Pet-friendly rural stays curated from the KTO PetTour catalog (37 spots).
// All are accommodation-category places whose names match pension/farmstay/
// hanok/guesthouse patterns — every one carries a verified pet policy.
export const RURAL_STAYS: readonly RuralStay[] = [
  { placeId: "tour-api:138900", tag: "hanok" }, // 한채당 한옥체험관
  { placeId: "tour-api:139183", tag: "pension" }, // 보노펜션
  { placeId: "tour-api:2544734", tag: "pension" }, // 레젤프펜션
  { placeId: "tour-api:2569003", tag: "guesthouse" }, // 유원게스트하우스
  { placeId: "tour-api:2570099", tag: "hanok" }, // 서남산한옥
  { placeId: "tour-api:2570728", tag: "guesthouse" }, // 북촌 게스트하우스
  { placeId: "tour-api:2571935", tag: "guesthouse" }, // 주식회사 더 오래뜰
  { placeId: "tour-api:2572858", tag: "hanok" }, // 온새미한옥
  { placeId: "tour-api:2575180", tag: "hanok" }, // 사월 한옥
  { placeId: "tour-api:2575836", tag: "pension" }, // 관광 꿈꾸는숲 펜션
  { placeId: "tour-api:2621735", tag: "pension" }, // 아르노펜션
  { placeId: "tour-api:2622230", tag: "hanok" }, // 한옥에서 하루를
  { placeId: "tour-api:2626972", tag: "pension" }, // 바다정원펜션
  { placeId: "tour-api:2628004", tag: "hanok" }, // 구례 문 한옥 게스트하우스
  { placeId: "tour-api:2671726", tag: "pension" }, // 헤이리풀빌라 워라벨
  { placeId: "tour-api:2692190", tag: "pension" }, // 해오름관광펜션
  { placeId: "tour-api:2697881", tag: "pension" }, // 잔원유림 풀빌라
  { placeId: "tour-api:2699322", tag: "hanok" }, // 콩쥐팥쥐 관광 한옥리조트
  { placeId: "tour-api:2700223", tag: "pension" }, // 바다내음펜션
  { placeId: "tour-api:2701396", tag: "pension" }, // 양지 뜰 펜션
  { placeId: "tour-api:3044585", tag: "pension" }, // 글림풀빌라
  { placeId: "tour-api:3101944", tag: "pension" }, // 신영펜션
  { placeId: "tour-api:3102067", tag: "pension" }, // 더 포레 관광펜션
  { placeId: "tour-api:3102079", tag: "pension" }, // 단양추억펜션
  { placeId: "tour-api:3438431", tag: "pension" }, // 블루오션펜션
  { placeId: "tour-api:3438560", tag: "hanok" }, // 옥희와인 게스트하우스
  { placeId: "tour-api:3438591", tag: "pension" }, // 에스지빌라앤호텔
  { placeId: "tour-api:3532570", tag: "pension" }, // 마운틴밸리 펜션
  { placeId: "tour-api:3532762", tag: "pension" }, // 루이하우스
  { placeId: "tour-api:3533003", tag: "guesthouse" }, // 게스트하우스 플레이앳홈
  { placeId: "tour-api:3533005", tag: "pension" }, // 자연담은
  { placeId: "tour-api:3533121", tag: "guesthouse" }, // 도그밀리
  { placeId: "tour-api:3533166", tag: "pension" }, // 메리도그하우스
  { placeId: "tour-api:3539443", tag: "pension" }, // 전망대펜션
  { placeId: "tour-api:3544316", tag: "pension" }, // 도그밀리 2
  { placeId: "tour-api:563186", tag: "pension" }, // 아르노펜션 2
  { placeId: "tour-api:979536", tag: "pension" }, // 관광펜션
];

export const RURAL_STAY_PLACE_IDS: ReadonlySet<string> = new Set(RURAL_STAYS.map((s) => s.placeId));
