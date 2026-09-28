export type NightSpotTag = "view" | "ride" | "walk" | "stay";

export type NightSpot = {
  placeId: string;
  tag: NightSpotTag;
};

// Night-view curation seed (51 spots, owner-approved 2026-09-04). Candidates came
// from a keyword scan of the KTO pet-travel catalog (전망/타워/스카이/케이블카/
// 한강/해안/등대/해맞이 — "나이트" is unusable: brand noise like 나이키 유나이트 /
// 쌤소나이트). 35 daytime-only nature spots (계곡/폭포/습지) were excluded and
// entries were hand-reviewed. Regenerate comparisons against the live catalog:
// ids are stable "tour-api:<contentId>" keys.
export const NIGHT_SPOTS: readonly NightSpot[] = [
  { placeId: "tour-api:1037031", tag: "view" }, // [북악하늘길 스카이웨이] 하늘한마당~하늘마루
  { placeId: "tour-api:2706354", tag: "view" }, // 강릉 안목해맞이공원
  { placeId: "tour-api:128171", tag: "view" }, // 고성 통일전망타워
  { placeId: "tour-api:126125", tag: "view" }, // 낙동강 경천대(경천대 전망대)
  { placeId: "tour-api:2755474", tag: "view" }, // 난정리 전망대
  { placeId: "tour-api:1223212", tag: "view" }, // 동해 논골담길(등대 담화마을)
  { placeId: "tour-api:2003909", tag: "view" }, // 롯데월드타워&롯데월드몰
  { placeId: "tour-api:2519536", tag: "view" }, // 만천하 스카이워크
  { placeId: "tour-api:2671791", tag: "view" }, // 말티재 전망대(말티고개)
  { placeId: "tour-api:129176", tag: "view" }, // 묵호등대
  { placeId: "tour-api:2639965", tag: "view" }, // 물미해안전망대
  { placeId: "tour-api:2782901", tag: "view" }, // 백섬해상전망대
  { placeId: "tour-api:1842210", tag: "view" }, // 병방치 스카이워크
  { placeId: "tour-api:126943", tag: "view" }, // 북악스카이 팔각정
  { placeId: "tour-api:128571", tag: "view" }, // 설악해맞이공원
  { placeId: "tour-api:128804", tag: "view" }, // 속초 엑스포타워
  { placeId: "tour-api:128803", tag: "view" }, // 속초등대전망대
  { placeId: "tour-api:1083960", tag: "view" }, // 식장산 문화공원(해돋이전망대)
  { placeId: "tour-api:2675429", tag: "view" }, // 아라마루 전망대
  { placeId: "tour-api:127710", tag: "view" }, // 영덕해맞이공원
  { placeId: "tour-api:252567", tag: "view" }, // 죽도정·죽도 전망대
  { placeId: "tour-api:2998006", tag: "view" }, // 평창군 스카이 타워 체험시설
  { placeId: "tour-api:2612863", tag: "view" }, // 하멜등대
  { placeId: "tour-api:127131", tag: "view" }, // 호미곶 해맞이광장
  { placeId: "tour-api:2755042", tag: "ride" }, // 무등산 리프트모노레일
  { placeId: "tour-api:2504464", tag: "ride" }, // 부산 송도해상케이블카
  { placeId: "tour-api:2366916", tag: "ride" }, // 앞산 케이블카(앞산 전망대)
  { placeId: "tour-api:1997202", tag: "ride" }, // 여수 해상케이블카
  { placeId: "tour-api:126701", tag: "ride" }, // 이랜드크루즈(한강유람선)
  { placeId: "tour-api:2774820", tag: "ride" }, // 지세포 관광유람선
  { placeId: "tour-api:2606296", tag: "ride" }, // 청풍호반케이블카
  { placeId: "tour-api:533874", tag: "ride" }, // 통영케이블카
  { placeId: "tour-api:1626349", tag: "ride" }, // 팔공산 케이블카
  { placeId: "tour-api:228874", tag: "walk" }, // 구리한강시민공원(코스모스공원)
  { placeId: "tour-api:2570207", tag: "walk" }, // 능파대 (강원평화지역 국가지질공원)
  { placeId: "tour-api:2652545", tag: "walk" }, // 닭머르해안길
  { placeId: "tour-api:2720434", tag: "walk" }, // 덕봉산 해안생태탐방로
  { placeId: "tour-api:2714545", tag: "walk" }, // 등대해수욕장
  { placeId: "tour-api:127570", tag: "walk" }, // 송지호해안 서낭바위 (강원평화지역 국가지질공원)
  { placeId: "tour-api:1059479", tag: "walk" }, // 여의도한강공원
  { placeId: "tour-api:2610230", tag: "walk" }, // 울진 해안도로
  { placeId: "tour-api:2610236", tag: "walk" }, // 이사부길(새천년해안도로)
  { placeId: "tour-api:970636", tag: "walk" }, // 이촌한강공원
  { placeId: "tour-api:252561", tag: "walk" }, // 절영해안산책로
  { placeId: "tour-api:2606232", tag: "walk" }, // 호미반도 해안둘레길
  { placeId: "tour-api:3532633", tag: "stay" }, // 리틀포레한강
  { placeId: "tour-api:3044585", tag: "stay" }, // 바다내음펜션
  { placeId: "tour-api:2572858", tag: "stay" }, // 바다정원펜션
  { placeId: "tour-api:2700223", tag: "stay" }, // 블루오션펜션
  { placeId: "tour-api:2757967", tag: "stay" }, // 스카이 펜션&캠핑장
  { placeId: "tour-api:3532762", tag: "stay" }, // 전망대펜션
];

export const NIGHT_SPOT_PLACE_IDS: ReadonlySet<string> = new Set(NIGHT_SPOTS.map((spot) => spot.placeId));

// The curated seed above stays as an owner-approved floor, but the catalog
// keeps growing: any place whose name is a night-view landmark joins the set.
// Bare "타워" is excluded on purpose — it matches shops such as "올리브영
// 타워팰리스점", so only explicit tower names are kept.
const NIGHT_SPOT_NAME_PATTERN = /전망대|전망타워|스카이|엑스포타워|월드타워|서울타워|등대|케이블카|모노레일|리프트|유람선|크루즈|한강|해맞이|해돋이|해넘이|노을|야경|야간|일몰|일출|해수욕장|해변|야시장|둘레길|산책로|해안/;

export function isNightSpot(place: { id: string; name: string }): boolean {
  return NIGHT_SPOT_PLACE_IDS.has(place.id) || NIGHT_SPOT_NAME_PATTERN.test(place.name);
}
