"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanPlace, RouteSegment } from "@/domain/plan";
import { useLang } from "@/i18n/LangContext";

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: PlanPlace[];
  routes: RouteSegment[];
  tripDate: string;
  departureTime?: string;
  finalArrival?: string | null;
}

export function ShareTripModal({
  isOpen,
  onClose,
  places,
  routes,
  tripDate,
  departureTime,
  finalArrival,
}: ShareTripModalProps) {
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  const totalKm = routes.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
  const totalMinutes = routes.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);

  useEffect(() => {
    if (!isOpen || shortUrl) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void fetch("/api/plans/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: {
            tripDate,
            departure: departureTime ?? "09:00",
            arrival: finalArrival ?? null,
            places: places.map((p) => ({ name: p.name, address: p.address, dwell: p.dwellMinutes ?? null })),
            routes: routes.map((r) => ({ fromName: r.fromName, toName: r.toName, distanceKm: r.distanceKm, durationMinutes: r.durationMinutes })),
          },
        }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return;
          const json = await res.json();
          if (json.success && json.data?.url) {
            setShortUrl(`${typeof window !== "undefined" ? window.location.origin : "https://gggo.blog"}${json.data.url}`);
          }
        })
        .catch(() => {});
    });
    return () => controller.abort();
  }, [isOpen, shortUrl, tripDate, departureTime, finalArrival, places, routes]);

  const shareLink = shortUrl ?? (typeof window !== "undefined" ? window.location.href : "https://gggo.blog");

  const shareText = `🐾 [같이갈개] ${tripDate} 반려견 동반 여행 코스

총 ${places.length}곳 방문 (예상 이동: ${totalKm.toFixed(1)}km, 약 ${Math.round(totalMinutes)}분)
${places.map((p, idx) => `${idx + 1}. ${p.name} (${p.address})`).join("\n")}

✨ 검증된 반려견 여행 코스 확인하기:
${shareLink}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable
    }
  }, [shareText]);

  const handleLinkCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // clipboard unavailable
    }
  }, [shareLink]);

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `[같이갈개] ${places[0]?.name || "반려견"} 여행 코스`,
          text: shareText,
          url: shareLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
      <div className="pet-modal-card share-card">
        <div className="pet-modal-header">
          <div className="pet-modal-title-wrap">
            <span className="pet-modal-icon">📲</span>
            <h3 id="share-modal-title" className="pet-modal-title">
              {lang === "ko" ? "여행 코스 공유하기" : "Share Travel Route"}
            </h3>
          </div>
          <button type="button" className="pet-modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="share-preview-box">
          <div className="share-badge">🐾 같이갈개 검증 코스</div>
          <h4 className="share-trip-title">{tripDate} 댕댕이 힐링 투어</h4>
          <p className="share-trip-meta">
            총 {places.length}개 장소 · {totalKm.toFixed(1)}km
          </p>
          <ol className="share-stop-list">
            {places.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                <small>{p.address}</small>
              </li>
            ))}
          </ol>
        </div>

        {shortUrl ? (
          <div style={{ margin: "12px 0", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              🔗 {shortUrl}
            </span>
            <button type="button" onClick={() => void handleLinkCopy()} style={{ border: "1px solid #86efac", background: linkCopied ? "#dcfce7" : "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              {linkCopied ? "✓ 복사됨" : "링크 복사"}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "8px 0" }}>링크 생성 중…</p>
        )}

        <div className="share-actions-row">
          <button type="button" className="btn-kakao-share" onClick={handleNativeShare}>
            🟡 {lang === "ko" ? "카카오톡 / 메시지 공유" : "Share via Kakao / Messages"}
          </button>
          <button type="button" className="btn-copy-link" onClick={handleCopy}>
            📋 {copied ? (lang === "ko" ? "✓ 복사 완료!" : "✓ Copied!") : lang === "ko" ? "코스 텍스트 복사" : "Copy Itinerary"}
          </button>
        </div>
      </div>
    </div>
  );
}
