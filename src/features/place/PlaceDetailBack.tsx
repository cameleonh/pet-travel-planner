"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function PlaceDetailBack() {
  const router = useRouter();
  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/#search");
    }
  }, [router]);

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="검색 결과로 돌아가기"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "1px solid var(--line-strong)",
        background: "var(--surface)",
        color: "var(--ink)",
        borderRadius: 10,
        padding: "10px 18px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,.08)",
      }}
    >
      ← 목록으로 돌아가기
    </button>
  );
}
