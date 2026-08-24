"use client";

import { useState } from "react";
import type { PlanPlace, RouteSegment } from "@/domain/plan";
import { useLang } from "@/i18n/LangContext";

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: PlanPlace[];
  routes: RouteSegment[];
  tripDate: string;
}

export function ShareTripModal({
  isOpen,
  onClose,
  places,
  routes,
  tripDate,
}: ShareTripModalProps) {
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalKm = routes.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
  const totalMinutes = routes.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);

  const shareText = `🐾 [같이갈개] ${tripDate} 반려견 동반 여행 코스
  
총 ${places.length}곳 방문 (예상 이동: ${totalKm.toFixed(1)}km, 약 ${Math.round(totalMinutes)}분)
${places.map((p, idx) => `${idx + 1}. ${p.name} (${p.address})`).join("\n")}

✨ 검증된 반려견 여행 코스 확인하기:
${typeof window !== "undefined" ? window.location.href : "https://pet-travel-planner.local"}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `[같이갈개] ${places[0]?.name || "반려견"} 여행 코스`,
          text: shareText,
          url: window.location.href,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

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
