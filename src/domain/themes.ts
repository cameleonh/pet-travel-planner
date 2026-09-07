import type { RawPlace } from '@/data/contracts';
import type { ConditionKey, PreparationFilterKey } from '@/domain/types';

export type ThemePresetId =
  | 'rainy-indoor'
  | 'large-dog-free'
  | 'healing-cafe'
  | 'camping-glamping'
  | 'ocean-water'
  | 'rural-stay'
  | 'night-view';

export interface ThemePreset {
  id: ThemePresetId;
  emoji: string;
  badge: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  petSize: ConditionKey | null;
  categories: RawPlace['category'][];
  prepFilters: PreparationFilterKey[];
  recommendedTags: string[];
  placeSet?: 'night-spots' | 'rural-stays';
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'rainy-indoor',
    emoji: '🌧️',
    badge: '날씨 맞춤',
    titleKo: '비 오는 날 안심 실내 코스',
    titleEn: 'Rainy Day Indoor Tour',
    descKo: '궂은 날씨에도 젖지 않고 편안하게 즐기는 실내 동반 카페 & 복합문화공간',
    descEn: 'Comfortable indoor cafes & cultural spaces safe from bad weather',
    petSize: null,
    categories: ['cafe', 'shopping', 'restaurant'],
    prepFilters: ['indoor'],
    recommendedTags: ['실내동반', '비오는날', '쾌적한카페', '복합몰'],
  },
  {
    id: 'large-dog-free',
    emoji: '🐕',
    badge: '견종 맞춤',
    titleKo: '대형견 눈치 안 보는 잔디밭 코스',
    titleEn: 'Large Dog Free Range Trail',
    descKo: '체중 제한 없이 마음껏 뛰노는 야외 공원, 자연 명소 & 넓은 야외 테라스',
    descEn: 'Spacious outdoor parks, nature spots & wide terraces welcoming big dogs',
    petSize: 'largeDog',
    categories: ['attraction', 'cafe'],
    prepFilters: ['outdoor'],
    recommendedTags: ['대형견환영', '넓은잔디밭', '야외공원', '자연산책'],
  },
  {
    id: 'healing-cafe',
    emoji: '☕',
    badge: '힐링 드라이브',
    titleKo: '감성 카페 & 브런치 힐링 투어',
    titleEn: 'Sensibility Cafe & Brunch Tour',
    descKo: '댕댕이와 함께 예쁜 사진도 찍고 맛있는 브런치를 즐기는 감성 나들이',
    descEn: 'Scenic pet-friendly brunch cafes & photo spots for relaxing outings',
    petSize: null,
    categories: ['cafe', 'restaurant'],
    prepFilters: ['leash'],
    recommendedTags: ['인스타감성', '브런치카페', '포토존', '댕댕이동반'],
  },
  {
    id: 'camping-glamping',
    emoji: '⛺',
    badge: '아웃도어',
    titleKo: '댕댕이와 함께 떠나는 캠핑 · 글램핑',
    titleEn: 'Pet Camping & Glamping',
    descKo: '불멍·물멍·별멍·숲멍 — 반려견과 자연 속에서 하룻밤, 자유로운 캠핑 스타일',
    descEn: 'Fire-gazing, stargazing, forest walks — pick your camping style with your pet',
    petSize: null,
    categories: ['accommodation', 'attraction'],
    prepFilters: ['outdoor'],
    recommendedTags: ['애견캠핑', '글램핑', '불멍', '물멍', '별멍', '숲멍'],
  },
  {
    id: 'ocean-water',
    emoji: '🌊',
    badge: '시원한 물놀이',
    titleKo: '탁 트인 오션뷰 & 바다 산책 코스',
    titleEn: 'Open Ocean View & Seaside Trail',
    descKo: '시원한 바닷바람 맞으며 해안도로 드라이브 & 반려견 동반 오션뷰 스팟',
    descEn: 'Refreshing coastal drives, sea breeze walks & ocean-view spots',
    petSize: null,
    categories: ['attraction', 'cafe'],
    prepFilters: ['leash'],
    recommendedTags: ['바다산책', '오션뷰', '해안도로', '물놀이'],
  },
  {
    id: 'rural-stay',
    emoji: '🌾',
    badge: '촌캉스 힐링',
    titleKo: '반려견 동반 펜션·한옥·민박 37곳',
    titleEn: 'Pet-Friendly Stays: Pensions, Hanok & Farmhouses',
    descKo: '강아지랑 같이 자러 가요 — 검증된 반려견 동반 펜션·한옥·게스트하우스 큐레이션',
    descEn: 'Verified pet-friendly pensions, hanok guesthouses and farm stays across Korea',
    petSize: null,
    categories: [],
    prepFilters: ['outdoor'],
    recommendedTags: ['촌캉스', '펜션', '한옥', '반려견동반숙박'],
    placeSet: 'rural-stays',
  },
  {
    id: 'night-view',
    emoji: '🌙',
    badge: '야경 데이트',
    titleKo: '댕댕이와 보는 야경',
    titleEn: 'Night Views with Your Dog',
    descKo: '해 질 녘 한강 산책부터 케이블카, 전망대, 등대까지 — 반려견과 함께 즐기는 밤 풍경 큐레이션',
    descEn: 'Sunset river walks, cable cars, observatories and lighthouses to enjoy after dark with your dog',
    petSize: null,
    categories: [],
    prepFilters: ['leash'],
    recommendedTags: ['야경데이트', '한강야간산책', '케이블카', '새벽일출'],
    placeSet: 'night-spots',
  },
];
