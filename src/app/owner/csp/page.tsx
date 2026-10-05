"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CspStats = {
  total: number;
  last24h: number;
  byDirective: { directive: string; total: number }[];
  byBlockedUri: { blockedUri: string; total: number }[];
  byDay: { day: string; total: number }[];
};

export default function OwnerCspPage() {
  const [data, setData] = useState<CspStats | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void fetch("/api/owner/csp-reports", { signal: controller.signal })
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
      <main style={{ maxWidth: 640, margin: "60px auto", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center", color: "var(--ink)" }}>
        <h1>🔐 오너 로그인이 필요합니다</h1>
        <p><Link href="/owner/login" style={{ color: "var(--info)" }}>오너 로그인 하러 가기</Link></p>
      </main>
    );
  }

  const maxDay = data?.byDay.reduce((max, row) => Math.max(max, row.total), 0) ?? 0;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "var(--ink)" }}>
      <p style={{ fontSize: 13 }}><Link href="/owner/usage" style={{ color: "var(--info)", textDecoration: "none" }}>← 사용 통계</Link></p>
      <h1 style={{ fontSize: 22 }}>🛡 CSP 위반 리포트 <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>익명 집계 (IP 미저장)</span></h1>

      {!data ? (
        <p style={{ color: "var(--muted)" }}>불러오는 중…</p>
      ) : data.total === 0 ? (
        <p style={{ padding: 20, background: "var(--surface-subtle)", borderRadius: 12, color: "var(--muted)" }}>
          아직 수집된 위반이 없습니다. 브라우저가 CSP를 위반하면 이곳에 쌓입니다.
        </p>
      ) : (
        <>
          <section style={{ margin: "20px 0", display: "flex", gap: 12 }}>
            <div style={{ flex: 1, padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-subtle)" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>전체</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{data.total.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-subtle)" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>최근 24시간</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{data.last24h.toLocaleString()}</div>
            </div>
          </section>

          <section style={{ margin: "24px 0" }}>
            <h2 style={{ fontSize: 15 }}>지시문(directive)별</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                {data.byDirective.map((row) => (
                  <tr key={row.directive} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{row.directive}</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600 }}>{row.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={{ margin: "24px 0" }}>
            <h2 style={{ fontSize: 15 }}>차단된 대상(blocked-uri) 상위</h2>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9, wordBreak: "break-all" }}>
              {data.byBlockedUri.map((row) => (
                <li key={row.blockedUri}>{row.blockedUri} — <strong>{row.total.toLocaleString()}</strong></li>
              ))}
            </ol>
          </section>

          <section style={{ margin: "24px 0" }}>
            <h2 style={{ fontSize: 15 }}>일별 추이</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...data.byDay].reverse().map((row) => (
                <div key={row.day} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ width: 88, color: "var(--muted)" }}>{row.day.slice(5)}</span>
                  <span style={{ flex: 1, background: "var(--line)", borderRadius: 4, height: 14, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", background: "var(--brand)", width: maxDay ? `${(100 * row.total) / maxDay}%` : "0%" }} />
                  </span>
                  <span style={{ width: 52, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.total}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
