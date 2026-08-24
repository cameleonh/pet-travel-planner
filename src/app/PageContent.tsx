"use client";

import { useEffect, useRef, useState } from "react";
import type { AuxiliaryPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import type { RegionOption } from "@/domain/regions";
import { SearchExperience } from "@/features/search/SearchExperience";
import { useLang } from "@/i18n/LangContext";
import { LangToggle } from "@/i18n/LangToggle";

const HERO_VIDEO_URL = "/hero-dog-walk.mp4";

export function PageContent({ catalog, notice, fetchedAt, auxiliaryPlaces, regionOptions }: { catalog: CatalogPage; notice: string | null | undefined; fetchedAt: string; auxiliaryPlaces: AuxiliaryPlace[]; regionOptions: RegionOption[] }) {
  const { dict, lang } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    void video.play().catch(() => setVideoPlaying(false));
  }, []);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setVideoPlaying(false));
    else video.pause();
  };
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label={dict.homeLabel}><span aria-hidden="true">같이</span>갈개</a>
        <LangToggle />
      </header>

      <section className="intro" id="top">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onPlay={() => setVideoPlaying(true)}
          onPause={() => setVideoPlaying(false)}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        <span className="hero-video-scrim" aria-hidden="true" />
        <div className="intro-copy">
          <p className="eyebrow">{dict.eyebrow}</p>
          <h1>{dict.h1}</h1>
          <p className="lede"><span className="keep-together">{dict.lede1}</span> <span className="keep-together">{dict.lede2}</span> <span className="keep-together">{dict.lede3}</span> {dict.lede4}</p>
          <div className="journey-map" aria-label={dict.journeyLabel}>
            <p>{dict.journeyLabel}</p>
            <ol>
              <li><span>01</span><div><strong>{dict.journeySearch}</strong><small>{dict.journeySearchNote}</small></div></li>
              <li><span>02</span><div><strong>{dict.journeyChoose}</strong><small>{dict.journeyChooseNote}</small></div></li>
              <li><span>03</span><div><strong>{dict.journeyPlan}</strong><small>{dict.journeyPlanNote}</small></div></li>
            </ol>
          </div>
          <div className="hero-cta-wrap">
            <a href="#search" className="hero-scroll-btn">
              🐾 {lang === "ko" ? "동반 가능 장소 바로보기" : "Explore Places"} ↓
            </a>
          </div>
        </div>
        <div className="hero-video-actions">
          <button type="button" className="hero-video-toggle" onClick={toggleVideo} aria-label={videoPlaying ? dict.heroVideoPause : dict.heroVideoPlay}>
            <span aria-hidden="true">{videoPlaying ? "Ⅱ" : "▶"}</span>
          </button>
          <a href="https://www.pexels.com/video/person-walking-with-a-dog-6231305/" target="_blank" rel="noreferrer">{dict.heroVideoCredit}</a>
        </div>
      </section>

      {notice ? <p role="status" className="notice global-notice">{notice}</p> : null}
      <SearchExperience initialCatalog={catalog} auxiliaryPlaces={auxiliaryPlaces} regionOptions={regionOptions} />

      <footer><p>{dict.footerNotice}</p><p>{fetchedAt.slice(0, 10)} {dict.footerBaseDate}</p></footer>
    </main>
  );
}
