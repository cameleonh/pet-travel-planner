import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "댕플스테이 — 반려견 사찰문화 체험 · 같이갈개",
  description: "반려견과 함께하는 사찰 문화체험 '댕플스테이' — 사전 예약제 프로그램 안내",
};

const TEMPLES = [
  {
    name: "계향사 (구 관음사)",
    location: "충북 청주",
    programs: "당일형 · 1박 2일",
    note: "사찰복 대여, 경내 산책, 차담, 연꽃등 만들기",
  },
  {
    name: "이암사",
    location: "충북 영동",
    programs: "당일형 · 1박 2일",
    note: "108배 예울, 명상, 점심 공양, 경내 산책",
  },
  {
    name: "미륵사",
    location: "충북 증평",
    programs: "당일형 · 1박 2일",
    note: "반려견 전용 사찰복, 스님과 차담, 반려견 예절",
  },
];

export default function TempleStayPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#1e293b" }}>
      <p style={{ fontSize: 13 }}><Link href="/#search" style={{ color: "#2563eb", textDecoration: "none" }}>← 같이갈개</Link></p>
      <h1 style={{ fontSize: 26, margin: "10px 0 4px" }}>🧘 댕플스테이</h1>
      <p style={{ fontSize: 15, color: "#475569", margin: "0 0 20px" }}>
        댕댕이 + 템플스테이 — 반려견과 함께 사찰에서 머물며 불교문화를 체험하는 프로그램
      </p>

      <div style={{ padding: "16px 20px", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 12, margin: "0 0 24px" }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          ⚠️ <strong>상시 운영이 아닙니다.</strong> 회차별 모집·조기 마감되는 예약제 프로그램입니다.
          방문 전 반드시 아래 연락처로 일정·모집 여부를 확인하세요.
        </p>
      </div>

      <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>운영 사찰</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TEMPLES.map((temple) => (
          <div key={temple.name} style={{ padding: "16px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong style={{ fontSize: 16 }}>{temple.name}</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{temple.location}</p>
              </div>
              <span style={{ fontSize: 12, background: "#e0f2fe", color: "#0369a1", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>
                {temple.programs}
              </span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>🐕 {temple.note}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, margin: "28px 0 12px" }}>참여 방법</h2>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2 }}>
        <li>운영사 <strong>반려생활</strong> 플랫폼에서 회차 확인</li>
        <li>가격: 10만~40만원 (당일/숙박에 따라)</li>
        <li>회차당 10팀 내외 — <strong>조기 마감 잦음</strong></li>
        <li>반려견 전용 사찰복 대여 포함</li>
      </ol>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "24px 0" }}>
        <a
          href="https://banrye.life"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#2563eb", textDecoration: "none", border: "1px solid #bfdbfe", borderRadius: 999, padding: "10px 18px", fontSize: 14 }}
        >
          반려생활에서 예약 확인 →
        </a>
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginTop: 24 }}>
        출처: 연합뉴스 2026-09-05 「강아지도 사찰복 입고 스님과 차담…댕플스테이 인기」 ·
        2026 대한민국불교문화엑스포(대구)에서도 반려동물 친화 프로그램 운영 예정
      </p>
    </main>
  );
}
