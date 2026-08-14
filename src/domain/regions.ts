import type { RawPlace } from "@/data/contracts";

export type RegionOption = {
  value: string;
  label: string;
  districts: { value: string; label: string }[];
};

const REGION_PREFIXES: readonly [RegExp, string][] = [
  [/^서울/u, "서울"],
  [/^경기/u, "경기"],
  [/^인천/u, "인천"],
  [/^강원/u, "강원"],
  [/^충청북|^충북/u, "충북"],
  [/^충청남|^충남/u, "충남"],
  [/^대전/u, "대전"],
  [/^세종/u, "세종"],
  [/^전북/u, "전북"],
  [/^전라북/u, "전북"],
  [/^전남광주/u, "전남광주"],
  [/^광주/u, "광주"],
  [/^전라남|^전남/u, "전남"],
  [/^경상북|^경북/u, "경북"],
  [/^대구/u, "대구"],
  [/^울산/u, "울산"],
  [/^부산/u, "부산"],
  [/^경상남|^경남/u, "경남"],
  [/^제주/u, "제주"],
];

const DISTRICT_SUFFIX = /(?:시|군|구|읍|면)$/u;
const collator = new Intl.Collator("ko-KR");

export function getRegionSearchTerm(area: string): string {
  return REGION_PREFIXES.find(([pattern]) => pattern.test(area))?.[1] ?? area;
}

export function buildRegionOptions(places: readonly Pick<RawPlace, "address">[]): RegionOption[] {
  const groups = new Map<string, { labels: Map<string, number>; districts: Set<string> }>();

  for (const place of places) {
    const [area = "", district = ""] = place.address.trim().split(/\s+/);
    if (!area) continue;
    const value = getRegionSearchTerm(area);
    const group = groups.get(value) ?? { labels: new Map<string, number>(), districts: new Set<string>() };
    group.labels.set(area, (group.labels.get(area) ?? 0) + 1);
    if (DISTRICT_SUFFIX.test(district)) group.districts.add(district);
    groups.set(value, group);
  }

  return [...groups.entries()]
    .map(([value, group]) => {
      const label = [...group.labels.entries()].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))[0]?.[0] ?? value;
      return {
        value,
        label,
        districts: [...group.districts]
          .sort(collator.compare)
          .map((district) => ({ value: `${value} ${district}`, label: district })),
      };
    })
    .sort((a, b) => collator.compare(a.label, b.label));
}
