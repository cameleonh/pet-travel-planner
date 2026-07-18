# Phase 4 Check — Competition hardening

**Date:** 2026-07-16  
**Verdict:** PASS

## Activated degraded and adversarial branches

- Unsupported provider mode selected the deterministic fixture with an explicit notice.
- Live provider mode without a credential failed closed.
- Upstream HTTP 503 failed closed without echoing the credential.
- Malformed provider payload and impossible coordinates failed Zod validation.
- A valid empty provider snapshot remained valid empty data rather than corruption.
- Invalid and duplicate API query conditions returned a Korean 400 `INVALID_QUERY` envelope without stack or schema leakage.
- UNKNOWN hard conditions and protected-category relaxation refusal remained covered by the exhaustive domain suite.
- Geolocation denial retained the named reference-place fallback.
- Desktop regression coverage proved the filter row does not overlap the nearby/course row.

## Final integrated verification

`npm run verify` completed with exit code 0:

- ESLint: PASS with zero warnings.
- TypeScript: PASS with `tsc --noEmit`.
- Vitest: PASS — 3 files, 22 tests.
- V8 coverage: 93.45% statements, 80.64% branches, 96.96% functions, 93.33% lines.
- Playwright: PASS — 7 browser tests covering search, proof, safe recovery, keyboard/axe, nearby/location fallback, exact-only course, malformed API queries, security headers, and layout non-overlap.
- Next.js production build: PASS — `/`, `/api/places`, and manifest routes emitted successfully.
- Dependency audit: PASS — 0 vulnerabilities at moderate threshold.

Additional repository checks:

- 28 Markdown documents scanned; all relative links resolved.
- Secret-pattern scan found no API-key-shaped or non-empty `TOUR_API_KEY` assignment.
- Production desktop and 390px mobile nearby/course artifacts were read back after the overlap repair; browser console reported no errors.

## Documentation disposition

- PRD, design system, architecture, user flows, status, README, roadmap note, competition strategy, demo script, and evidence matrix distinguish verified MVP behavior from post-MVP scope.
- The deterministic fixture is consistently labeled as sanitized verification data, not a live issued-key response or real-time venue guarantee.

## External dependency

A sanctioned issued-key response remains required before submission materials claim live official operation-field coverage. This does not block the credential-free implementation, adapter contract, or deterministic judged demo.
