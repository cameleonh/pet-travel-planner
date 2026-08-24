# User Flows and UX State Contract

**Product behavior source:** [PRD.md](../../PRD.md)
**Visual system source:** [DESIGN.md](../../DESIGN.md)
**Last updated:** 2026-08-08

## 1. Information Architecture

The verified MVP is one responsive, keyboard-accessible page with four sequential regions: clickable conditions, exact results and proof, nearby auxiliary places, and an exact-only course. Saved objects, reusable profiles, a dedicated detail route, and map/list navigation are post-MVP capabilities.

## 2. First Value Flow

```text
Open service
  → See the deterministic sample dataset and common condition controls
  → Select a pet size and required/preferred conditions
  → See exact-result count
  → Open one result and inspect match proof
  → Optionally inspect nearby places or build a course from exact results
```

Rules:

- Do not require account creation before search.
- Do not require a complete pet profile before first value.
- Ask for location permission only after “Near me” is tapped and explain its use first.
- One primary action per screen.

## 3. Pet Constraint Flow

```text
Search page
  → Select small / medium / large dog size band
  → Toggle required conditions
  → Toggle an explicitly labeled preference
  → Observe the exact count immediately
```

- Size and required admission conditions are hard constraints.
- Optional comfort conditions are preferences and remain separately labeled.
- Saved/reusable profiles are post-MVP and are not implied by the current controls.

## 4. Search Flow

### Screen anatomy

```text
[Pet size]
[All selected conditions must match]

Pet       [Small] [Medium] [Large]
Required  [Leash] [Outdoor] [Indoor]
Preferred [Carrier allowed]

[N exact matches]
```

### Interaction rules

- Tapping a chip updates the exact-result count immediately.
- Selected chips show checkmark, fill, and text state; color alone is insufficient.
- The implemented condition vocabulary stays intentionally small and visible.
- The AND rule remains visible near the filters and count.
- Natural-language input is not required in the MVP.

## 5. Results Flow

### Exact result card

Each card shows:

- Place name, type, and address
- “All 4 required conditions match” summary
- Up to three proof chips and “See all”
- One expandable source-proof row per selected condition

Popularity, reviews, or promotional labels must not outrank match proof.

### Result grouping

- Default group: exact matches only
- Secondary disclosure: “Places needing confirmation” for unknown conditions
- Partial candidates never appear interleaved with exact matches.
- Sorting operates inside the selected group.

## 6. Inline Proof Flow

```text
Result card
  → Expand “selected-condition evidence”
      → One row per selected condition
          condition / source excerpt / original-source link
```

- Official wording and product match labels remain visually separate.
- Missing or conflicting values become `unknown` and stay outside exact results.
- A dedicated detail/contact experience remains post-MVP.

## 7. Zero-Result Flow

```text
No exact matches
  → Explain: “Your required conditions are still protected.”
  → Show blocking-condition summary
  → If a preference-only relaxation exists:
       “Remove ‘parking preferred’ to see 3 places”
       [Apply this change]
  → Otherwise:
       [Review required conditions]
```

- Never suggest removing a hard safety, legal, accessibility, or admission condition.
- Do not use guilt or urgency language.
- Applying a suggestion shows the exact filter delta before the result list changes.
- Constraint controls remain available for explicit further editing.

## 8. Course Flow

The next-step action stays available while browsing, but it is enabled only after at least two exact places are saved. Optional regional and nearby choices are revealed after place selection is completed; the travel board is revealed after the course is confirmed.

```text
Exact results
  → Save at least two places
  → “Places selected · Optional extras”
  → Review optional regional and nearby choices
  → “Build a course from these results”
  → Order current exact places from the reference coordinate
  → Show approximate course
  → Hand off to a map service for actual routing
```

### Course result

- The surrounding search state remains visible and the course reports each stop's proof count.
- Approximate mode uses “approximate order” and distance, never invented travel minutes.
- Duration, category, opening-hour feasibility, routed mode, and stop replacement are post-MVP.

### Course traffic context (Phase 2E)

When traffic data is available, the course result gains a context strip below the stop list:

```text
Approximate course
  → [Traffic context strip]
      ├─ 정체 12구간 / 지체 8구간 (관측 14:32)
      ├─ ⚠ 폭우 경보 — 경부선 천안~옥천
      └─ 🚫 전면통제 — 영동IC 진출로
  → [Route cameras button]
```

- Traffic context is read-only information; it never removes or reorders stops.
- A closure alert does not disable the course; it warns the user to verify.
- Missing traffic data produces no strip — the course appears as in the MVP.
- Observation timestamps are shown; traffic data is never presented as predictive.

## 9. Route Camera Flow (Phase 2E)

```text
Course result
  → "이 길의 카메라 보기"
  → Load CCTV list ordered by route sequence
  → Camera list panel
      ├─ 1. 안성 IC (상행)  [썸네일]
      ├─ 2. 천안 JC (상행)  [썸네일]
      └─ 3. 옥천 IC (상행)  [썸네일]
  → Tap a camera
  → CCTV stream view
```

### Camera list rules

- Cameras are ordered by projected travel sequence along the course, not by distance from origin or catalog ID.
- Each entry shows the camera name, direction label, and a live thumbnail or placeholder.
- The list is available only within an active course; there is no standalone camera browser.
- If no cameras match the route corridor, the button is absent rather than showing an empty state.

### CCTV stream view

```text
CCTV stream view
  → <video> with live stream
  → [AI 차량 감지] toggle (off by default)
  → Camera name, direction, observation time
```

