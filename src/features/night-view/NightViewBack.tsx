"use client";

import { useCallback } from "react";

export function NightViewBack({ name }: { name: string }) {
  const goBack = useCallback(() => {
    // Prefer returning to where the user came from; fall back to search
    // for direct-link/new-tab entries with no history.
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/#search";
    }
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label="뒤로 가기"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          border: "1px solid rgba(255,255,255,.25)",
          background: "rgba(10,16,30,.82)",
          color: "#dbe4ff",
          borderRadius: 999,
          padding: "7px 14px",
          fontSize: 13,
          cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}
      >
        ← 목록으로
      </button>
      <span
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,.6)",
          textShadow: "0 1px 4px rgba(0,0,0,.8)",
        }}
      >
        {name}
      </span>
    </div>
  );
}
