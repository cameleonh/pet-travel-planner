import Image from "next/image";
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
        <a className="brand" href="#top" aria-label="같이갈개 홈"><span aria-hidden="true">같이</span>갈개</a>
        <span className="data-badge">{dataLabel} · {catalog.sourceTotalCount.toLocaleString("ko-KR")}곳</span>
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="eyebrow">반려견과 함께 갈 수 있는 곳</p>
          <h1>같이갈개, 함께라서 더 가치 있는 여행</h1>
          <p className="lede"><span className="keep-together">반려견 크기와 조건을 고르면,</span> <span className="keep-together">맞는 장소만 추려요.</span> <span className="keep-together">동반 규정은</span> 원문으로 확인할 수 있어요.</p>
        </div>
        <figure className="mascot-gallery" aria-label="같이갈개 마스코트의 여행 모습">
          <span className="mascot-card">
            <Image
              src="/gachi-galgae-mascot.png"
              alt="파란 모자를 쓰고 꽃과 함께 있는 같이갈개 마스코트"
              width={1254}
              height={1254}
              sizes="(max-width: 767px) 30vw, 152px"
              preload
            />
          </span>
          <span className="mascot-card">
            <Image
              src="/gachi-galgae-mascot-ribbon.png"
              alt="분홍 리본을 달고 있는 같이갈개 마스코트"
              width={1254}
              height={1254}
              sizes="(max-width: 767px) 30vw, 152px"
            />
          </span>
          <span className="mascot-card">
            <Image
              src="/gachi-galgae-mascot-walk.png"
              alt="목줄을 하고 산책을 기다리는 같이갈개 마스코트"
              width={1254}
              height={1254}
              sizes="(max-width: 767px) 30vw, 152px"
            />
          </span>
        </figure>
      </section>

      {notice ? <p role="status" className="notice global-notice">{notice}</p> : null}
      <SearchExperience initialCatalog={catalog} auxiliaryPlaces={snapshot.auxiliaryPlaces} />

      <footer><p>동반 규정은 바뀔 수 있어요. 출발 전 운영처에 한 번 더 확인해 주세요.</p><p>{snapshot.fetchedAt.slice(0, 10)} 기준</p></footer>
    </main>
  );
}