- The stream URL is resolved through a server proxy; the client never sees provider credentials.
- If the stream fails to load, show "스트림 일시 중단" with a button to the next camera.
- The video element has `crossorigin="anonymous"` for canvas access when CORS is supported by the provider.

## 10. AI Vehicle Detection Flow (Phase 2E)

```text
CCTV stream view
  → Tap [AI 차량 감지] toggle
  → Loading: "AI 모델 로드 중…" (first time only, ~2-5s)
  → Detection overlay activates
      ├─ Bounding boxes on moving vehicles
      ├─ Count badge: "AI 추정 이동 23대 / 정지 5대"
      ├─ ROI selector: [전체] [상행] [하행]
      └─ Inference time: "추론 87ms"
  → Toggle off to stop detection
```

### Detection rules

- Detection is never auto-started; the user must explicitly toggle it on.
- The first activation lazy-loads TensorFlow.js and the COCO-SSD model (~1MB) via dynamic import.
- The video keeps playing normally if detection is off or fails to load.
- The count badge always shows the "AI 추정" label; it is never presented as official traffic volume.
- ROI filtering lets the user restrict counting to a specific lane direction; the default is the full frame.
- Detection results exist only in client state for the open session; they are discarded on navigation.
- If inference errors occur mid-stream, the last successful count is shown with a stale indicator until the next successful frame.

## 11. Nearby Auxiliary Flow

- Confirmed pet-compatible utilities and unknown-policy places render in separate groups.
- Coordinate distance is explicitly labeled as straight-line rather than walking or driving distance.
- Current location is requested only after the user presses the recalculation button, is not persisted, and falls back to the named reference place when permission is unavailable.

## 12. UX State Matrix

The matrix below is the target-state contract. The verified MVP activates first use, no exact result, unknown policy, location denied, and exact-only approximate course states; refresh/cache, stale-policy, saved/share, and full infeasibility states remain post-MVP. Phase 2E adds traffic-context, CCTV stream, and AI detection states.

| State | Meaning | Primary action | Required message |
|---|---|---|---|
| First use | No profile or search yet | Start filtering | “Choose what your pet needs.” |
| Loading results | Known card structure is pending | None | Result-card skeletons; keep active filters visible |
| Refreshing | Existing results are being updated | Continue browsing | Old results remain with subtle refresh state |
| No exact result | Constraints yield zero places | Apply safe preference change or change region | Hard conditions remain protected |
| Unknown policy | Source cannot decide one condition | Contact venue | Name the missing condition |
| Stale policy | Source modification exceeds threshold | Contact venue | Recency warning, not a real-time claim |
| API failure with cache | Refresh failed; prior snapshot exists | Retry | Show snapshot freshness |
| API failure without cache | No usable result data | Retry | Explain temporary retrieval failure |
| Course infeasible | No safe sequence fits | Adjust one blocking input | Name the blocking input |
| Location denied | Nearby search cannot access location | Choose region | Explain manual alternative |
| Traffic unavailable | Traffic provider unreachable or no data | Continue without traffic | No traffic strip; course appears as MVP |
| Road closure alert | Full closure on a course segment | Verify before departure | Closure type, road name, observation time |
| CCTV stream failure | Stream URL resolution or playback failed | Try next camera | "스트림 일시 중단" |
| AI model loading | TensorFlow.js model downloading on first activation | Wait or cancel | "AI 모델 로드 중…" with progress |
| AI inference error | Detection failed for current frame | None (auto-retry next frame) | Show last count with stale indicator or "분석 중" |

All changing result counts and error messages use appropriate live-region announcements for assistive technology.

## 13. Navigation and Back Behavior

- System/browser back returns to the prior result position and preserves filters.
- Opening a filter sheet does not create an unrecoverable navigation state.
- Mobile sheets allow swipe dismissal and a visible close action.
- Deep links reopen the matching search or place when possible.
- Closing a CCTV stream view returns to the camera list; closing the camera list returns to the course result.

## 14. Analytics Events

Collect behavior needed to validate the product, not sensitive raw location.

| Event | Key properties |
|---|---|
| `search_started` | region mode, profile present |
| `filter_changed` | condition key, hard/preference, result-count delta |
| `exact_result_opened` | place type, selected-condition count, freshness state |
| `proof_expanded` | condition key, evidence class |
| `relaxation_shown` | removable preference count, projected results |
| `relaxation_applied` | removed preference keys, result count |
| `course_requested` | duration, stop categories, mobility mode |
| `course_failed` | blocking reason |
| `venue_contact_tapped` | freshness state, unresolved-condition count |
| `traffic_context_shown` | congestion sections, closure count, weather alert present |
| `route_cameras_opened` | camera count, route corridor |
| `cctv_stream_opened` | camera name, stream source provider |
| `cctv_stream_failed` | camera name, failure reason |
| `ai_detection_toggled` | enabled/disabled, model load time |
| `ai_detection_result` | total count, moving count, inference time |

Do not send precise coordinates, pet names, free-form policy text, CCTV video frames, or AI detection frame data to general analytics.

## 15. Accessibility Acceptance

- All tap targets are at least 44×44 CSS pixels.
- Filter states have text/checkmark equivalents and keyboard focus.
- Map results have a complete list alternative.
- Bottom sheets trap focus only while open and restore focus on close.
- Korean text preserves word integrity and supports 200% zoom.
- Reduced-motion preference disables nonessential movement.
- No result or error state ends without a recovery action.
