# Product Requirements Document — Pet Travel Planner

**Working title:** Pet Travel Planner
**Product name:** 같이갈개<br>
**Tagline:** 함께라서 더 가치 있는 여행, 같이갈개
**Status:** Competition MVP implemented and verified; Phase 2 multi-source data integration in progress
**Last updated:** 2026-08-09
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
- [2026 Pet Travel API operation changes](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004471) ??official endpoint-change notice; accessed 2026-07-16.

## 16. Operator Portal and Closure Semantics (P1)

The first operator workflow is intentionally small: an operator signs in with Google, claims a tourism place, and after approval records regular closed weekdays and temporary closure dates. Operators do not enter daily open status. A missing closure record is displayed as “no registered closure” and never as a guaranteed-open signal.

Roles are `traveler`, `pending_owner`, `owner`, and `admin`. Google identity proves account ownership but does not grant control of a place by itself. A claim must be approved before closure data can be edited. Every closure record keeps the operator, timestamp, reason, and active/inactive history so the public result can show provenance and last update time.

Required routes:

- `/owner/login` — Google OAuth entry point
- `/owner/places` — claim status and closure management
- `/api/places/:placeId/closures` — public closure summary with an explicit “visit confirmation recommended” interpretation

## 17. Separate Support-Facility Data (P1)

Animal hospitals, pet-supply stores, and pet-friendly restaurants/cafés are auxiliary trip-support data, not tourism destinations and not pet-admission evidence. They must remain behind a separate user selector so they cannot be confused with exact tourism matches.

**Status:** Implemented via Kakao Local API (`KAKAO_REST_API_KEY`).

