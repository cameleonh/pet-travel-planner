"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/i18n/LangContext";

const SCROLL_THRESHOLD_PX = 480;

export function FloatingQuickNav({ viewMode, onToggleViewMode }: { viewMode: "list" | "map"; onToggleViewMode: () => void }) {
  const { dict } = useLang();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const update = () => setShowScrollTop(window.scrollY > SCROLL_THRESHOLD_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const scrollTop = useCallback(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, []);

  return (
    <div className="floating-quick-nav" role="group" aria-label={dict.findPlace}>
      <button
        type="button"
        className="quick-nav-button"
        onClick={onToggleViewMode}
        aria-label={viewMode === "list" ? dict.switchToMapView : dict.switchToListView}
      >
        <span aria-hidden="true">{viewMode === "list" ? "🗺️" : "📋"}</span>
        <span className="quick-nav-label">{viewMode === "list" ? dict.switchToMapView : dict.switchToListView}</span>
      </button>
      {showScrollTop ? (
        <button type="button" className="quick-nav-button" onClick={scrollTop} aria-label={dict.scrollTop}>
          <span aria-hidden="true">↑</span>
          <span className="quick-nav-label">{dict.scrollTop}</span>
        </button>
      ) : null}
    </div>
  );
}
