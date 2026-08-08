# Competition Strategy

**Competition:** 2026 Tourism Data Utilization Competition — Web/App Implementation Division
**Selected topic:** Pet-friendly travel information
**Last updated:** 2026-08-08

## 1. Official Context

The [official Touraz announcement](https://touraz.kr/announcementList/pssrpView?curPage=1&pssrpSeqEnc=XXqklEQwafIN2rakpflRgQ%3D%3D) states that entrants select one of ten designated topics and must implement and enhance a tourism service using Korea Tourism Organization OpenAPI data. Registration runs from 2026-07-06 to 2026-07-21 16:00, followed by development, functional review, final presentation, and awards. The functional and final review stages require a completed service using the required OpenAPI.

The supplied designated-task PDF records the working evaluation dimensions used for this plan:

| Dimension | Weight | Product response |
|---|---:|---|
| Implementation | 30 | One complete mobile flow, strict matcher, proof ledger, error states, and reliable demo data |
| Planning | 30 | Clear user problem, canonical terms, safe recovery, measurable acceptance criteria |
| Data appropriateness | 20 | Official pet-tourism API is central; raw text is transformed into auditable decisions |
| Growth potential | 20 | Constraint-safe courses, policy correction, routing, partner expansion, and real-time traffic context after core quality |

Before submission, recheck the current official notice and attached PDF in case dates or evaluation wording change.

## 2. Winning Thesis

> “Pet friendly” is not a binary label. We turn official tourism policy text into a condition-by-condition admission decision for one specific pet.

The memorable product sentence is:

> Every result satisfies every required condition, and shows why.

This thesis is stronger than “find pet-friendly places” because it exposes a concrete decision gap and makes the value of data processing visible on screen.

## 3. Differentiation

### Common baseline

Public pet-travel products commonly show place categories, map/list discovery, broad pet-friendly labels, details, saved places, and directions. For example, the public [댕기자 Google Play listing](https://play.google.com/store/apps/details?id=com.enoo.dang&hl=ko) demonstrates several of these baseline patterns.

The project must not claim that a competitor lacks a feature unless a dated public artifact proves it. Position differentiation around demonstrated product behavior instead:

| Baseline behavior | Our demonstrable behavior |
|---|---|
| Broad pet-friendly discovery | Pet/profile-specific exact qualification |
| One filter or category at a time | Visible multi-condition AND contract |
| Generic badge | One proof item per selected condition |
| Missing information blended into detail | Unknown separated from exact results |
| Empty result | Safe preference-only minimal relaxation |
| Generic itinerary | Course built only from already-qualified places |
| No road condition awareness | Real-time traffic, CCTV, and AI vehicle detection as course context |

## 4. Demo Scenario

Use one short, repeatable story with prevalidated data.

### Persona

- Guardian comparing small-, medium-, and large-dog admission outcomes
- Requires leash admission and prefers carrier-compatible places
- Wants proof, a safe zero-result recovery, nearby utilities, and a short exact-only route

### Five-minute flow

1. Open the app with no required login.
2. Keep the default small-dog + leash + carrier preference and show one exact result with visible AND semantics.
3. Expand `파도끝 테라스` and show all three source-backed proof rows.
4. Select medium dog to produce zero results, then explicitly apply the offered carrier-preference removal to recover `솔바람 산책정원`.
5. Select large dog and show that the protected size constraint is never removed automatically.
6. Return to small dog; with the preference removed, show two exact results and build the approximate two-stop course.
7. Show that the course reports proof counts and straight-line distance but no travel minutes.
8. Compare confirmed nearby places with the separately labeled `반려동물 정책 확인 필요` group.
9. Press location recalculation and explain the permission-free reference-place fallback and non-persistence rule.
10. From the course result, open "이 길의 카메라 보기" to show route-ordered CCTV list; tap one camera to open the live stream.
11. Toggle AI vehicle detection on the CCTV stream; show real-time bounding boxes and the "AI 추정" count badge; note that inference runs entirely in the browser with zero server cost.

The demo dataset must be frozen and replayable. A live API refresh may be shown separately, but the judged flow must not depend on provider availability. CCTV and AI detection steps may use a prepared test stream if live CCTV APIs are unavailable during the demo.

## 5. Data Story

The presentation should show four layers, not only an API logo:

```text
Official policy text
  → deterministic condition extraction
  → tri-state evidence matrix
  → exact user decision and proof
```

Example explanation:

- Source says indoor admission is allowed only with a carrier.
- Parser records `indoor_access=true` and `carrier_required=true` with the original phrase.
- A user requiring “no carrier” does not receive that place as an exact match.
- The zero-result state explains the failing decision rather than hiding it behind ranking.

This makes the OpenAPI contribution essential to product behavior instead of decorative content.

## 6. Functional Review Priorities

Prioritize, in order:

1. Correct exact qualification
2. Traceable proof
3. Stable mobile interaction and state recovery
4. Repeatable seeded demo
5. Safe zero-result behavior
6. Course generation
7. Visual polish beyond the core screens

Do not trade matcher correctness for chatbot, social, or reservation scope.

## 7. Presentation Evidence

Prepare these artifacts:

- Architecture/data-flow diagram
- Raw-to-normalized policy example with highlighted source spans
- Labeled parser evaluation summary
- Exact-match scenario matrix including unknown and false values
- Safe-relaxation scenario proving hard constraints remain locked
- Course example in verified approximate mode; routed mode only if separately implemented
- Traffic context example with congestion summary, weather alert, and route-ordered CCTV list
- AI vehicle detection screenshot showing bounding boxes and "AI 추정" count badge
- Mobile screenshots for search, proof, no-result, course, CCTV stream, and AI detection
- Live demo plus recorded fallback

## 8. Judge Questions and Answers

### “How do you guarantee the policy is current?”

We do not claim real-time venue truth. We show source modification age, label stale or unknown records, preserve the official wording, and provide a venue-confirmation action.

### “Is keyword parsing reliable?”

The MVP uses versioned deterministic rules with negation, conflicts, source spans, and a labeled evaluation set. Ambiguous values become unknown and cannot pass a hard constraint.

### “Why not use natural language?”

Repeated trip planning is faster and less ambiguous with selectable conditions. Natural language may supplement name/source search later, but the core decision remains structured and inspectable.

### “What is different from an existing pet map?”

The core output is not a map pin. It is a pet-specific, multi-condition qualification with one source-backed proof per requirement and safe handling of unknown data.

### "Why add courses?"

Courses demonstrate growth without changing the trust model: every stop is drawn from the same exact-qualified result set. The course is optional and cannot weaken search conditions.

### "Why add traffic and CCTV?"

A pet-friendly destination is useless if the road is closed or unsafe. Traffic context — congestion, weather, closures, and live CCTV — answers "is the road safe right now?" without weakening the pet-policy core. It is context, not admission.

### "Does AI vehicle detection send video to a server?"

No. TensorFlow.js runs entirely in the browser. Video frames never leave the device. The model is lazy-loaded only when the user explicitly enables detection, so the initial PWA bundle is unaffected.

## 9. Scope Guard

Do not add these before the core review gate passes:

- Conversational AI home screen
- User community or reviews
- Reservations or payments
- Real-time crowd estimates
- Native apps for both platforms
- Automatic venue-policy claims from unreviewed model output

## 10. Submission Checklist

- Required OpenAPI adapter usage is visible in documentation and backed by a sanctioned issued-key smoke test plus sanitized field-contract tests.
- All major screens work on a judge-owned mobile browser.
- Demo account is unnecessary or credentials are provided clearly.
- Seeded data and live-refresh modes are distinguishable.
- No API keys appear in client assets or repository history.
- Empty, loading, API error, stale, unknown, and zero-result states are demonstrable.
- Every quantitative claim in the presentation has an artifact or source.
- Final service, video fallback, slide deck, and source state agree.
