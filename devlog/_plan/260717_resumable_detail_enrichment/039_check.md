# Phase 3 Check — Endpoint-Specific Quota

- `areaBasedList2` probe: three requests spaced 1.2 seconds apart all returned HTTP 200 / provider code 0000.
- `detailPetTour2` probe: one request returned HTTP 429 with no provider envelope.
- Full sync with pacing and one retry: HTTP 429 after retry before any checkpoint publication.
- Conclusion: base-list traffic is available, while the detail operation's allowance remains exhausted. This is not a request-burst defect.
- SQLite latest success remains run 2 / snapshot 2 / fetched 100 / pending 9,664; no attempted run replaced it.
- The provider now supports deterministic pacing and one transient HTTP 429 retry, covered by 20/20 focused provider tests plus typecheck and lint.
