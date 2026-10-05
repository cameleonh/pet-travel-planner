import type { ViewedPlaceSummary } from "@/domain/viewed-history";

/** A place the companion dog can recommend; it always maps to a real detail page. */
export type CompanionCandidate = {
  id: string;
  name: string;
  region: string;
  /** True only when admission was confirmed by the official catalog, not merely viewed. */
  confirmed?: boolean;
};

/** Persisted companion state: whether the owner hid the dog and how often it was petted. */
export type CompanionPrefs = {
  hidden: boolean;
  petCount: number;
};

export const COMPANION_STORAGE_KEY = "pet_travel_companion_v1";
export const DEFAULT_COMPANION_PREFS: CompanionPrefs = { hidden: false, petCount: 0 };

export function parseCompanionPrefs(raw: string | null): CompanionPrefs {
  if (!raw) return DEFAULT_COMPANION_PREFS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_COMPANION_PREFS;
    const hidden = (parsed as { hidden?: unknown }).hidden === true;
    const rawCount = (parsed as { petCount?: unknown }).petCount;
    const petCount = typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount >= 0 ? Math.floor(rawCount) : 0;
    return { hidden, petCount };
  } catch {
    return DEFAULT_COMPANION_PREFS;
  }
}

export function serializeCompanionPrefs(prefs: CompanionPrefs): string {
  return JSON.stringify({ hidden: prefs.hidden, petCount: Math.max(0, Math.floor(prefs.petCount)) });
}

/**
 * Deterministic, wrap-around rotation. The same index always yields the same item,
 * so a recommendation never jumps while the queue is unchanged.
 */
export function pickRecommendation<T>(items: readonly T[], index: number): T | null {
  if (items.length === 0) return null;
  const normalized = ((Math.trunc(index) % items.length) + items.length) % items.length;
  return items[normalized] ?? null;
}

/**
 * Builds the recommendation queue: personally viewed places first, then the
 * server-provided pool of confirmed admission places, deduplicated by id.
 */
export function buildRecommendationQueue(
  recent: readonly ViewedPlaceSummary[],
  candidates: readonly CompanionCandidate[],
): CompanionCandidate[] {
  const candidateById = new Map(candidates.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const queue: CompanionCandidate[] = [];
  for (const item of recent) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    queue.push({ id: item.id, name: item.name, region: item.region, confirmed: candidateById.get(item.id)?.confirmed === true });
  }
  for (const item of candidates) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    queue.push({ id: item.id, name: item.name, region: item.region, confirmed: item.confirmed === true });
  }
  return queue;
}

// External store so the companion's persisted state can be read through
// useSyncExternalStore (hydration-safe) instead of setState inside an effect.
const prefsListeners = new Set<() => void>();
let prefsRawKey: string | null | undefined;
let prefsCache: CompanionPrefs = DEFAULT_COMPANION_PREFS;

function readPrefsRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(COMPANION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function subscribeCompanionPrefs(listener: () => void): () => void {
  prefsListeners.add(listener);
  return () => {
    prefsListeners.delete(listener);
  };
}

export function getCompanionPrefsSnapshot(): CompanionPrefs {
  if (typeof window === "undefined") return DEFAULT_COMPANION_PREFS;
  const raw = readPrefsRaw();
  if (raw !== prefsRawKey) {
    prefsRawKey = raw;
    prefsCache = parseCompanionPrefs(raw);
  }
  return prefsCache;
}

export function getCompanionPrefsServerSnapshot(): CompanionPrefs {
  return DEFAULT_COMPANION_PREFS;
}

export function setCompanionPrefs(next: CompanionPrefs): void {
  const normalized: CompanionPrefs = { hidden: next.hidden, petCount: Math.max(0, Math.floor(next.petCount)) };
  const serialized = serializeCompanionPrefs(normalized);
  prefsCache = normalized;
  prefsRawKey = serialized;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COMPANION_STORAGE_KEY, serialized);
    } catch {}
  }
  for (const listener of prefsListeners) listener();
}
