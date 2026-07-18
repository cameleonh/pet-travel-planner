# User Flows and UX State Contract

**Product behavior source:** [PRD.md](../../PRD.md)  
**Visual system source:** [DESIGN.md](../../DESIGN.md)  
**Last updated:** 2026-07-16

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

The action is enabled whenever at least one exact result exists; the judged two-stop scenario is produced by explicitly removing the carrier preference.

```text
Exact results
  → “Build a course from these results”
  → Order current exact places from the reference coordinate
  → Show approximate course
  → Hand off to a map service for actual routing
```

### Course result

- The surrounding search state remains visible and the course reports each stop's proof count.
- Approximate mode uses “approximate order” and distance, never invented travel minutes.
- Duration, category, opening-hour feasibility, routed mode, and stop replacement are post-MVP.

## 9. Nearby Auxiliary Flow

- Confirmed pet-compatible utilities and unknown-policy places render in separate groups.
- Coordinate distance is explicitly labeled as straight-line rather than walking or driving distance.
- Current location is requested only after the user presses the recalculation button, is not persisted, and falls back to the named reference place when permission is unavailable.

## 10. UX State Matrix

The matrix below is the target-state contract. The verified MVP activates first use, no exact result, unknown policy, location denied, and exact-only approximate course states; refresh/cache, stale-policy, saved/share, and full infeasibility states remain post-MVP.

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

All changing result counts and error messages use appropriate live-region announcements for assistive technology.

## 11. Navigation and Back Behavior

- System/browser back returns to the prior result position and preserves filters.
- Opening a filter sheet does not create an unrecoverable navigation state.
- Mobile sheets allow swipe dismissal and a visible close action.
- Deep links reopen the matching search or place when possible.

## 12. Analytics Events

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

Do not send precise coordinates, pet names, or free-form policy text to general analytics.

## 13. Accessibility Acceptance

- All tap targets are at least 44×44 CSS pixels.
- Filter states have text/checkmark equivalents and keyboard focus.
- Map results have a complete list alternative.
- Bottom sheets trap focus only while open and restore focus on close.
- Korean text preserves word integrity and supports 200% zoom.
- Reduced-motion preference disables nonessential movement.
- No result or error state ends without a recovery action.
