"use client";

import { useCallback, useEffect, useState } from "react";

type Review = { rating: number; comment: string; createdAt: string; mine?: boolean };
type Summary = { count: number; average: number | null };

const REVIEWER_KEY = "gg_reviewer_id";

function reviewerId(): string {
  try {
    const existing = localStorage.getItem(REVIEWER_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(REVIEWER_KEY, fresh);
    return fresh;
  } catch {
    return "anonymous-session";
  }
}

export function PlaceReviews({ placeId }: { placeId: string }) {
  const [summary, setSummary] = useState<Summary>({ count: 0, average: null });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(placeId)}/reviews?mine=${encodeURIComponent(reviewerId())}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setReviews(json.data.reviews ?? []);
        const mineReview = (json.data.reviews ?? []).find((review: Review) => review.mine);
        if (mineReview) {
          setRating(mineReview.rating);
          setComment(mineReview.comment);
        }
      }
    } catch {
      // Reviews are optional garnish; failures stay silent.
    }
  }, [placeId]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void load(); });
    return () => controller.abort();
  }, [load]);

  const submit = async () => {
    if (rating < 1) return;
    setStatus("saving");
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(placeId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: reviewerId(), rating, comment }),
      });
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setReviews(json.data.reviews ?? []);
        setStatus("saved");
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section style={{ margin: "8px 0 40px" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>
        ⭐ 방문 후기 {summary.count > 0 ? <span style={{ color: "var(--info)", fontSize: 14 }}>{summary.average} / 5 · {summary.count}건</span> : null}
      </h2>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star}점`}
            onClick={() => setRating(star)}
            style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", padding: 0, color: star <= rating ? "#f59e0b" : "var(--line-strong)", lineHeight: 1 }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 200))}
        placeholder="다녀온 이야기를 짧게 남겨주세요 (동반 조건, 아이 반응 등) — 익명으로 저장됩니다"
        rows={3}
        style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 10, padding: 10, fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={rating < 1 || status === "saving"}
          style={{ border: "none", background: rating < 1 ? "var(--line-strong)" : "var(--brand)", color: "#fff", borderRadius: 999, padding: "8px 18px", fontSize: 14, cursor: rating < 1 ? "default" : "pointer" }}
        >
          {status === "saving" ? "저장 중…" : "후기 등록"}
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{comment.length}/200</span>
        {status === "saved" ? <span style={{ fontSize: 12, color: "#16a34a" }}>등록되었습니다 (장소당 1건, 다시 쓰면 갱신)</span> : null}
        {status === "error" ? <span style={{ fontSize: 12, color: "var(--danger)" }}>저장에 실패했습니다</span> : null}
      </div>
      {reviews.length > 0 ? (
        <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map((review, index) => (
            <li key={index} style={{ padding: "10px 14px", background: review.mine ? "var(--brand-soft)" : "var(--surface-subtle)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14 }}>
              <strong style={{ color: "#f59e0b" }}>{"★".repeat(review.rating)}<span style={{ color: "var(--line-strong)" }}>{"★".repeat(5 - review.rating)}</span></strong>
              {review.mine ? <span style={{ fontSize: 11, color: "var(--info)", marginLeft: 6 }}>내 후기</span> : null}
              {review.comment ? <p style={{ margin: "4px 0 0", lineHeight: 1.5 }}>{review.comment}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "14px 0 0" }}>첫 후기의 주인공이 되어주세요 🐾</p>
      )}
    </section>
  );
}
