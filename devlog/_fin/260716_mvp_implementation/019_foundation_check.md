# Phase 0 Check Evidence

**Date:** 2026-07-16  
**Outcome:** PASS

## Static and executable gates

- `npm run check` — exit 0; ESLint, TypeScript, and 4 provider/contract tests passed.
- `npm run test:coverage` — exit 0; lines 100%, functions 100%, statements 93.1%, branches 81.25%.
- `npm run build` — exit 0; Next.js 16.2.10 compiled, typechecked, and generated `/`, `/api/places`, and `/manifest.webmanifest`.
- `npm audit --audit-level=moderate` — exit 0; zero vulnerabilities after the PostCSS 8.5.19 security override.
- `curl -fsS http://localhost:3000/api/places` — returned the success envelope, fixture provider metadata, stable place IDs, source evidence, and auxiliary confirmed/unknown statuses.

## Activation evidence

- `providers.test.ts` activates unsupported-provider fallback and asserts fixture mode plus a visible notice.
- `providers.test.ts` activates `DATA_PROVIDER=tour-api` without a key and asserts `ProviderConfigurationError`.
- The live-provider boundary is called with an injected fetch and verifies the credential remains inside the server request path.
- The deterministic fixture test proves stable parsed IDs without a live request.

## Render grounding

- Production server started successfully at `http://localhost:3000`.
- Mobile 390x844 and desktop 1280x720 were rendered, read back, and found free of clipping or Korean glyph fallback after bundling Noto Sans KR.
- Browser accessibility snapshot exposed the home link, three 44px-minimum pet-size buttons, and two evidence links.
- Browser console reported no errors.
- Screenshots: `evidence/010_mobile_390x844.png`, `evidence/011_desktop_1280x720.png`.

## Residuals

- A live issued-key provider response remains external-credential-dependent and is not misrepresented by the sanitized fixture.
- Git initialization could not create `.git` on this mounted path because the environment returned `EROFS`; no user history existed or was modified.
