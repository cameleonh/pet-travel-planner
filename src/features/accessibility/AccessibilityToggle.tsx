"use client";

import { useCallback, useEffect, useState } from "react";

const FONT_SIZES = ["small", "normal", "large"] as const;
type FontSize = (typeof FONT_SIZES)[number];

const FONT_SCALE: Record<FontSize, number> = { small: 0.9, normal: 1, large: 1.2 };

export function AccessibilityToggle() {
  // Defaults first: reading localStorage during render makes the server and
  // client markup diverge (e.g. the moon/sun emoji), so restore after mount.
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("gggo_font_size") as FontSize | null;
        if (saved && FONT_SIZES.includes(saved)) setFontSize(saved);
        if (localStorage.getItem("gggo_dark") === "1") setDark(true);
      } catch {}
    });
  }, []);

  // Apply-only effects: persisting here would overwrite the stored choice with
  // the default before the restore above has read it.
  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * FONT_SCALE[fontSize]}px`;
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const cycleSize = useCallback(() => {
    setFontSize((current) => {
      const idx = FONT_SIZES.indexOf(current);
      const next = FONT_SIZES[(idx + 1) % FONT_SIZES.length] ?? "normal";
      try { localStorage.setItem("gggo_font_size", next); } catch {}
      return next;
    });
  }, []);

  const toggleDark = useCallback(() => {
    setDark((current) => {
      const next = !current;
      try { localStorage.setItem("gggo_dark", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <button
        type="button"
        onClick={cycleSize}
        aria-label="글자 크기 조절"
        style={{
          border: "none",
          background: "none",
          color: "inherit",
          padding: "4px 6px",
          fontSize: fontSize === "small" ? 11 : fontSize === "large" ? 16 : 13,
          fontWeight: 700,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        가
      </button>
      <span style={{ opacity: 0.3, fontSize: 12 }}>|</span>
      <button
        type="button"
        onClick={toggleDark}
        aria-label={dark ? "라이트 모드" : "다크 모드"}
        style={{
          border: "none",
          background: "none",
          padding: "4px 6px",
          fontSize: 16,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        {dark ? "☀️" : "🌙"}
      </button>
    </span>
  );
}
