"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  buildRecommendationQueue,
  getCompanionPrefsServerSnapshot,
  getCompanionPrefsSnapshot,
  pickRecommendation,
  setCompanionPrefs,
  subscribeCompanionPrefs,
  type CompanionCandidate,
} from "@/domain/companion";
import { getViewedHistorySnapshot, subscribeViewedHistory } from "@/domain/viewed-history";
import type { CompanionDogDriver } from "@/features/companion/dog-driver";
import { useLang } from "@/i18n/LangContext";
import { t, type Dictionary } from "@/i18n/dictionary";

const BUBBLE_FIRST_DELAY_MS = 6_000;
const BUBBLE_INTERVAL_MS = 18_000;
const HAPPY_DURATION_MS = 2_200;
const WALK_INTERVAL_MS = 17_000;
const WALK_DURATION_MS = 3_500;
const MASCOT_IDLE = "/gachi-galgae-mascot.png";
const MASCOT_HAPPY = "/gachi-galgae-mascot-ribbon.png";

type Bubble = { kind: "place" | "pet" | "tip"; text: string; meta?: string; href?: string };

function petLine(petCount: number, dict: Dictionary): string {
  const slot = ((Math.max(1, petCount) - 1) % 3);
  if (slot === 1) return dict.companionPet2;
  if (slot === 2) return dict.companionPet3;
  return dict.companionPet1;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas");
  try {
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    return gl !== null;
  } catch {
    return false;
  }
}

export function CompanionDog({ candidates }: { candidates: readonly CompanionCandidate[] }) {
  const { dict, lang } = useLang();
  const recent = useSyncExternalStore(subscribeViewedHistory, getViewedHistorySnapshot, getViewedHistorySnapshot);
  const prefs = useSyncExternalStore(subscribeCompanionPrefs, getCompanionPrefsSnapshot, getCompanionPrefsServerSnapshot);
  const queue = useMemo(() => buildRecommendationQueue(recent, candidates), [recent, candidates]);

  const [happy, setHappy] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [petAnnouncement, setPetAnnouncement] = useState("");
  const [dog3d, setDog3d] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const driverRef = useRef<CompanionDogDriver | null>(null);
  const happyRef = useRef(false);
  const stepRef = useRef(0);
  const happyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (happyTimerRef.current !== null) window.clearTimeout(happyTimerRef.current);
    };
  }, []);

  // Progressive 3D enhancement: only when motion is allowed and WebGL is
  // available; the illustrated PNG stays as the fallback in every other case.
  useEffect(() => {
    if (prefs.hidden || prefersReducedMotion() || !hasWebGL()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void (async () => {
      const { CompanionDogDriver } = await import("@/features/companion/dog-driver");
      const driver = await CompanionDogDriver.create(canvas);
      if (cancelled || !driver) {
        driver?.dispose();
        return;
      }
      driverRef.current = driver;
      setDog3d(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
      driverRef.current?.dispose();
      driverRef.current = null;
      setDog3d(false);
    };
  }, [prefs.hidden]);

  // Mood follows the pet reaction; idle otherwise.
  useEffect(() => {
    happyRef.current = happy;
    driverRef.current?.setMood(happy ? "happy" : "idle");
  }, [happy, dog3d]);

  // Occasional ambient wander.
  useEffect(() => {
    if (!dog3d || prefs.hidden || prefersReducedMotion()) return;
    const interval = window.setInterval(() => {
      if (happyRef.current) return;
      const driver = driverRef.current;
      if (!driver) return;
      driver.setMood("walk");
      window.setTimeout(() => {
        if (!happyRef.current) driverRef.current?.setMood("idle");
      }, WALK_DURATION_MS);
    }, WALK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [dog3d, prefs.hidden]);

  // Pause the GPU loop while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      const driver = driverRef.current;
      if (!driver) return;
      if (document.visibilityState === "visible") driver.resume();
      else driver.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Ambient place recommendations: only when visible and motion is allowed.
  useEffect(() => {
    if (prefs.hidden) return;
    if (prefersReducedMotion()) return;
    const showNext = () => {
      const item = pickRecommendation(queue, stepRef.current);
      stepRef.current += 1;
      if (!item) {
        setBubble({ kind: "tip", text: dict.companionTip });
        return;
      }
      setBubble({
        kind: "place",
        text: t(lang, "companionPlaceTitle", { name: item.name }),
        meta: item.region ? t(lang, item.confirmed ? "companionPlaceMeta" : "companionRecentMeta", { region: item.region }) : undefined,
        href: `/place/${item.id}`,
      });
    };
    const first = window.setTimeout(showNext, BUBBLE_FIRST_DELAY_MS);
    const interval = window.setInterval(showNext, BUBBLE_INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [prefs.hidden, queue, dict, lang]);

  const pet = useCallback(() => {
    setCompanionPrefs({ hidden: false, petCount: prefs.petCount + 1 });
    setHappy(true);
    const line = petLine(prefs.petCount + 1, dict);
    setPetAnnouncement(line);
    setBubble({ kind: "pet", text: line });
    if (happyTimerRef.current !== null) window.clearTimeout(happyTimerRef.current);
    happyTimerRef.current = window.setTimeout(() => setHappy(false), HAPPY_DURATION_MS);
  }, [prefs.petCount, dict]);

  const hide = useCallback(() => setCompanionPrefs({ ...prefs, hidden: true }), [prefs]);

  const show = useCallback(() => {
    setCompanionPrefs({ ...prefs, hidden: false });
    setBubble({ kind: "tip", text: dict.companionTip });
  }, [prefs, dict]);

  if (prefs.hidden) {
    return (
      <div className="companion-dog companion-dog-collapsed">
        <button type="button" className="companion-show" onClick={show} aria-label={dict.companionShow}>
          <span aria-hidden="true">🐾</span>
        </button>
      </div>
    );
  }

  return (
    <aside className="companion-dog" aria-label={dict.companionLabel}>
      <span className="sr-only" role="status" aria-live="polite">{petAnnouncement}</span>
      {bubble ? (
        <div className="companion-bubble" aria-hidden={bubble.kind === "pet" ? true : undefined}>
          <button type="button" className="companion-bubble-close" onClick={() => setBubble(null)} aria-label={dict.companionDismiss}>
            <span aria-hidden="true">×</span>
          </button>
          <strong className="companion-bubble-title">{bubble.text}</strong>
          {bubble.meta ? <small className="companion-bubble-meta">{bubble.meta}</small> : null}
          {bubble.href ? (
            <Link href={bubble.href} className="companion-bubble-cta">{dict.companionPlaceCta} →</Link>
          ) : null}
        </div>
      ) : null}
      <div className="companion-row">
        <button
          type="button"
          className={`companion-pet ${happy ? "is-happy" : "is-idle"}`}
          onClick={pet}
          aria-label={dict.companionPet}
        >
          <canvas ref={canvasRef} className="companion-canvas" data-ready={dog3d} aria-hidden="true" />
          {!dog3d ? (
            /* eslint-disable-next-line @next/next/no-img-element -- static mascot fallback */
            <img src={happy ? MASCOT_HAPPY : MASCOT_IDLE} alt="" width={96} height={96} />
          ) : null}
        </button>
        <button type="button" className="companion-hide" onClick={hide} aria-label={dict.companionHide}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </aside>
  );
}
