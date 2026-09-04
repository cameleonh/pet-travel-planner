import type { ConditionKey } from "@/domain/types";

export interface PetProfile {
  name: string;
  avatar: string;
  photo?: string;
  breed: string;
  weight: string;
  size: ConditionKey | null;
  dangerousDog: boolean;
  notes?: string;
}

const STORAGE_KEY = "pet_travel_profile_v1";

export const DEFAULT_AVATARS = ["🐶", "🐩", "🐕", "🐾", "🦴", "🤎", "🤍", "🖤"];

// 동물보호법 제2조제5호가목 → 시행규칙 제2조(맹견의 범위) — 법령 표기 그대로:
// 도사견 / 핏불테리어(아메리칸 핏불테리어 포함) / 아메리칸 스태퍼드셔 테리어 /
// 스태퍼드셔 불 테리어 / 로트와일러 (각 "그 잡종의 개" 포함).
export const DANGEROUS_BREEDS = [
  "도사견",
  "핏불테리어",
  "아메리칸 스태퍼드셔 테리어",
  "스태퍼드셔 불 테리어",
  "로트와일러",
] as const;

export type BreedGroup = {
  group: string;
  breeds: readonly string[];
};

export const DOG_BREED_GROUPS: readonly BreedGroup[] = [
  {
    group: "소형견",
    breeds: [
      "말티즈", "푸들", "요크셔테리어", "치와와", "시추", "포메라니안", "비숑프리제",
      "닥스훈트", "미니어처 슈나우저", "파피용", "페키니즈", "퍼그", "몰티푸",
      "이탈리안 그레이하운드", "프렌치 불독", "미니핀",
    ],
  },
  {
    group: "중형견",
    breeds: [
      "웰시코기", "비글", "스피츠", "시바견", "보더콜리", "코카스파니엘", "보스턴테리어",
      "휘펫", "스태퍼드셔 불 테리어", "진돗개", "삽살개",
    ],
  },
  {
    group: "대형견",
    breeds: [
      "골든리트리버", "래브라도리트리버", "저먼셰퍼드", "사모예드", "시베리안 허스키",
      "알래스칸 말라뮤트", "도베르만", "로트와일러", "그레이트데인", "아키타견", "풍산개",
      "핏불테리어(아메리칸 포함)", "아메리칸 스태퍼드셔 테리어", "도사견",
    ],
  },
  {
    group: "믹스·기타",
    breeds: ["믹스견 (소형)", "믹스견 (중형)", "믹스견 (대형)"],
  },
];

export const DOG_BREED_LIST: readonly string[] = DOG_BREED_GROUPS.flatMap((g) => g.breeds);

function normalizeBreed(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

// A breed counts as legally dangerous when a designated breed name appears in
// what the user selected/typed, so mixes and spacing variants also match.
// "토사견" is kept as a non-statutory alias because many owners type it that way.
export function isDangerousBreed(breed: string): boolean {
  const normalized = normalizeBreed(breed);
  if (!normalized) return false;
  if (normalized.includes("토사견")) return true;
  return DANGEROUS_BREEDS.some((dangerous) => normalized.includes(normalizeBreed(dangerous)));
}

export function getSavedPetProfile(): PetProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PetProfile;
  } catch {
    return null;
  }
}

export function savePetProfile(profile: PetProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function clearSavedPetProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
