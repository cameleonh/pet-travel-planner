"use client";

import { useEffect, useRef, useState } from "react";
import type { AuxiliaryPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import type { RegionOption } from "@/domain/regions";
import { SearchExperience } from "@/features/search/SearchExperience";
import { dispatchHeroStrike } from "@/features/weather-hero/hero-events";
import { useLang } from "@/i18n/LangContext";
import { LangToggle } from "@/i18n/LangToggle";
import { AccessibilityToggle } from "@/features/accessibility/AccessibilityToggle";

const HERO_VIDEO_URL = "/hero-dog-walk.mp4";

export function PageContent({ catalog, notice, fetchedAt, auxiliaryPlaces, regionOptions, placeCounts }: { catalog: CatalogPage; notice: string | null | undefined; fetchedAt: string; auxiliaryPlaces: AuxiliaryPlace[]; regionOptions: RegionOption[]; placeCounts: Record<string, number> }) {
  const { dict, lang } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  // The video plays once (~3s); onEnded triggers the photo transition.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      void videoRef.current?.play().catch(() => setVideoPlaying(false));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setVideoPlaying(false));
    else video.pause();
  };

  const toggleBackdrop = () => {
    toggleVideo();
  };
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label={dict.homeLabel} onClick={() => dispatchHeroStrike()}><span aria-hidden="true">같이</span>갈개</a>
        <span aria-hidden="true" style={{ display: "inline-flex", gap: 2, alignItems: "center", marginLeft: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static mascot assets */}
          <img src="/gachi-galgae-mascot-walk.png" alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
          {/* eslint-disable-next-line @next/next/no-img-element -- static mascot assets */}
          <img src="/gachi-galgae-mascot.png" alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
          {/* eslint-disable-next-line @next/next/no-img-element -- static mascot assets */}
          <img src="/gachi-galgae-mascot-ribbon.png" alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <AccessibilityToggle />
          <LangToggle />
        </span>
      </header>

      <section className="intro" id="top">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onPlay={() => setVideoPlaying(true)}
          onPause={() => setVideoPlaying(false)}
          onEnded={() => setVideoEnded(true)}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        {videoEnded ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: -2,
              background: "#0a0f0a",
              opacity: 1,
              transition: "opacity 2.5s ease-in",
            }}
          />
        ) : null}
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
          <button type="button" className="hero-video-toggle" onClick={toggleBackdrop} aria-label={videoPlaying ? dict.heroVideoPause : dict.heroVideoPlay}>
            <span aria-hidden="true">{videoPlaying ? "Ⅱ" : "▶"}</span>
          </button>
          <a href="https://www.pexels.com/video/person-walking-with-a-dog-6231305/" target="_blank" rel="noreferrer">{dict.heroVideoCredit}</a>
        </div>
      </section>

      {notice ? <p role="status" className="notice global-notice">{notice}</p> : null}
      <SearchExperience initialCatalog={catalog} auxiliaryPlaces={auxiliaryPlaces} regionOptions={regionOptions} placeCounts={placeCounts} />

      <footer><p>{dict.footerNotice}</p><p>{dict.footerBaseDate} {fetchedAt.slice(0, 10)}</p></footer>
    </main>
  );
}
