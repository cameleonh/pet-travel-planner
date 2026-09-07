"use client";

import { useCallback, useEffect, useState } from "react";

const FONT_SIZES = ["small", "normal", "large"] as const;
type FontSize = (typeof FONT_SIZES)[number];

const FONT_SCALE: Record<FontSize, number> = { small: 0.9, normal: 1, large: 1.2 };

export function AccessibilityToggle() {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const saved = localStorage.getItem("gggo_font_size") as FontSize | null;
      return saved && FONT_SIZES.includes(saved) ? saved : "normal";
    } catch { return "normal"; }
  });
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("gggo_dark") === "1"; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * FONT_SCALE[fontSize]}px`;
    try { localStorage.setItem("gggo_font_size", fontSize); } catch {}
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    try { localStorage.setItem("gggo_dark", dark ? "1" : "0"); } catch {}
  }, [dark]);

  const cycleSize = useCallback(() => {
    setFontSize((current) => {
      const idx = FONT_SIZES.indexOf(current);
      return FONT_SIZES[(idx + 1) % FONT_SIZES.length] ?? "normal";
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
        onClick={() => setDark(!dark)}
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
