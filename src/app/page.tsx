import { loadPlaceSnapshot } from "@/data/providers";
import { buildCatalogPage } from "@/data/catalog";
import { SearchExperience } from "@/features/search/SearchExperience";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { snapshot, dataSource, notice } = await loadPlaceSnapshot();
  const catalog = buildCatalogPage(snapshot, { hard: [], preferences: [], page: 1 });
  const dataLabel = dataSource === "database" ? "저장 데이터" : dataSource === "live" ? "관광공사" : "샘플";
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="함께갈지도 홈"><span aria-hidden="true">같이</span>함께갈지도</a>
        <span className="data-badge">{dataLabel} · {catalog.sourceTotalCount.toLocaleString("ko-KR")}곳</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">반려견 동반 여행</p>
        <h1>함께 갈 수 있는 곳만 골라볼게요</h1>
        <p className="lede">반려견 크기와 필요한 조건을 고르면, 모두 맞는 장소만 추려요. 동반 규정도 원문으로 확인할 수 있어요.</p>
      </section>

      {notice ? <p role="status" className="notice global-notice">{notice}</p> : null}
      <SearchExperience initialCatalog={catalog} auxiliaryPlaces={snapshot.auxiliaryPlaces} />

      <footer><p>동반 규정은 바뀔 수 있어요. 출발 전 운영처에 한 번 더 확인해 주세요.</p><p>{snapshot.fetchedAt.slice(0, 10)} 기준</p></footer>
    </main>
  );
}
