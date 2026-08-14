"use client";

import Image from "next/image";
import type { AuxiliaryPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import type { RegionOption } from "@/domain/regions";
import { SearchExperience } from "@/features/search/SearchExperience";
import { useLang } from "@/i18n/LangContext";
import { LangToggle } from "@/i18n/LangToggle";

export function PageContent({ catalog, dataSource, notice, fetchedAt, auxiliaryPlaces, regionOptions }: { catalog: CatalogPage; dataSource: string; notice: string | null | undefined; fetchedAt: string; auxiliaryPlaces: AuxiliaryPlace[]; regionOptions: RegionOption[] }) {
  const { dict } = useLang();
  const dataLabel = dataSource === "database" ? dict.savedData : dataSource === "live" ? dict.officialData : dict.sampleData;
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="같이갈개 홈"><span aria-hidden="true">같이</span>갈개</a>
        {dataSource !== "fixture" ? <span className="data-badge">{dataLabel} · {catalog.sourceTotalCount.toLocaleString("ko-KR")}{dict.places}</span> : null}
        <LangToggle />
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="eyebrow">{dict.eyebrow}</p>
          <h1>{dict.h1}</h1>
          <p className="lede"><span className="keep-together">{dict.lede1}</span> <span className="keep-together">{dict.lede2}</span> <span className="keep-together">{dict.lede3}</span> {dict.lede4}</p>
        </div>
        <figure className="mascot-gallery" aria-label={dict.eyebrow}>
          <span className="mascot-card">
            <Image
              src="/gachi-galgae-mascot.png"
              alt="같이갈개 마스코트"
              width={1254}
              height={1254}
              sizes="(max-width: 767px) 30vw, 152px"
              preload
            />
          </span>
          <span className="mascot-card">
            <Image
              src="/gachi-galgae-mascot-ribbon.png"
              alt="같이갈개 마스코트"
              width={1254}
              height={1254}
              sizes="(max-width: 767px) 30vw, 152px"
            />
          </span>
          <span className="mascot-card">
            <Image
              src="/gachi-galgae-mascot-walk.png"
              alt="같이갈개 마스코트"
              width={1254}
              height={1254}
              sizes="(max-width: 767px) 30vw, 152px"
            />
          </span>
        </figure>
      </section>

      {notice ? <p role="status" className="notice global-notice">{notice}</p> : null}
      <SearchExperience initialCatalog={catalog} auxiliaryPlaces={auxiliaryPlaces} regionOptions={regionOptions} />

      <footer><p>{dict.footerNotice}</p><p>{fetchedAt.slice(0, 10)} {dict.footerBaseDate}</p></footer>
    </main>
  );
}
