import type { CatalogRelaxation } from "@/data/catalog";

type Props = { proposal: CatalogRelaxation | null; unverifiedCount: number; onApply: () => void };

export function ZeroResultRecovery({ proposal, unverifiedCount, onApply }: Props) {
  return (
    <section className="zero-state" aria-labelledby="zero-title">
      <span className="zero-mark" aria-hidden="true">0</span>
      <div><h3 id="zero-title">가능이 확인된 장소가 아직 없어요</h3>
        {unverifiedCount > 0 ? <p>정보 미확인 장소 {unverifiedCount.toLocaleString("ko-KR")}곳은 정책을 확인하면 조건에 맞을 수도 있어요.</p> : <p>확인된 정보에서는 선택한 조건을 모두 만족하는 장소가 없어요.</p>}
        {proposal ? <div className="relaxation-offer"><p><strong>{proposal.removedPreferences.map((item) => `‘${item.label}’`).join(", ")}</strong>만 빼면 {proposal.recoveredCount.toLocaleString("ko-KR")}곳을 볼 수 있어요.</p><button type="button" onClick={onApply}>{proposal.removedPreferences.map((item) => item.label).join(", ")} 빼고 {proposal.recoveredCount.toLocaleString("ko-KR")}곳 보기</button></div> : <p className="protected-note">꼭 필요한 조건은 그대로 두었어요. 조건을 직접 바꿔보세요.</p>}
      </div>
    </section>
  );
}
