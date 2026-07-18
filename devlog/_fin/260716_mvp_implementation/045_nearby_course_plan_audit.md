# Nearby and Course Plan Audit

- PASS — Haversine calculation and deterministic ordering are isolated from UI and never claim route time.
- PASS — Auxiliary POIs remain separate from tourism exact matches and are split by `petStatus=confirmed|unknown` before rendering.
- PASS — Geolocation is requested only on user action; denial activates a visible reference-place fallback without persisting coordinates.
- PASS — Course input is the current `MatchEvaluation[]`; any non-exact candidate fails closed instead of being filtered silently.
- PASS — Approximate courses expose coordinate distance and the absence of routing-time evidence.
- PASS — Tests activate distance order, denied location, confirmed/unknown separation, non-exact rejection, and no-minute disclosure.

VERDICT: PASS
