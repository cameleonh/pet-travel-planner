# Live API Integration Check

**Status:** Verified on 2026-07-16

## Implemented

- Replaced the invalid placeholder snapshot endpoint with `areaBasedList2` and `detailPetTour2`.
- Added Zod validation for official envelopes and safe result-code handling.
- Mapped official identity, category, address, coordinate, and pet-policy fields into the internal contract.
- Preserved shopping classification and isolated pet-detail failures as unresolved evidence.
- Added official all-breeds normalization without inferring indoor or outdoor access from area wording.
- Updated live environment guidance to use the Decoding key and the currently working HTTP gateway.

## Evidence

- Focused provider contract: 9 tests passed.
- Full static/unit check: lint, TypeScript, and 25 tests passed.
- Coverage: 92.99% statements, 78.26% branches, 97.87% functions, 94.35% lines.
- Live `/api/places` smoke: success, provider `tour-api`, 10 mapped places, shopping category preserved.
- Fixture-mode browser regression: 7 Playwright tests passed.
- Deterministic production build passed.
- Dependency audit: zero moderate-or-higher vulnerabilities.

## Residual risks

- The official gateway responded only over HTTP during this verification; credentials remain server-only, but transport is not encrypted.
- Current live ingestion is a bounded first-page sample without persistence, pagination, or quota-aware caching.
- API evidence confirms integration, not current venue-policy truth.

## Follow-up QA

- Standard browser QA reproduced an upstream list HTTP 502 as a complete home-page crash.
- `loadPlaceSnapshot` now falls back to deterministic fixture data with an explicit notice for recoverable live-provider failures.
- A forced-outage browser check and `/api/places` request verified the fallback without console errors.
- Full post-fix verification passed 26 Vitest tests, 7 Playwright tests, coverage, build, and dependency audit gates.
- Evidence: `.gstack/qa-reports/qa-report-localhost-2026-07-16.md`.
