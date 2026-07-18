# Product Requirements Document — Pet Travel Planner

**Working title:** Pet Travel Planner  
**Product name:** 같이갈개<br>
**Status:** Competition MVP implemented and verified; post-MVP requirements are explicitly separated  
**Last updated:** 2026-07-16  
**Primary audience:** Korean pet guardians planning local trips

## 1. Problem Statement

Pet-friendly place lists answer whether a place is broadly pet friendly, but a guardian needs a stricter answer: whether the place works for this pet, under all required conditions, on this trip.

Current planning requires repeated manual checks across place descriptions, policy notes, maps, and phone calls. A place marked “pet friendly” may still reject a large dog, allow pets only outdoors, require a carrier, or have an outdated policy. Finding several compatible places for one outing multiplies that work.

## 2. Product Promise

> Select conditions once. See only places that satisfy every hard constraint, with the evidence shown beside each result.

The product is a constraint-safe search tool first. Course generation is a secondary use of already-qualified results, not a separate recommendation product.

## 3. Target Users

### Primary

- Guardians who must verify size, species, indoor access, equipment, or area restrictions before visiting
- Guardians planning a half-day or day trip with multiple stops
- Guardians who prefer fast, tap-based filtering over composing natural-language queries

### Secondary

- Travelers comparing regions before choosing a destination
- Guardians who want to save and reuse one pet profile across searches
- Tourism operators reviewing how their pet policy is interpreted

## 4. Canonical Glossary

| Term | Definition |
|---|---|
| Hard constraint | A condition that must be satisfied for a place to appear in guaranteed results. Safety, legal, accessibility, and admission requirements are always hard. |
| Preference | A desirable condition that may be explicitly relaxed by the user. |
| Exact match | Every selected hard constraint evaluates to `true`; no hard constraint is `false` or `unknown`. |
| Unknown | The source does not provide enough evidence to decide `true` or `false`. Unknown never counts as an exact match. |
| Partial match | At least one selected condition is unknown or false. Partial matches are never mixed into exact results. |
| AND matching | A place qualifies only when all selected hard constraints are exact matches. |
| Match proof | The source-backed reasons explaining why a place qualifies for each selected condition. |
| Minimal relaxation | The smallest set of user-marked preferences that can be removed to yield results. Hard constraints are never removed automatically. |
| Constraint-safe course | A sequence built only from places that passed the same hard-constraint query. |

## 5. Product Principles

- **Proof before popularity:** explain qualification before showing ratings or promotional content.
- **Unknown is not yes:** missing data cannot silently satisfy a requirement.
- **Tap before type:** common conditions are selectable chips; text search is supplementary.
- **One obvious next action:** every state has one primary action.
- **No fabricated certainty:** stale, inferred, and approximate information is labeled.
- **Core before breadth:** exact search quality takes priority over itinerary sophistication.

## 6. Solution Overview

The product combines a reusable pet profile with tap-based trip filters. It normalizes official pet-tourism descriptions into explicit conditions, performs strict AND matching, and shows a proof ledger on every result. When no exact match exists, it explains the blocking conditions and suggests only safe preference changes.

After exact results are available, the user may build a simple course from those results. The MVP orders the current exact-qualified places by coordinate distance, labels the order as approximate, and does not promise travel time. Duration, category, opening-hour, and routed optimization remain post-MVP extensions.

## 7. MVP Scope

### P0 — Required for the competition build

1. Pet size/weight-band selection as a protected admission constraint
2. Reference-place nearby ordering plus opt-in current-location recalculation
3. Tap-based condition groups with visible AND semantics
4. Dynamic exact-result count while filters change
5. Exact results separated from unknown or partial candidates
6. Match proof for every selected condition
7. Source excerpt and original-source link for every selected condition
8. Zero-result explanation and safe minimal relaxation
9. Nearby auxiliary places separated into confirmed and pet-policy-unknown groups
10. Exact-only approximate course with map handoff and no fabricated travel minutes
11. Installable responsive PWA shell and deterministic credential-free demo data

### P1 — Add only after P0 quality gates pass

1. Species, pet count, reusable local profiles, and profile editing
2. Region selection, saved places, and shareable filter state
3. Dedicated place detail with freshness and venue-contact actions
4. Half-day/day duration and desired stop-category choice
5. Opening-hour feasibility and structured infeasibility explanations
6. Verified external routing and stop replacement

### P2 — Future growth

- Venue-owner policy correction workflow
- User-submitted verification with moderation
- Reservation or inventory integrations
- Weather-aware planning
- Personalized ranking learned from saved/visited places

## 8. Functional Requirements

### FR-1 Pet Profile

- The user can search without signing in.
- The user can search without creating an account or saved profile.
- The selected size/weight band is treated as a protected hard constraint.
- The product does not infer an unselected size or weaken admission constraints during recovery.

### FR-2 Filter Selection

- Conditions are grouped into pet size, required access/equipment, and preferences.
- Common conditions are chips or segmented controls, not free-form prompts.
- The screen states “all selected conditions must match.”
- Active-condition count, visible AND separators, and exact-result count remain visible.
- Shareable URL state is a post-MVP capability.

### FR-3 Exact Matching

- Each hard constraint uses tri-state evaluation: `true`, `false`, or `unknown`.
- A place appears in exact results only if every hard constraint is `true`.
- Unknown and partial candidates are available only in a clearly separate disclosure.
- Sorting never promotes a partial match into the exact group.

### FR-4 Match Proof

- Each result names the selected conditions it satisfies.
- Derived values retain the source excerpt and source URL that produced them.
- Conflicting source statements lower confidence and prevent exact qualification.
- The expandable result proof shows source text separately from the product's match label.

