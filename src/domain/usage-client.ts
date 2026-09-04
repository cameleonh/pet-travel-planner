// Fire-and-forget usage beacon — never blocks or breaks the UI.
export type TrackKind =
  | "theme_apply"
  | "place_view"
  | "place_page_view"
  | "nightspot_3d_open"
  | "place_3d_open"
  | "plan_generate"
  | "region_search";

export function track(kind: TrackKind, detail = ""): void {
  try {
    const body = JSON.stringify({ kind, detail: detail.slice(0, 80) });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/usage", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // Tracking failures are always silent.
  }
}
