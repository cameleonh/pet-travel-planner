"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getViewedHistorySnapshot, removeViewedPlace, subscribeViewedHistory, type ViewedPlaceSummary } from "@/domain/viewed-history";
import { displayCategoryIcon, resolveDisplayCategory } from "@/domain/categories";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

const EMPTY_HISTORY: ViewedPlaceSummary[] = [];

export function RecentlyViewed({ onOpen }: { onOpen: (entry: ViewedPlaceSummary) => void }) {
  const { lang, dict } = useLang();
  const entries = useSyncExternalStore(subscribeViewedHistory, getViewedHistorySnapshot, () => EMPTY_HISTORY);

  const removeEntry = useCallback((id: string) => {
    removeViewedPlace(id);
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="recently-viewed" aria-label={dict.recentlyViewed}>
      <p className="recently-viewed-label">🐾 {dict.recentlyViewed}</p>
      <ul className="recently-viewed-list">
        {entries.map((entry) => (
          <li key={entry.id} className="recently-viewed-item">
            <button
              type="button"
              className="recently-viewed-chip"
              onClick={() => onOpen(entry)}
              aria-label={t(lang, "recentlyViewedOpen", { name: entry.name })}
            >
              <span aria-hidden="true">{displayCategoryIcon[resolveDisplayCategory({ name: entry.name, category: entry.category })]}</span>
              <span className="recently-viewed-name">{entry.name}</span>
            </button>
            <button
              type="button"
              className="recently-viewed-remove"
              onClick={() => removeEntry(entry.id)}
              aria-label={t(lang, "recentlyViewedRemove", { name: entry.name })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
