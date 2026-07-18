# Phase 3 Check — Nearby catalog and safe course

**Date:** 2026-07-16  
**Verdict:** PASS

## Activated scenarios

- Distance ordering: Haversine tests ordered auxiliary places from the supplied reference coordinate.
- Status separation: confirmed pet-compatible places and `unknown` pet-policy places rendered in distinct groups.
- Location degradation: Playwright denied/withheld geolocation and the UI retained the named reference-place fallback without persisting location.
- Course safety: domain tests rejected a non-exact candidate; the UI built a course only from the current exact matches.
- Route honesty: the rendered course disclosed coordinate-distance approximation and contained no travel-minute claim.
- Responsive layout: production desktop and 390px mobile extension cards were observed; no console errors were reported.
- Visual regression repair: a sticky filter overlapping the extension row was found during observation, removed, rebuilt, and recaptured without overlap.

## Fresh evidence

- `npm run check`: PASS — ESLint, TypeScript, 3 test files, 19 tests.
- `npm run test:coverage`: PASS — 92.52% statements, 79.03% branches, 96.96% functions, 93.33% lines.
- `npm run test:e2e`: PASS — 4 Playwright flows.
- `npm run build`: PASS — production App Router build and static generation.
- `npm audit --audit-level=moderate`: PASS — 0 vulnerabilities.
- `evidence/042_course_result.png`: observed two-stop approximate exact-only course.
- `evidence/043_location_fallback.png`: observed permission-free reference-place fallback.
- `evidence/045_extensions_fixed.png`: observed repaired desktop extension layout.
- `evidence/046_nearby_mobile_card.png` and `047_course_mobile_card.png`: observed responsive mobile cards.

## Residual constraint

The deterministic fixtures prove product behavior without credentials. A real issued-key sample remains external evidence and is not represented as live venue truth.
