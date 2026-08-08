import type { MatchProof as MatchProofItem } from "@/domain/types";

export function MatchProof({ proof }: { proof: MatchProofItem[] }) {
  return (
    <details className="proof-details">
      <summary>동반 조건 자세히 보기</summary>
      <ul>
        {proof.map((item) => (
          <li key={item.constraint.key}>
            <span className="proof-check" aria-hidden="true">✓</span>
            <div>
              <strong>{item.constraint.label}{item.fact.requirements.length > 0 ? " · 준비 조건 있음" : ""}</strong>
              <p>“{item.evidence.excerpt}”</p>
              <small>확인일 {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(item.evidence.observedAt))}</small>
              {!item.evidence.sourceUrl.includes("example.invalid") ? <a href={item.evidence.sourceUrl} target="_blank" rel="noreferrer">관광공사 API 출처 보기 <span aria-hidden="true">↗</span></a> : <span className="fixture-source">시연용 데이터 근거</span>}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
