export type AccessibleSpot = {
  placeId: string;
  tag: "wheelchair" | "general";
};

// Barrier-free travel spots with verified accessibility data from the
// KTO Barrier-Free dataset. All 26 IDs verified against the live database.
export const ACCESSIBLE_SPOTS: readonly AccessibleSpot[] = [
  { placeId: "tour-api:125534", tag: "wheelchair" }, // 강화 전등사
  { placeId: "tour-api:126644", tag: "general" }, // 간현관광지
  { placeId: "tour-api:127291", tag: "wheelchair" }, // 강화 동막해변
  { placeId: "tour-api:127696", tag: "general" }, // 거창 수승대
  { placeId: "tour-api:127778", tag: "wheelchair" }, // 가천 다랭이마을
  { placeId: "tour-api:128022", tag: "general" }, // 간절곶
  { placeId: "tour-api:128199", tag: "general" }, // 강동몽돌해변
  { placeId: "tour-api:128677", tag: "general" }, // 감포항
  { placeId: "tour-api:129439", tag: "general" }, // 개화예술공원
  { placeId: "tour-api:1947118", tag: "general" }, // 강촌레일파크
  { placeId: "tour-api:2414791", tag: "general" }, // 강릉커피거리
  { placeId: "tour-api:2588752", tag: "general" }, // 강릉 월화거리
  { placeId: "tour-api:2612802", tag: "general" }, // 강화루지
  { placeId: "tour-api:2628994", tag: "general" }, // 강릉 명주동 거리
  { placeId: "tour-api:2705409", tag: "wheelchair" }, // 강아지숲
  { placeId: "tour-api:2706354", tag: "general" }, // 강릉 안목해맞이공원
  { placeId: "tour-api:2721544", tag: "general" }, // 강문솟대다리
  { placeId: "tour-api:2731193", tag: "general" }, // 강릉항
  { placeId: "tour-api:2755874", tag: "general" }, // 거창창포원
  { placeId: "tour-api:3018216", tag: "general" }, // 강천섬유원지
  { placeId: "tour-api:3536570", tag: "general" }, // 강릉 한우타운
  { placeId: "tour-api:3537206", tag: "general" }, // 강릉 중화짬뽕빵
  { placeId: "tour-api:3544073", tag: "general" }, // 강릉김군박군횟집
  { placeId: "tour-api:585522", tag: "general" }, // 강문해변
  { placeId: "tour-api:947611", tag: "general" }, // 개항장 거리
  { placeId: "tour-api:988459", tag: "general" }, // 강구항 대게거리
];

export const ACCESSIBLE_PLACE_IDS: ReadonlySet<string> = new Set(
  ACCESSIBLE_SPOTS.map((spot) => spot.placeId),
);
