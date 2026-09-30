"use client";

import { useEffect, useState } from "react";
import type { PlanPlace, RouteSegment } from "@/domain/plan";
import { buildTripShareText, summarizeTripRoutes, type ShareableTrip } from "@/domain/trip-sharing";
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

type LinkStatus = "idle" | "creating" | "ready" | "failed";
type LinkResult = { requestBody: string; retryCount: number; status: Exclude<LinkStatus, "idle" | "creating">; url?: string };

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
  const [copiedLinkKey, setCopiedLinkKey] = useState("");
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const plan: ShareableTrip = {
    tripDate,
    departure: departureTime ?? "09:00",
    arrival: finalArrival ?? null,
    places: places.map((place) => ({
      name: place.name,
      address: place.address,
      policySourceText: place.policySourceText,
      policySourceUrl: place.policySourceUrl ?? null,
      policyObservedAt: place.policyObservedAt ?? null,
      dwellMinutes: place.dwellMinutes ?? null,
      coordinates: place.coordinates,
      operatingHours: place.operatingHours ?? null,
      plannedVisitAt: place.plannedVisitAt ?? null,
      visitWindowStatus: place.visitWindowStatus ?? "unknown",
      closingDayChecked: place.closingDayChecked ?? false,
    })),
    routes: routes.map((route) => ({
      fromName: route.fromName,
      toName: route.toName,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      routeMode: route.routeMode,
    })),
  };
  const requestBody = JSON.stringify({
    plan: {
      tripDate: plan.tripDate,
      departure: plan.departure,
      arrival: plan.arrival,
      places: plan.places.map((place) => ({
        name: place.name,
        address: place.address,
        policySourceText: place.policySourceText,
        policySourceUrl: place.policySourceUrl,
        policyObservedAt: place.policyObservedAt,
        dwell: place.dwellMinutes,
        coordinates: place.coordinates,
        operatingHours: place.operatingHours,
        plannedVisitAt: place.plannedVisitAt,
        visitWindowStatus: place.visitWindowStatus,
        closingDayChecked: place.closingDayChecked,
      })),
      routes: plan.routes,
    },
  });
  const requestKeyMatches = linkResult?.requestBody === requestBody && linkResult.retryCount === retryCount;
  const linkStatus: LinkStatus = requestKeyMatches ? linkResult.status : "creating";
  const shortUrl = requestKeyMatches && linkResult.status === "ready" ? linkResult.url ?? null : null;
  const linkCopied = Boolean(shortUrl && copiedLinkKey === `${requestBody}:${retryCount}`);
  const routeSummary = summarizeTripRoutes(plan.routes);
  const shareText = buildTripShareText(plan, shortUrl ?? undefined);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    void fetch("/api/plans/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("SHARE_LINK_FAILED");
        const json = await response.json();
        const path = json.success && typeof json.data?.url === "string" ? json.data.url : "";
        if (!/^\/p\/[a-z2-9]{6}$/.test(path)) throw new Error("INVALID_SHARE_LINK");
        if (disposed) return;
        const url = `${window.location.origin}${path}`;
        setLinkResult({ requestBody, retryCount, status: "ready", url });
      })
      .catch(() => {
        if (!disposed) setLinkResult({ requestBody, retryCount, status: "failed" });
      });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, requestBody, retryCount]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleLinkCopy = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      const copiedKey = `${requestBody}:${retryCount}`;
      setCopiedLinkKey(copiedKey);
      window.setTimeout(() => setCopiedLinkKey((current) => current === copiedKey ? "" : current), 2500);
    } catch {
      setCopiedLinkKey("");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `[같이갈개] ${places[0]?.name || "반려견"} 여행 코스`,
          text: shareText,
          ...(shortUrl ? { url: shortUrl } : {}),
        });
      } catch {}
    } else {
      await handleCopy();
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setLinkResult(null);
    setCopied(false);
    setCopiedLinkKey("");
    onClose();
  };

  const routeSummaryLabel = routeSummary.totalRoadDistanceKm !== null && routeSummary.totalRoadDurationMinutes !== null
    ? `${routeSummary.totalRoadDistanceKm.toFixed(1)}km · 약 ${Math.round(routeSummary.totalRoadDurationMinutes)}분`
    : routeSummary.hasUnverifiedRoute
      ? "일부 구간의 도로 이동시간 확인 필요"
      : "이동 구간 없음";

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
          <button type="button" className="pet-modal-close" onClick={handleClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="share-preview-box">
          <div className="share-badge">🐾 같이갈개 여행 코스</div>
          <h4 className="share-trip-title">{tripDate} 반려견 동반 여행</h4>
          <p className="share-trip-meta">
            {places.length}곳 · {routeSummaryLabel}
          </p>
          <ol className="share-stop-list">
            {places.map((place) => (
              <li key={place.id}>
                <strong>{place.name}</strong>
                <small>{place.address}</small>
                <small>예상 방문 {place.plannedVisitAt ?? "시간 미확인"} · {place.visitWindowStatus === "within-hours" ? "기재된 이용시간 안" : place.visitWindowStatus === "outside-hours" ? "이용시간 벗어남" : place.visitWindowStatus === "closed-day" ? "등록된 휴무일" : "운영시간상 미확인"}</small>
                {place.policySourceUrl ? (
                  <small>{place.policySourceText.slice(0, 100)}{place.policySourceText.length > 100 ? "…" : ""} · KTO 정보 {place.policyObservedAt?.slice(0, 10) ?? "관측일 미확인"}</small>
                ) : <small>반려견 동반 조건은 방문 전 직접 확인</small>}
                <small>
                  {place.operatingHours?.useTime ? `이용시간 ${place.operatingHours.useTime}` : "이용시간 확인 필요"}
                  {place.operatingHours?.restDate ? ` · 휴무 ${place.operatingHours.restDate}` : " · 휴무 확인 필요"}
                </small>
              </li>
            ))}
          </ol>
        </div>

        {linkStatus === "ready" && shortUrl ? (
          <div style={{ margin: "12px 0", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              🔗 {shortUrl}
            </span>
            <button type="button" onClick={() => void handleLinkCopy()} style={{ border: "1px solid #86efac", background: linkCopied ? "#dcfce7" : "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              {linkCopied ? "✓ 복사됨" : "링크 복사"}
            </button>
          </div>
        ) : linkStatus === "creating" ? (
          <p role="status" style={{ fontSize: 12, color: "#64748b", margin: "8px 0" }}>공유 링크 만드는 중…</p>
        ) : linkStatus === "failed" ? (
          <div role="status" style={{ margin: "10px 0", padding: "10px 12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, fontSize: 12, color: "#9a3412" }}>
            <p style={{ margin: 0 }}>공유 링크를 만들지 못했어요. 코스 내용은 아래 버튼으로 복사해 공유할 수 있습니다.</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} style={{ marginTop: 8, border: "1px solid #fdba74", background: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
              링크 다시 만들기
            </button>
          </div>
        ) : null}

        <div className="share-actions-row">
          <button type="button" className="btn-kakao-share" onClick={() => void handleNativeShare()}>
            📤 {lang === "ko" ? "메시지·링크로 공유" : lang === "zh" ? "通过消息/链接分享" : "Share via Messages"}
          </button>
          <button type="button" className="btn-copy-link" onClick={() => void handleCopy()}>
            📋 {copied ? (lang === "ko" ? "✓ 복사 완료!" : "✓ Copied!") : lang === "ko" ? "코스 텍스트 복사" : "Copy Itinerary"}
          </button>
        </div>
      </div>
    </div>
  );
}
