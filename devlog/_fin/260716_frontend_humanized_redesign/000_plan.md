# Humanized Frontend Redesign Plan

## Loop Specification

- **Archetype:** Convergent repair of an existing verified frontend.
- **Trigger:** The user reported that the design is difficult to scan and explicitly requested humanized Korean copy plus a redesign informed by current websites.
- **Goal:** Put the filter-and-result workflow in the first viewport, make the current result state the obvious focal point, and replace defensive or technical copy with direct Korean.
- **Non-goals:** New search capabilities, map SDK integration, backend/API changes, new dependencies, remote image assets, or changes to matching/course logic.
- **Verifier:** `DATA_PROVIDER=fixture npm run verify` plus rendered checks at 1440, 1024, 768, 390, and 320 pixels. The browser checks hierarchy, text wrapping, target size, interactive states, console output, and accessibility.
- **Stop condition:** One clean desktop and mobile observation after the redesigned controls, zero-result recovery, proof disclosure, nearby catalog, and course flow are exercised.
- **Memory artifact:** This implementation unit, `DESIGN.md`, `STATUS.md`, and `.gstack/qa-reports/` screenshots.
- **Expected terminal outcomes:** DONE, or BLOCKED if the existing functional contract cannot be preserved without a backend or domain change.
- **Escalation:** Main agent retains all writes. The audit reviewer may only report blockers. Scope expands only through a new P-phase amendment.

## Evidence Base

- Current baseline screenshot: `/tmp/pet-travel-before.png`.
- Current visual problem: an oversized centered hero delays the task; filters, results, nearby information, and course planning use similar bordered rounded cards and compete at the same visual level.
- Airbnb 2026 Summer Release: <https://news.airbnb.com/product-releases/airbnb-2026-summer-release/>. The new homepage puts discovery and trip functions immediately on the opening surface.
- Airbnb 2025 Winter Release: <https://news.airbnb.com/product-releases/airbnb-2025-winter-release/>. Map points of interest are filterable and expose a summary plus distance from the selected stay.
- Wanderlog: <https://wanderlog.com/>. It combines itinerary and map context and keeps official links, distances, and route planning close to the place list.
- BringFido: <https://www.bringfido.com/> and its current App Store release history. Its information architecture starts with pet-relevant categories; recent releases emphasize nearby points of interest, active filters, multiple pets, and richer property details.
- VISITKOREA mobile: <https://korean.visitkorea.or.kr/main/main_mo.do>. It validates Korean demand for fast course creation but also demonstrates the scanning cost of too many equally prominent service modules.

## Design Read

```yaml
---
name: Together Map
colors:
  primary: "#18584D"
  accent: "#C34A32"
  background: "#F4F7F5"
typography:
  heading: { fontFamily: "Pretendard", fontSize: "32px" }
  body: { fontFamily: "Pretendard", fontSize: "16px" }
---
```

Reading this as a Korean mobile-first travel utility for pet guardians, using the visual language of a clear trip-planning desk rather than a landing page or pet-shop brand.

- **Do:** open on the task, make the result count and matching state the focal point, use one green brand/action system with coral reserved for recovery, and keep evidence one tap away.
- **Do not:** use a giant centered hero, repeated step-number eyebrows, equal floating cards, decorative gradients, unexplained glyph icons, or defensive copy.
- **DESIGN_VARIANCE:** 5/10
- **MOTION_INTENSITY:** 2/10
- **Product density profile:** D3 consumer app
- **Reasoning:** The product needs a recognizable travel identity, but repeated condition changes must remain fast, stable, and low-motion.
- **Signature:** A compact match bar that visually connects selected conditions to the live exact-result count.

## Necessity Gate

- **Do nothing:** rejected because the rendered baseline confirms the reported hierarchy problem.
- **Delete:** accepted for the trust-pill strip, numbered micro-headings, redundant explanations, excessive shadows, and repeated card decoration.
- **Configure:** insufficient because the issue is structural hierarchy and copy, not a single token value.
- **Reuse:** required. Existing components, state, domain functions, CSS variables, tests, and accessibility semantics remain the owners. No new dependency or parallel component system will be added.

## Work Phase

One C3 work phase, detailed in `010_frontend_redesign.md`, covers design-system synchronization, copy rewrite, layout implementation, test alignment, and rendered verification.

## Source of Truth Sync

- `DESIGN.md`: update the implemented direction, density, hierarchy, component rules, and decisions log.
- `STATUS.md`: record implementation and fresh verification evidence.

