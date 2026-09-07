"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/i18n/LangContext";

const FONT_SIZES = ["small", "normal", "large"] as const;
type FontSize = (typeof FONT_SIZES)[number];

const FONT_SIZE_LABEL: Record<FontSize, string> = { small: "가", normal: "가", large: "가" };
const FONT_SCALE: Record<FontSize, number> = { small: 0.9, normal: 1, large: 1.2 };

export function AccessibilityToggle() {
  const { lang } = useLang();
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 10 }}>
      <button
        type="button"
        onClick={cycleSize}
        aria-label={lang === "ko" ? `글자 크기: ${fontSize}` : `Font size: ${fontSize}`}
        title={lang === "ko" ? `글자 크기 (${fontSize})` : `Font size (${fontSize})`}
        style={{
          border: "1px solid rgba(255,255,255,.3)",
          background: "rgba(24,85,77,.15)",
          color: "inherit",
          borderRadius: 8,
          padding: "4px 8px",
          fontSize: fontSize === "small" ? 11 : fontSize === "large" ? 15 : 13,
          fontWeight: 700,
          cursor: "pointer",
          lineHeight: 1.2,
        }}
      >
        {FONT_SIZE_LABEL[fontSize]}
      </button>
      <button
        type="button"
        onClick={() => setDark(!dark)}
        aria-label={dark ? "라이트 모드" : "다크 모드"}
        title={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        style={{
          border: "1px solid rgba(255,255,255,.3)",
          background: "rgba(24,85,77,.15)",
          color: "inherit",
          borderRadius: 8,
          padding: "4px 8px",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {dark ? "☀️" : "🌙"}
      </button>
    </span>
  );
}
