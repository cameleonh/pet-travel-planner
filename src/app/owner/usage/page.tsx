"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  since: string | null;
  byKind: Array<{ kind: string; total: number }>;
  byDetail: Array<{ kind: string; detail: string; total: number }>;
  byDay: Array<{ day: string; total: number }>;
};

const KIND_LABEL: Record<string, string> = {
  theme_apply: "테마 적용",
  place_view: "장소 카드 조회",
  place_page_view: "장소 상세 페이지",
  nightspot_3d_open: "3D 뷰어 오픈(구 야경)",
  place_3d_open: "3D 뷰어 오픈",
  plan_generate: "여행 계획 생성",
  region_search: "지역 검색",
};

function label(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

function prettyDetail(kind: string, detail: string): string {
  if (!detail) return "(없음)";
  if (kind === "place_view" || kind === "place_page_view") return detail.replace("tour-api:", "장소 #");
  return detail;
}

export default function OwnerUsagePage() {
  const [data, setData] = useState<Summary | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void fetch("/api/usage/summary", { signal: controller.signal })
        .then(async (res) => {
          if (res.status === 401) { setUnauthorized(true); return; }
          const json = await res.json();
          if (json.success) setData(json.data);
        })
        .catch(() => {});
    });
    return () => controller.abort();
  }, []);

  if (unauthorized) {
    return (
      <main style={{ maxWidth: 640, margin: "60px auto", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <h1>🔐 오너 로그인이 필요합니다</h1>
        <p><Link href="/owner/login" style={{ color: "#2563eb" }}>오너 로그인 하러 가기</Link></p>
      </main>
    );
  }

  const grandTotal = data?.byKind.reduce((sum, row) => sum + row.total, 0) ?? 0;
  const maxDay = data?.byDay.reduce((max, row) => Math.max(max, row.total), 0) ?? 0;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#1e293b" }}>
      <p style={{ fontSize: 13 }}><Link href="/owner/places" style={{ color: "#2563eb", textDecoration: "none" }}>← 오너 포털</Link></p>
      <h1 style={{ fontSize: 22 }}>📊 사용 통계 <span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}>최근 30일 · 익명 집계 (식별 정보 없음)</span></h1>

      {!data ? (
        <p style={{ color: "#64748b" }}>불러오는 중…</p>
      ) : grandTotal === 0 ? (
        <p style={{ padding: 20, background: "#f8fafc", borderRadius: 12, color: "#64748b" }}>
          아직 집계된 이벤트가 없습니다. 사용자가 앱을 쓰면 이 페이지에 쌓입니다 — 테마 클릭, 장소 조회, 지역 검색, 계획 생성이 전부 기록됩니다.
        </p>
      ) : (
        <>
          <section style={{ margin: "20px 0" }}>
            <h2 style={{ fontSize: 15 }}>총 {grandTotal.toLocaleString()}건 · 이벤트별</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                {data.byKind.map((row) => (
                  <tr key={row.kind} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 4px" }}>{label(row.kind)}</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600 }}>{row.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={{ margin: "28px 0" }}>
            <h2 style={{ fontSize: 15 }}>일별 추이</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...data.byDay].reverse().map((row) => (
                <div key={row.day} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ width: 88, color: "#64748b" }}>{row.day.slice(5)}</span>
                  <span style={{ flex: 1, background: "#e2e8f0", borderRadius: 4, height: 14, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", background: "#2563eb", width: maxDay ? `${(100 * row.total) / maxDay}%` : "0%" }} />
                  </span>
                  <span style={{ width: 52, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.total}</span>
                </div>
              ))}
            </div>
          </section>

          {data.byKind.map((kindRow) => {
            const details = data.byDetail.filter((row) => row.kind === kindRow.kind).slice(0, 10);
            if (details.length === 0) return null;
            return (
              <section key={kindRow.kind} style={{ margin: "24px 0" }}>
                <h2 style={{ fontSize: 15 }}>{label(kindRow.kind)} · 상위</h2>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
                  {details.map((row) => (
                    <li key={`${row.kind}:${row.detail}`}>{prettyDetail(row.kind, row.detail)} — <strong>{row.total.toLocaleString()}</strong></li>
                  ))}
                </ol>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
