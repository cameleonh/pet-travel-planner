"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { AuxiliaryPlace } from "@/data/contracts";
import type { CatalogPage } from "@/data/catalog";
import type { RegionOption } from "@/domain/regions";
import { SearchExperience } from "@/features/search/SearchExperience";
import { dispatchHeroStrike } from "@/features/weather-hero/hero-events";
import type { HeroSimState } from "@/features/weather-hero/WeatherHeroCanvas";
import { useLang } from "@/i18n/LangContext";
import { LangToggle } from "@/i18n/LangToggle";

const HERO_VIDEO_URL = "/hero-dog-walk.mp4";

const WeatherHeroCanvas = dynamic(
  () => import("@/features/weather-hero/WeatherHeroCanvas").then((m) => m.WeatherHeroCanvas),
  { ssr: false, loading: () => null },
);

export function PageContent({ catalog, notice, fetchedAt, auxiliaryPlaces, regionOptions }: { catalog: CatalogPage; notice: string | null | undefined; fetchedAt: string; auxiliaryPlaces: AuxiliaryPlace[]; regionOptions: RegionOption[] }) {
  const { dict, lang } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [heroSim, setHeroSim] = useState<HeroSimState>("boot");
  const [simPaused, setSimPaused] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const simActive = heroSim === "active" && videoEnded;

  // The hero video is short (~3s); loop it for a minimum watch time before
  // the ocean simulation takes over, so the first impression isn't a blink.
  useEffect(() => {
    const timer = setTimeout(() => setVideoEnded(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    void video.play().catch(() => setVideoPlaying(false));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (simActive) {
      video.pause();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void video.play().catch(() => setVideoPlaying(false));
  }, [simActive]);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setVideoPlaying(false));
    else video.pause();
  };

  const toggleBackdrop = () => {
    if (simActive) setSimPaused((paused) => !paused);
    else toggleVideo();
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
        <WeatherHeroCanvas paused={simPaused || !videoEnded} onStateChange={setHeroSim} />
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
          <button type="button" className="hero-video-toggle" onClick={toggleBackdrop} aria-label={simActive ? (simPaused ? dict.heroSimPlay : dict.heroSimPause) : (videoPlaying ? dict.heroVideoPause : dict.heroVideoPlay)}>
            <span aria-hidden="true">{simActive ? (simPaused ? "▶" : "Ⅱ") : (videoPlaying ? "Ⅱ" : "▶")}</span>
          </button>
          {simActive ? (
            <span>{dict.heroSimCredit}</span>
          ) : (
            <a href="https://www.pexels.com/video/person-walking-with-a-dog-6231305/" target="_blank" rel="noreferrer">{dict.heroVideoCredit}</a>
          )}
        </div>
      </section>

      {notice ? <p role="status" className="notice global-notice">{notice}</p> : null}
      <SearchExperience initialCatalog={catalog} auxiliaryPlaces={auxiliaryPlaces} regionOptions={regionOptions} />

      <footer><p>{dict.footerNotice}</p><p>{fetchedAt.slice(0, 10)} {dict.footerBaseDate}</p></footer>
    </main>
  );
}
