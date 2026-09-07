export type AccessibleSpot = {
  placeId: string;
  tag: "wheelchair" | "stroller" | "general";
};

// Places with verified accessibility information (barrier-free travel).
// Seeded from the KTO Barrier-Free dataset (26 spots). Grows automatically
// as the hours sync captures wheelchair/restroom/elevator/stroller fields
// from detailIntro2 for the rest of the catalog.
export const ACCESSIBLE_SPOTS: readonly AccessibleSpot[] = [
  { placeId: "tour-api:127778", tag: "wheelchair" }, // 가천 다랭이마을
  { placeId: "tour-api:126027", tag: "general" }, // 롯데월드타워
  { placeId: "tour-api:2927087", tag: "general" },
  { placeId: "tour-api:4012773", tag: "general" },
  { placeId: "tour-api:4008808", tag: "general" },
  { placeId: "tour-api:2905752", tag: "general" },
  { placeId: "tour-api:2784167", tag: "general" },
  { placeId: "tour-api:2707444", tag: "general" },
  { placeId: "tour-api:2024432", tag: "general" },
  { placeId: "tour-api:2927087", tag: "general" },
  { placeId: "tour-api:2357441", tag: "general" },
  { placeId: "tour-api:126027", tag: "general" },
  { placeId: "tour-api:4008098", tag: "general" },
  { placeId: "tour-api:127778", tag: "wheelchair" },
  { placeId: "tour-api:2909061", tag: "general" },
  { placeId: "tour-api:132786", tag: "general" },
  { placeId: "tour-api:3083766", tag: "general" },
  { placeId: "tour-api:128213", tag: "general" },
  { placeId: "tour-api:2723688", tag: "general" },
  { placeId: "tour-api:128022", tag: "general" },
  { placeId: "tour-api:2610509", tag: "general" },
  { placeId: "tour-api:2871546", tag: "general" },
  { placeId: "tour-api:126644", tag: "general" },
  { placeId: "tour-api:3018842", tag: "general" },
  { placeId: "tour-api:127311", tag: "general" },
  { placeId: "tour-api:2569511", tag: "general" },
];

export const ACCESSIBLE_PLACE_IDS: ReadonlySet<string> = new Set(
  ACCESSIBLE_SPOTS.map((spot) => spot.placeId),
);
