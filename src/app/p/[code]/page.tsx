import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSharedPlan } from "@/app/api/_shared/shared-plans";

export const metadata = { title: "여행 계획 — 같이갈개" };

type SharedPlanData = {
  tripDate?: string;
  departure?: string;
  places?: Array<{ name: string; address: string; dwell?: number | null }>;
  routes?: Array<{ fromName: string; toName: string; distanceKm: number; durationMinutes: number | null }>;
  arrival?: string | null;
};

export default async function SharedPlanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const plan = loadSharedPlan(code);
  if (!plan) notFound();

  let data: SharedPlanData = {};
  try { data = JSON.parse(plan.planJson) as SharedPlanData; } catch { notFound(); }

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
                {place.dwell ? <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>체류 {place.dwell}분</p> : null}
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
              {route.fromName} → {route.toName} · {route.distanceKm}km{route.durationMinutes ? ` · 약 ${route.durationMinutes}분` : ""}
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