- Animal hospitals: use the [Kakao Local API](https://developers.kakao.com/docs/ko/local/dev-guide) category search with `category_group_code=HP8` (`/api/veterinary`); retain hospital name, address, phone, coordinates, distance, map URL, and observation time.
- Pet-supply stores: use the Kakao Local API keyword search with the keyword `반려동물용품` (`/api/pet-shops`); retain store name, address, phone, coordinates, map URL, and observation time.
- Pet-friendly restaurants and cafés: use the Kakao Local API keyword search (`/api/pet-restaurants`) merging four keywords — `반려동물동반 식당`, `강아지동반 식당`, `반려동물동반 카페`, `강아지동반 카페` — with duplicate results de-duplicated; retain name, address, phone, coordinates, category, map URL, and observation time.

Support-facility records are shown in a three-column "nearby services" grid (restaurants/cafés, veterinary hospitals, pet shops) that appears only after the user has entered a region. Each entry links to Kakao Maps for directions and provides a tap-to-call phone link when available. Product price, inventory, and delivery are explicitly out of scope.

The previous plan to use the Ministry of the Interior and Safety animal hospital lookup API has been superseded by the Kakao Local API, which provides phone numbers, map links, and category grouping that the ministry API lacks.

## 18. Phase 2 — Multi-Source Data Integration

**Status:** Design in progress; API analysis complete, implementation pending
**Last updated:** 2026-08-05
**Goal:** Expand from a single-source pet-tourism lookup into a multi-dimensional travel planning surface by integrating additional Korea Tourism Organization OpenAPI services that share the same `contentId` identifier or `areaCode`/`sigunguCode` regional system.

The MVP proves that official pet-policy text can become an auditable admission decision. Phase 2 enriches that decision with contextual data — accessibility, congestion forecasting, camping, trails, festivals, and regional analytics — so that a guardian can answer "can I go here, and should I?"

### Design Principles for Integration

- **Pet safety remains first:** no new data source may weaken the existing tri-state exact-match contract or promote unknown records to qualified results.
- **Separate quota budgets:** each OpenAPI service has its own daily 1,000-request limit; ingestion schedules must not interfere with the existing Pet Tour sync.
- **ContentId where possible:** sources that share the standard `contentId` join directly to existing place rows; sources with proprietary identifiers use name-and-region mapping with explicit confidence labels.
- **Context, not admission:** congestion forecasts, visitor patterns, and accessibility metadata inform the user's judgment but never override pet-policy constraints.
- **One source of truth per dimension:** each enrichment type (accessibility, congestion, camping, trails) has exactly one canonical provider; fallback or duplicate providers are out of scope.

### Phase 2A — Direct Enrichment (contentId-shared)

These APIs share the standard TourAPI `contentId` and join directly to existing place rows.

| Source | Service ID | Data added | Priority |
|---|---|---|---|
| Barrier-free tourism | `KorWithService2` | Wheelchair access, disabled restroom, elevator, assistance-dog admission, stroller, nursing room — 28 fields across 4 disability groups | P2A-1 |
| GoCamping | `GoCamping` | Pet-admission flag (`animalCmgCl`), camping type (glamping/caravan/general), facility list, reservation URL, site counts | P2A-2 |
| Congestion forecast | `TatsCnctrRateService` | 30-day forward `cnctrRate` per tourist site — "quiet day" / "busy day" badge | P2A-3 |

### Phase 2B — Discovery Expansion

These APIs expand the catalog beyond pet-tourism-only listings or add auxiliary context.

| Source | Service ID | Data added | Priority |
|---|---|---|---|
| General tourism (Korean) | `KorService2` | Festivals (`searchFestival2`), nearby places (`locationBasedList2`), images (`detailImage2`), `chkpet` field for non-pet-API places | P2B-1 |
| Related tourist sites | `TarRlteTarService1` | "People who visit X also visit Y" ranked associations with category labels | P2B-2 |
| Visitor volume | `DataLabService` | Daily visitor counts by region with resident/visitor/foreigner breakdown and weekday patterns | P2B-3 |

### Phase 2C — Experience Enhancement

| Source | Service ID | Data added | Priority |
|---|---|---|---|
| Durunubi trails | `Durunubi` | Walking/cycling courses with difficulty level, distance, duration, and GPX route data for dog-walking route planning | P2C-1 |
| Tourism photo gallery | `PhotoGalleryService1` | Official KTO-certified high-quality tourism photos for place cards and detail views | P2C-2 |
| Regional analytics | `AreaTarDivService` / `AreaTarDemDsService` | Monthly regional diversity (age groups, international visitors) and demand intensity (lodging ratio, spending) for destination scoring | P2C-3 |

### Phase 2D — Multilingual Expansion

| Source | Service ID | Data added | Priority |
|---|---|---|---|
| English tourism | `EngService2` | English translations for all places sharing the same `contentId` | P2D-1 |
| Traditional Chinese tourism | `ChtService2` | Chinese translations for the same `contentId` set | P2D-2 |

**Note:** `detailPetTour2` exists only in Korean services; multilingual expansion covers general tourism fields, not pet-policy fields. Pet-policy display remains Korean-only until official translations are provided.

### Phase 2E — Real-Time Traffic Information

**Status:** Partially implemented — Kakao Navi API route guidance is live; expressway CCTV and AI vehicle detection remain proposed
**Last updated:** 2026-08-09
**Goal:** Answer "is the road to my pet-friendly destination safe right now?" by adding real-time traffic conditions, route-based CCTV, and AI-powered vehicle detection.

Unlike Phases 2A–2D, these data sources are not Korea Tourism Organization services. They are separate government APIs operated by the Korea Expressway Corporation, Ministry of Land, Infrastructure and Transport, and Korea Meteorological Administration. Each has its own quota, ingestion schedule, and credential budget.

| Source | Provider | Data added | Priority |
|---|---|---|---|
| Real-time highway congestion | Korea Expressway Corporation | Congested/sluggish section counts, directional traffic speed | P2E-3 |
| Road weather (CCTV-based) | Korea Meteorological Administration | Rain, surface flooding, road surface condition at CCTV points | P2E-3 |
| Road closure / control | Korea Expressway Corporation | Full closure, lane restriction, construction zones | P2E-3 |
| CCTV video | MOLIT / UTIC | Real-time road CCTV video streams and coordinates | P2E-1 |
| AI vehicle detection | Client-side TensorFlow.js (COCO-SSD) | On-screen vehicle count (moving/stopped), density estimate | P2E-2 |

The priority order reflects dependency: CCTV infrastructure (P2E-1) must exist before AI detection (P2E-2) can overlay on it, and the traffic-condition layer (P2E-3) is the broadest integration.

#### Kakao Navi API — Implemented

**Status:** Implemented via `/api/directions` endpoint
**Last updated:** 2026-08-09

The Kakao Navi API (`https://apis-navi.kakaomobility.com/v1/directions`) provides route guidance between selected places in the Travel Plan Builder (FR-16). It is a pragmatic alternative to the expressway-government APIs above because it returns a complete multi-leg route with traffic metadata in a single call.

Data retrieved per route request:

- Total and per-leg distance (metres) and duration (seconds)
- Estimated taxi fare and toll fee
- Per-segment traffic congestion (`smooth` / `slow` / `congested` / `jammed`) with distance and duration for each congestion level
- Current vehicle speed per road segment
- A Kakao Map deep link (`https://map.kakao.com/?...`) constructed from the actual origin and destination place names

Congestion warnings surface directly in the plan builder timeline so the guardian sees road stress before departing with a pet. This implementation covers the practical "is this route pleasant for my dog?" question while the expressway CCTV and AI detection layers (P2E-1, P2E-2) remain planned for the deeper "is this road safe right now?" question.

### New Functional Requirements (Phase 2)

#### FR-9 Accessibility Context

- Accessibility data from `detailWithTour2` is displayed as an optional expandable section per place, never as a pet-admission criterion.
- Empty accessibility fields are labeled "정보 없음" and never shown as a guarantee of inaccessibility.
- The assistance-dog admission field (`helpdog`) is cross-referenced with pet-policy data but does not modify the tri-state pet match.

#### FR-10 Congestion Awareness

- The congestion forecast badge ("여유", "보통", "혼잡") appears on place cards and detail views when forecast data is available.
- The badge references a specific future date, not a generic pattern.
- Missing forecast data does not block results; the badge is simply absent.

#### FR-11 Camping Catalog

- Camping places from `GoCamping` that report `animalCmgCl` = "가능" enter the exact-match pipeline under the same tri-state contract as existing pet-tourism places.
- Camping-specific attributes (type, facilities, reservation URL) appear in an expanded detail section.
- Camping places that do not report pet admission are treated as `unknown`, matching the existing contract.

#### FR-12 Festival and Event Discovery

- Festival data from `searchFestival2` appears in a separate "이번 주 반려동물 동반 축제" section, not in the main search flow.
- A festival is included only when its location overlaps with a region that has existing exact-match places or when the user has selected a region.
- Festival dates are checked against the user's visit context when available.

#### FR-13 Real-Time Traffic Context

- Traffic condition data (congestion, speed, weather, closures) is displayed as contextual information alongside course results, never as a pet-admission criterion.
- Congested and sluggish section counts reference a specific observation time, not a prediction.
- Weather and road-surface conditions (rain, flooding, landslide warning) are labeled with their source and observation time.
- Full road closures are displayed as alerts on affected course segments; a closure does not remove a qualified place from results but warns the user.
- Missing traffic data does not block results; the context panel is simply absent.

#### FR-14 Route-Based CCTV

- CCTV cameras along a generated course are listed in travel order, not in catalog order.
- Each CCTV entry shows its location name, route position, and a live video thumbnail or stream.
- CCTV streams are served through a server-side proxy that hides provider credentials; the web client never receives API keys.
- Cameras are discoverable only within an active course context; there is no standalone CCTV browser.

#### FR-15 AI Vehicle Detection

- When a CCTV stream is open, the user may enable AI vehicle detection as an overlay on the video.
- Detection runs entirely in the browser via TensorFlow.js (COCO-SSD); no video frames are sent to a server.
- The AI model and dependencies are lazy-loaded after user interaction so that the initial PWA bundle is not increased.
- The detected vehicle count is labeled as an approximate estimate ("AI 추정"), never as an official traffic volume.
- An ROI (region of interest) filter limits detection to a specific lane or direction selected by the user.

#### FR-16 Travel Plan Builder

- Each result card exposes a "+ 계획서" button that adds the place to a travel plan.
- The plan builder aggregates selected places and generates route analysis between consecutive stops using Kakao Navi API (`/api/directions`), showing distance, estimated duration, taxi fare, and toll fee per leg.
- Per-segment real-time traffic congestion is displayed with a status label (smooth/slow/congested/jammed) and the current vehicle speed for each road segment.
- Congested or jammed segments are highlighted with a warning so the guardian can anticipate road stress before departing with a pet.
- A Kakao Map link with actual place names is provided for each leg so the user can open turn-by-turn navigation.
- The completed plan can be printed or exported as PDF via the browser's print dialog using dedicated `@media print` CSS that strips interactive controls and renders a clean itinerary.
- Only places from the current qualified result set are eligible for plan construction; non-qualified places cannot be added.

#### FR-17 Place Thumbnails

- Each place card displays an auto-fetched thumbnail image from the Kakao Image Search API (`/api/place-image`).
- The image query includes the place name together with the selected region context to improve accuracy and reduce mismatched results.
- When no image is found, a neutral placeholder is shown; the absence of an image never affects qualification or ranking.
- Thumbnails are decorative context, not admission evidence; they are never used to infer pet policy.

#### FR-18 Sub-Category Display

- Places are auto-classified into one of 18 sub-category types (e.g. park, beach, mountain, nature, culture, market, outlet, department, dutyfree) based on name-pattern matching against known Korean keywords.
- Each sub-category is displayed with a dedicated emoji and a short Korean label (e.g. 🏞️ 공원, 🏖️ 해변, ⛰️ 산) alongside the place name.
- Classification is informational and never overrides the category-group filter or the tri-state match contract.
- Unclassified places fall back to the parent category label without a sub-type badge.

### New User Stories (Phase 2)

16. As a guardian with mobility needs, I want to see wheelchair access and disabled restroom availability so that I can plan a trip that works for all companions.
17. As a guardian, I want to see a congestion forecast for the next 30 days so that I can pick a quiet day.
18. As a guardian, I want to find pet-friendly camping sites with reservation links so that I can book an overnight stay.
19. As a guardian, I want to see nearby festivals during my trip window so that I can add an event to my course.
20. As a guardian, I want walking trails with difficulty levels so that I can choose a route suitable for my dog's size and stamina.
21. As a guardian comparing regions, I want to see which areas are popular with families so that I can find a pet-friendly atmosphere.
22. As a guardian planning a trip in heavy rain, I want to see real-time road conditions and flood warnings on my route so that I can decide whether it is safe to drive with my pet.
23. As a guardian building a course, I want to see live CCTV cameras along my route in order so that I can visually check traffic before departing.
24. As a competition judge, I want to see AI vehicle detection running in the browser so that the technical depth of client-side inference is demonstrated.

## 19. Planned: Hybrid Popularity Ranking

**Status:** Planned; not yet implemented
**Last updated:** 2026-08-09
**Goal:** Rank qualified places by a transparent blend of internal policy quality and external popularity signals, rather than by distance alone.

The current MVP orders exact-match results by coordinate distance from the reference point. A hybrid ranking would let the guardian see the most promising places first without weakening the exact-match contract.

### Proposed scoring model

1. **Internal score (policy specificity + recency):** places whose pet-policy text contains detailed, condition-specific language (carrier required, outdoor only, weight limit) score higher than places with vague or generic "pet friendly" text. More recently observed or updated policies receive a recency bonus.
2. **External popularity (Kakao ratings):** for the top N places by internal score, fetch the Kakao Local API rating and review count to provide a community-popularity signal.
3. **Composite rank:** the internal score is the primary sort key; external ratings act as a tie-breaker and secondary display signal, never overriding qualification or internal quality.

### Guardrails

- Ranking never promotes a partial or unknown match into the exact result set.
- The external rating is labeled with its source and observation time; it is never presented as pet-admission evidence.
- When Kakao rating data is unavailable for a place, the place retains its internal-score rank without penalty.
- The hybrid model is opt-in: the default sort remains distance-based until the user explicitly switches to "추천순."