### FR-5 No-Result Recovery

- The product explains that the current complete condition set yields no exact result.
- It proposes the smallest preference-only relaxation that yields at least one result.
- Hard constraints remain locked until the user explicitly edits them.
- If no safe relaxation exists, the UI keeps required conditions protected rather than displaying unsafe matches.

### FR-6 Result Evidence and Handoff

- Show name, category, address, selected-condition proof, source excerpt, and original-source link.
- Unknown values are separated from exact results, never hidden as affirmative values.
- Provide a map handoff for the generated order without claiming that the external map service is part of the tourism dataset.

### FR-7 Constraint-Safe Course

- Course candidates come only from one exact-match result set.
- The MVP uses the current exact result set without requalifying or supplementing it.
- Stops are ordered deterministically by coordinate distance from the reference point.
- If routing is unavailable, show approximate order only; do not show fabricated travel minutes.
- If no exact candidates exist, course creation remains disabled and explains that exact results are required.

### FR-8 Freshness and Trust

- Every fixture evidence item records its observation timestamp; live source modification and ingestion timestamps remain in the provider contract.
- Full current/aging/stale presentation is post-MVP.
- A freshness label describes data recency, not real-time venue confirmation.
- High-impact policies always include a venue-confirmation action.

## 9. User Stories

1. As a guardian of a large dog, I want to select the size once so that incompatible places never enter exact results.
2. As a guardian, I want to tap conditions instead of writing a sentence so that search is fast on mobile.
3. As a guardian, I want all selected conditions combined with AND so that one convenient condition cannot hide a failed admission rule.
4. As a guardian, I want to see why each place matched so that I can trust the result.
5. As a guardian, I want unknown information labeled separately so that I do not mistake missing data for permission.
6. As a guardian, I want policy source text and its interpretation separated so that I can verify ambiguous wording.
7. As a guardian, I want the result count to update as I tap filters so that I can understand which conditions are restrictive.
8. As a guardian, I want safe alternatives when no place matches so that I can recover without weakening essential conditions.
9. As a guardian, I want stale policies flagged so that I know when to call before traveling.
10. As a guardian, I want nearby exact matches so that I can plan locally.
11. As a guardian, I want confirmed nearby utilities separated from unknown-policy places so proximity is not mistaken for permission.
12. As a guardian, I want an approximate course made only from exact matches so that every stop remains compatible.
13. As a guardian, I want routing uncertainty disclosed rather than fabricated as travel time.
14. As a competition judge, I want to see official data transformed into a user decision so that the data contribution is evident.
15. As a competition judge, I want one end-to-end scenario with visible evidence so that implementation quality can be assessed quickly.

## 10. Acceptance Criteria

### Exact-search contract

- Given three hard constraints and a place with `true`, `true`, `unknown`, the place does not appear in exact results.
- Given three hard constraints and a place with `true`, `true`, `false`, the place does not appear in exact results.
- Given three hard constraints and a place with `true`, `true`, `true`, the place appears with three proof items.

### Safe relaxation contract

- Given zero results and one preference plus two hard constraints, only the preference may be suggested for removal.
- Given zero results and only hard constraints, no automatic relaxation is offered.

### Course contract

- Every course stop comes from the exact-match objects produced by the current query.
- A non-exact or unknown-policy tourism place is rejected from course construction.
- Without a route provider, no travel-time number is displayed.

### Trust contract

- Every interpreted policy value can be traced to raw source text or is marked unresolved.
- Source freshness is visible on place detail.
- API update cadence is never described as live venue status.

## 11. Success Measures

- Exact-match precision in a manually labeled evaluation set
- Percentage of displayed conditions with traceable source evidence
- Zero unsafe automatic relaxations in scenario tests
- Time from first interaction to first exact result
- Completion rate from exact results to course construction
- Judge-demo completion without hidden setup or manual data correction

## 12. Testing Decisions

The highest stable test seam is the normalized place record plus a query contract.

- Contract tests cover raw-to-normalized policy mapping.
- Table-driven tests cover tri-state AND matching and safe relaxation.
- Course tests cover candidate qualification, approximate mode, empty input, and non-exact rejection.
- One end-to-end scenario covers profile → filters → proof → no-result recovery → course.
- UI tests assert visible behavior and accessibility, not component internals.

## 13. Out of Scope for the Initial Build

- Real-time venue occupancy or policy guarantees
- Booking, payment, or reservation inventory
- Social feed, reviews, chat, or community moderation
- General AI itinerary generation unconstrained by exact matches
- Automatic relaxation of safety or admission requirements
- Native iOS and Android binaries unless the implementation phase explicitly selects them

## 14. Implementation Decisions

- Launch as a mobile-first responsive web/PWA unless a later architecture decision proves a native-only need.
- Keep deterministic normalization and matching separate from ambiguous text interpretation.
- Store raw source payloads and interpretation evidence so parsing can be audited and re-run.
- Treat course generation as a consumer of exact search, never an alternate qualification path.
- Keep the product name `같이갈개`; final iconography and submission artwork remain reversible.

## 15. Primary References

- [Korea Tourism Organization Pet Travel Service](https://www.data.go.kr/data/15135102/openapi.do) — official API catalog; accessed 2026-07-16.
- [Korea Tourism Organization Korean Tourism Information Service](https://www.data.go.kr/data/15101578/openapi.do) — official general tourism API catalog; accessed 2026-07-16.
- [2026 Pet Travel API operation changes](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004471) — official endpoint-change notice; accessed 2026-07-16.
