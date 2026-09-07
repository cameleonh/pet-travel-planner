import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { loadPlaceSnapshot } from "@/data/providers";
import { displayCategoryIcon, displayCategoryLabel, resolveDisplayCategory } from "@/domain/categories";
import { NIGHT_SPOT_PLACE_IDS } from "@/domain/night-spots";
import { formatKtoText, getPlaceHours } from "@/app/api/_shared/place-hours";
import { UsageBeacon } from "@/features/place/UsageBeacon";
import { PlaceReviews } from "@/features/place/PlaceReviews";
import { PlaceDetailBack } from "@/features/place/PlaceDetailBack";

const SITE_URL = "https://gggo.blog";

function decodeId(raw: string): string {
  return decodeURIComponent(raw);
}

async function findPlace(id: string) {
  const { snapshot } = await loadPlaceSnapshot();
  return snapshot.places.find((place) => place.id === id) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const place = await findPlace(decodeId(id));
  if (!place) return { title: "장소를 찾을 수 없습니다 — 같이갈개" };
  const title = `${place.name} 반려견 동반 — 같이갈개`;
  const description = `${place.address} · ${place.name} 반려견 동반 정보. ${place.petPolicy.label}`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/place/${encodeURIComponent(place.id)}` },
    openGraph: { title, description, type: "website", url: `${SITE_URL}/place/${encodeURIComponent(place.id)}` },
  };
}

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const place = await findPlace(decodeId(id));
  if (!place) notFound();

  const display = resolveDisplayCategory(place);
  const isNightSpot = NIGHT_SPOT_PLACE_IDS.has(place.id);
  const hours = getPlaceHours(place.id);
  const useTime = formatKtoText(hours?.useTime ?? null);
  const restDate = formatKtoText(hours?.restDate ?? null);
  const parking = formatKtoText(hours?.parking ?? null);
  const infoCenter = formatKtoText(hours?.infoCenter ?? null);
  const hasHours = Boolean(useTime || restDate || parking || infoCenter);
  const mapLink = `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.coordinates.latitude},${place.coordinates.longitude}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: place.name,
    address: { "@type": "PostalAddress", streetAddress: place.address, addressCountry: "KR" },
    geo: { "@type": "GeoCoordinates", latitude: place.coordinates.latitude, longitude: place.coordinates.longitude },
    petsAllowed: true,
    url: `${SITE_URL}/place/${encodeURIComponent(place.id)}`,
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#1e293b" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <UsageBeacon kind="place_page_view" detail={place.id} />
      <PlaceDetailBack />
      <h1 style={{ margin: "10px 0 4px", fontSize: 26 }}>
        {displayCategoryIcon[display]} {place.name}
        {isNightSpot ? <span style={{ fontSize: 13, background: "#1e2a4a", color: "#dbe4ff", borderRadius: 999, padding: "3px 10px", marginLeft: 8, verticalAlign: "middle", whiteSpace: "nowrap" }}>🌙 야경 명소</span> : null}
      </h1>
      <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: 14 }}>{displayCategoryLabel[display]} · {place.address}</p>
      <p style={{ margin: "16px 0", padding: "14px 16px", background: "#f1f5f9", borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}>
        🐕 <strong>반려견 동반:</strong> {place.petPolicy.label} — {place.petPolicy.sourceText}
      </p>
      {hasHours ? (
        <section style={{ margin: "0 0 24px", padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 14, lineHeight: 1.7 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 14 }}>🕐 이용 안내</h2>
          {useTime ? <p style={{ margin: "2px 0" }}><strong>이용시간</strong> {useTime}</p> : null}
          {restDate ? <p style={{ margin: "2px 0" }}><strong>휴무일</strong> {restDate}</p> : null}
          {parking ? <p style={{ margin: "2px 0" }}><strong>주차</strong> {parking}</p> : null}
          {infoCenter ? <p style={{ margin: "2px 0" }}><strong>문의</strong> {infoCenter}</p> : null}
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>한국관광공사 기준 — 방문 전 최신 운영시간 확인을 권장합니다.</p>
        </section>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 28px" }}>
        <a href={mapLink} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none", border: "1px solid #bfdbfe", borderRadius: 999, padding: "8px 16px", fontSize: 14 }}>🗺 카카오맵에서 보기</a>
        <Link href={`/night-view?lat=${place.coordinates.latitude}&lng=${place.coordinates.longitude}&name=${encodeURIComponent(place.name)}`} style={{ color: "#dbe4ff", textDecoration: "none", background: "#1e2a4a", borderRadius: 999, padding: "8px 16px", fontSize: 14 }}>🏙 3D로 둘러보기</Link>
      </div>
      {place.petPolicy.sourceUrl ? (
        <p style={{ fontSize: 12, color: "#94a3b8", wordBreak: "break-all" }}>출처: <a href={place.petPolicy.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>{place.petPolicy.sourceUrl}</a></p>
      ) : null}
      <PlaceReviews placeId={place.id} />
    </main>
  );
}
