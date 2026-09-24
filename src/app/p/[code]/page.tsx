import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSharedPlan } from "@/app/api/_shared/shared-plans";
import { sharedPlanSchema, type SharedPlanData } from "@/app/api/_shared/shared-plan-schema";

export const metadata = { title: "여행 계획 — 같이갈개" };

function visitWindowLabel(status: SharedPlanData["places"][number]["visitWindowStatus"], closingDayChecked: boolean | undefined): string {
  if (status === "within-hours") return closingDayChecked ? "기재된 이용시간 안 · 당일 확인 권장" : "이용시간 안으로 보이나 휴무 미확인";
  if (status === "outside-hours") return "예상 방문시간이 기재된 이용시간 밖";
  if (status === "closed-day") return "등록된 정기 휴무일";
  return "운영시간상 방문 가능 여부 미확인";
}

export default async function SharedPlanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const plan = loadSharedPlan(code);
  if (!plan) notFound();

  let parsed: unknown;
  try { parsed = JSON.parse(plan.planJson); } catch { notFound(); }
  const result = sharedPlanSchema.safeParse(parsed);
  if (!result.success) notFound();
  const data: SharedPlanData = result.data;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#1e293b" }}>
      <p style={{ fontSize: 13 }}><Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>🐾 같이갈개</Link> · 공유된 여행 계획</p>
      <h1 style={{ fontSize: 24, margin: "10px 0 4px" }}>
        {data.tripDate ? new Date(`${data.tripDate}T12:00:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }) : "여행 계획"}
        {data.departure ? <span style={{ fontSize: 14, color: "#64748b", marginLeft: 8 }}>{data.departure} 출발</span> : null}
      </h1>

      {data.places && data.places.length > 0 ? (
        <ol style={{ margin: "20px 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
          {data.places.map((place, index) => (
            <li key={index} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <span style={{ minWidth: 28, height: 28, borderRadius: "50%", background: "#18584d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{index + 1}</span>
              <div>
                <strong style={{ fontSize: 15 }}>{place.name}</strong>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>{place.address}</p>
                {place.dwell != null ? <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>체류 {place.dwell}분</p> : null}
                <p style={{ margin: "3px 0 0", fontSize: 12, color: place.visitWindowStatus === "outside-hours" || place.visitWindowStatus === "closed-day" ? "#b42318" : "#475569" }}>
                  예상 방문 {place.plannedVisitAt ?? "시간 미확인"} · {visitWindowLabel(place.visitWindowStatus, place.closingDayChecked)}
                </p>
                {place.policySourceUrl ? (
                  <div style={{ marginTop: 5, padding: "8px 10px", borderRadius: 8, background: "#eff6ff", fontSize: 12, lineHeight: 1.5 }}>
                    <strong>반려견 동반 정보</strong>
                    <p style={{ margin: "2px 0", color: "#475569", whiteSpace: "pre-wrap" }}>{place.policySourceText || "관광공사 원문을 확인해 주세요."}</p>
                    <small style={{ color: "#64748b" }}>관측 {place.policyObservedAt?.slice(0, 10) ?? "일자 미확인"} · </small>
                    <a href={place.policySourceUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>KTO 출처 보기 ↗</a>
                  </div>
                ) : <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9a3412" }}>반려견 동반 조건은 방문 전 직접 확인해 주세요.</p>}
                {place.operatingHours ? (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                    이용시간 {place.operatingHours.useTime ?? "미확인"} · 휴무 {place.operatingHours.restDate ?? "미확인"}
                    {place.operatingHours.fetchedAt ? ` · 상세 수집 ${place.operatingHours.fetchedAt.slice(0, 10)}` : ""}
                  </p>
                ) : <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9a3412" }}>운영시간 정보 없음 · 방문 전 확인 필요</p>}
                {place.coordinates ? (
                  <a
                    href={`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.coordinates.latitude},${place.coordinates.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-block", marginTop: 5, color: "#2563eb", fontSize: 12, textDecoration: "none" }}
                  >
                    카카오맵에서 위치 보기 ↗
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {data.routes && data.routes.length > 0 ? (
        <section style={{ margin: "16px 0" }}>
          <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>🚗 이동 경로</h2>
          {data.routes.map((route, index) => (
            <p key={index} style={{ fontSize: 13, margin: "4px 0", color: "#475569" }}>
              {route.fromName} → {route.toName} · {route.routeMode === "approximate" ? `직선거리 ${route.distanceKm.toFixed(1)}km · 실제 경로·시간 확인 필요` : `${route.distanceKm.toFixed(1)}km${route.durationMinutes !== null ? ` · 약 ${route.durationMinutes}분` : " · 이동시간 미확인"}`}
            </p>
          ))}
        </section>
      ) : null}

      {data.arrival ? (
        <p style={{ fontSize: 14, padding: "10px 16px", background: "#f0fdf4", borderRadius: 10, color: "#166534" }}>
          🏁 마지막 방문지 도착 예정: <strong>{data.arrival}</strong>
        </p>
      ) : null}

      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 24 }}>
        같이갈개에서 반려견과 함께 갈 수 있는 곳을 찾아보세요 — <Link href="/" style={{ color: "#2563eb" }}>gggo.blog</Link>
      </p>
    </main>
  );
}
