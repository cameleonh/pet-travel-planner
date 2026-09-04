import Link from "next/link";

export const metadata = {
  title: "3D 뷰어 — 같이갈개",
};

function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function NightViewPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lat = Number(firstParam(params.lat));
  const lng = Number(firstParam(params.lng));
  const name = firstParam(params.name) ?? "3D 뷰어";
  const key = process.env.NEXT_PUBLIC_VWORLD_API_KEY ?? "";

  const valid = Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0b1220" }}>
      {!valid || !key ? (
        <div style={{ margin: "auto", color: "#cdd7f5", textAlign: "center", padding: 24 }}>
          <p>{!valid ? "좌표가 올바르지 않습니다." : "VWorld API 키가 설정되지 않았습니다."}</p>
          <Link href="/#search" style={{ color: "#7aa2ff" }}>← 검색으로 돌아가기</Link>
        </div>
      ) : (
        <>
          <iframe
            title={`${name} 3D 야경 뷰어`}
            src={`/night-view.html?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}`}
            style={{ flex: 1, width: "100%", border: "none" }}
            allow="fullscreen"
          />
          <noscript>이 화면은 JavaScript가 필요합니다.</noscript>
        </>
      )}
    </main>
  );
}
