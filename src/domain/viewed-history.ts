import type { RawPlace } from "@/data/contracts";

export interface ViewedPlaceSummary {
  id: string;
  name: string;
  category: RawPlace["category"];
  region: string;
}

export const VIEWED_HISTORY_LIMIT = 4;

const STORAGE_KEY = "pet_travel_viewed_history_v1";

const EMPTY_HISTORY: ViewedPlaceSummary[] = [];
const EMPTY_KEY = "\u0000empty";

const listeners = new Set<() => void>();
let cachedKey: string | null = null;
let cache: ViewedPlaceSummary[] = EMPTY_HISTORY;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

function scheduleDeferredNotify(): void {
  if (notifyTimer !== null) return;
  // Recording a view re-renders the recently-viewed chips; deferring that
  // render keeps the layout stable while the user is mid-interaction
  // (rapid taps would otherwise shift content under the pointer).
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    notifyListeners();
  }, 300);
}

function flushPendingNotify(): void {
  if (notifyTimer === null) return;
  clearTimeout(notifyTimer);
  notifyTimer = null;
}

function parseHistory(raw: string | null): ViewedPlaceSummary[] {
  if (!raw) return EMPTY_HISTORY;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_HISTORY;
    return parsed.filter((entry): entry is ViewedPlaceSummary =>
      typeof entry === "object" && entry !== null &&
      typeof (entry as ViewedPlaceSummary).id === "string" &&
      typeof (entry as ViewedPlaceSummary).name === "string",
    );
  } catch {
    return EMPTY_HISTORY;
  }
}

function readRaw(): string | null {
  if (typeof window === "undefined") return EMPTY_KEY;
  try {
    return localStorage.getItem(STORAGE_KEY) ?? EMPTY_KEY;
  } catch {
    return EMPTY_KEY;
  }
}

function snapshot(): ViewedPlaceSummary[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  const raw = readRaw();
  if (raw !== cachedKey) {
    cachedKey = raw;
    cache = parseHistory(raw === EMPTY_KEY ? null : raw);
  }
  return cache;
}

function persist(entries: ViewedPlaceSummary[], immediateNotify = false): void {
  cache = entries;
  cachedKey = null;
  if (typeof window !== "undefined") {
    try {
      if (entries.length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  }
  if (immediateNotify) {
    flushPendingNotify();
    notifyListeners();
    return;
  }
  scheduleDeferredNotify();
}

export function subscribeViewedHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getViewedHistorySnapshot(): ViewedPlaceSummary[] {
  return snapshot();
}

export function getRecentlyViewed(): ViewedPlaceSummary[] {
  return snapshot();
}

export function recordViewedPlace(entry: ViewedPlaceSummary): void {
  const rest = snapshot().filter((item) => item.id !== entry.id);
  persist([entry, ...rest].slice(0, VIEWED_HISTORY_LIMIT));
}

export function removeViewedPlace(id: string): void {
  persist(snapshot().filter((item) => item.id !== id), true);
}

export function clearViewedHistory(): void {
  persist([], true);
}
