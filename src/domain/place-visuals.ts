import type { DisplayCategory } from "@/domain/categories";

export interface PlaceVisualTheme {
  from: string;
  to: string;
  emoji: string;
}

// Soft pastel gradients standing in for missing place photos. Colors stay
// close to the canvas palette so placeholders never outrank real photos.
export const PLACE_VISUAL_THEMES: Record<DisplayCategory, PlaceVisualTheme> = {
  park: { from: "#dcf0e3", to: "#b9e0c9", emoji: "🌳" },
  beach: { from: "#dff0f8", to: "#c2e2ef", emoji: "🏖️" },
  mountain: { from: "#e5ecf3", to: "#cad9e6", emoji: "⛰️" },
  nature: { from: "#e4f2e6", to: "#c4e6cb", emoji: "🌿" },
  culture: { from: "#f3ece2", to: "#e6d9c3", emoji: "🏛️" },
  market: { from: "#fdf1e0", to: "#f7dfba", emoji: "🏪" },
  outlet: { from: "#eceff8", to: "#d7dcf0", emoji: "🛍️" },
  department: { from: "#eceff8", to: "#d7dcf0", emoji: "🏬" },
  dutyfree: { from: "#eceff8", to: "#d7dcf0", emoji: "💼" },
  restaurant: { from: "#fbe9e4", to: "#f5d3c9", emoji: "🍽️" },
  cafe: { from: "#f7ecd9", to: "#efd7b0", emoji: "☕" },
  accommodation: { from: "#eae6f2", to: "#d6cfe8", emoji: "🏨" },
  shopping: { from: "#eceff8", to: "#d7dcf0", emoji: "🛒" },
  camping: { from: "#e0f0e4", to: "#c2e3cb", emoji: "⛺" },
  veterinary: { from: "#e7f2f4", to: "#cde6ea", emoji: "🏥" },
  petShop: { from: "#fdeee6", to: "#f8dccc", emoji: "🐾" },
  petCafe: { from: "#f7ecd9", to: "#efd7b0", emoji: "🐶" },
  place: { from: "#e3f0ec", to: "#cbe4dd", emoji: "🐾" },
};

export function resolvePlaceVisual(category: DisplayCategory): PlaceVisualTheme {
  return PLACE_VISUAL_THEMES[category] ?? PLACE_VISUAL_THEMES.place;
}
