# Project Status

**As of:** 2026-08-19
**Current objective:** Rural tourism catalog is fully live, including pet-policy inheritance. Experience villages: 1,246 villages / 17,719 programs (farm 1,087 / fishing 159; parenthesis-aware program splitting). Farmstays: 55,325 rows from the confirmed endpoint `https://apis.data.go.kr/1741000/rural_homestays/info`, 51,229 coordinate conversions verified against ground truth, region queries filter to 36,604 active businesses. Pet-policy inheritance (2026-08-19, migration v10): 11 farmstays inherit a confirmed policy from the KTO Pet Travel accommodation catalog via the dual-criteria matcher (≤150m haversine AND name compatibility) — display-only provenance with an evidence panel; never enters tri-state hard matching. Verification on 2026-08-19: lint 0 warnings, typecheck clean, 184/184 unit tests, production build OK.

## State Ledger

### Intended

- Mobile-first responsive web/PWA implementation
- Official tourism API ingestion and complete raw HTTP-envelope archival beyond the implemented logical snapshot store
- Deterministic Korean pet-policy normalization
- Tri-state exact AND matching and evidence proof
- Safe preference-only minimal relaxation
- Duration/category/opening-aware course planning beyond the verified approximate MVP course

### Implemented

- Next.js 16.2.10 App Router PWA shell on strict TypeScript 6.0.3
- Responsive Korean proof-first preview using bundled Noto Sans KR
- Task-first interface with a compact introduction, full-width condition controls, prominent live result count, and supporting nearby/course utilities
- Humanized Korean copy across search, proof, zero-result recovery, nearby discovery, course creation, metadata, and loading states
- Keyboard-visible skip navigation and a task-shaped loading shell for slow live-provider navigation
- PWA manifest, service worker registration, icon, and offline fallback
- Provider-neutral Zod contracts for tourism and auxiliary places
- Deterministic sanitized fixture provider and issued-key server-side Tour API provider
- Official `areaBasedList2` list ingestion plus per-place `detailPetTour2` pet-policy enrichment
- Shopping-category preservation, row-level detail failure isolation, and conservative official-phrase normalization
- Stable `/api/places` response envelope with request ID and Korean content language
- Provider configuration and contract tests, coverage thresholds, ESLint, and security headers
- Click-only pet-size, hard-condition, and preference controls with immediate strict AND results
- Result cards with one expandable source proof per selected condition
- Separate UNKNOWN/confirmation-needed messaging and explicit preference-only zero-result recovery
- Deterministic Playwright mobile flow and axe WCAG 2 A/AA gate
- Distance-ordered auxiliary catalog with confirmed and confirmation-needed pet-status groups
- Opt-in transient geolocation with a deterministic reference-place fallback
- Approximate course generation that consumes only current exact-qualified search results
- Explicit route disclosure with coordinate distance and no fabricated travel-minute claims
- Documentation repository structure
- Product requirements and canonical glossary
- Data provenance, parsing, matching, freshness, and course data contracts
- User flows and UX-state contract
- Persistent design direction and component/token system
- Logical architecture and dependency-ordered implementation roadmap
- Competition positioning and repeatable demo scenario
- SQLite migration, sync-run ledger, immutable validated snapshots, relational place/amenity/auxiliary rows, and latest-successful reads
- Manual `db:sync` and consistent online `db:backup` commands
- Bounded official pet-detail concurrency and failed-sync preservation of the last successful snapshot
- Database runtime mode with a distinct fixture fallback when the database is empty or unavailable
- Unfiltered full-catalog browsing, explicit `전체` pet-size choice, and exact/course activation only after the first condition
- Complete `areaBasedList2` pagination with stable deduplication, source-total preservation, and cached-detail reuse by upstream modification token
- Quota-bounded pet-detail enrichment with explicit `fetched`, `not-fetched`, and `failed` completeness states
- Server-side complete-snapshot filtering with global result counts and bounded 50-place API pages
- Client pagination, abortable condition requests, loading/error preservation, and page reset after filter changes
- Mutually exclusive filtered-result dispositions: confirmed match, confirmed non-match, and unverified, with an exhaustive complete-catalog count invariant
- Qualified result copy that separates confirmed availability from ingestion coverage and makes clear that unverified places may still qualify
- Conservative dog-size parsing that does not promote weight- or age-qualified admission text to an entire clicked size band
- General-admission fallback that promotes "동반 가능" without explicit size restriction to size-qualified true with inferred evidence class
- Phase 2 barrier-free accessibility provider, `place_accessibility` schema (28 fields, 4 disability groups), and expandable UI section
- Phase 2 GoCamping provider, `place_camping` schema, sync script, and expandable UI section with reservation link
- `/api/places` enrichment pipeline that left-joins accessibility, camping, congestion, and multilingual translation data at query time without modifying pet-policy matching
- Phase 2 multilingual translation provider (`EngService2`/`ChtService2`), `place_translations` schema (v8), sync script, language toggle UI, and expandable translation section on result cards
- Rural tourism catalog (2026-08-19): `experience_villages` + `village_programs` + `farmstays` schema (migration v9), `VillageProvider` (standard-data JSON ingestion), `FarmstayProvider` (농어촌민박업 OpenAPI + pure-TS EPSG:5174→WGS84 TM inverse with 3-parameter Bessel→WGS84 datum shift), `sync:villages` / `sync:farmstay` scripts, region-scoped `/api/rural` route, and a `RuralSection` discovery-disclosure UI listing villages, programs, and guesthouses with an explicit confirm-pet-policy-directly disclosure (rural entries never enter tri-state pet matching)
- Rural provider test coverage: 14 new tests covering village mapping/classification/dedup/validation, TM conversion invariants, and farmstay envelope/error handling (173 total, all passing)
- Phase 2 provider test coverage: 51 tests covering barrier-free, camping, congestion, trail, and multilingual providers (quota handling, error isolation, credential safety, pagination, data mapping)

### Verified

- On 2026-10-06, the companion mascot gained an optional three.js dog: a CC0 model (`public/companion/dog.glb`, Quaternius via Poly Pizza — see `public/companion/SOURCE.txt`) rendered on a transparent canvas with idle/walk/pet-reaction animations (`features/companion/dog-driver.ts`, `dog-animation.ts`), lazily imported only when motion is allowed and WebGL is available; the illustrated PNG stays the fallback. Also raised `.region-course-chip-count` opacity to clear a WCAG AA contrast failure in the region picker. Verified: lint 0 warnings, typecheck clean, 368/368 Vitest tests, 32 Playwright e2e passed (1 skipped), production build succeeded.
- On 2026-10-06, the `deploy/20260915` release was merged to `main` and deployed to the Lightsail instance (release `5b79bfa`; DB snapshot `tour-api` 9,695 places served). Fixed the theme-course card selection regression (the drag-to-scroll container captured the pointer, swallowing the follow-up click), added the companion dog mascot (`features/companion/CompanionDog.tsx`; fixed bottom-left above the mobile action bars, `pointer-events: none` bubble, pettable, hide/pet-count persisted), removed the 320px horizontal overflow (`contain: layout` on the mobile `.search-track`), corrected the `search.spec` large-dog expectation to the strict generic-admission policy (a "동반 가능" statement proves only the small band), moved the simple security headers into `next.config.ts`, and stabilized the mobile course e2e with reduced-motion emulation. Verified: lint 0 warnings, typecheck clean, 363/363 Vitest tests, 31 Playwright e2e passed (1 skipped), production build succeeded. Live `gggo.blog` re-checked: companion visible above the action bar, theme select/deselect works, axe WCAG 2 A/AA 0 serious/critical.
- On 2026-08-13, full QA passed: lint 0 warnings, typecheck clean, 137/137 Vitest tests passed (10 test files), coverage at 89.23% statements / 76.87% branches / 85.77% functions / 92.61% lines, 11 Playwright E2E passed (1 skipped), Next.js 16.3.0 Turbopack production build succeeded, `npm audit --audit-level=moderate` reported 0 vulnerabilities. New API routes since last checkpoint: `/api/auth/google`, `/api/auth/google/callback`, `/api/auth/logout`, `/api/auth/session`, `/api/directions`, `/api/festivals`, `/api/gpx`, `/api/owner/claims`, `/api/owner/closures`, `/api/pet-restaurants`, `/api/pet-shops`, `/api/place-image`, `/api/places/[placeId]/closures`, `/api/trails`, `/api/veterinary`, plus `/owner/login` and `/owner/places` pages.
- On 2026-08-06, multilingual translations were ingested via coordinate-based matching (EngService2/ChtService2 use different contentId spaces than KorPetTourService2, so coordinates at 4 decimal places ≈11m precision are the join key). English: 3,618 places matched from 15,108 total (16 API calls). Chinese: 3,584 places matched from 14,282 total (15 API calls). The MultilingualProvider, DB migration v8 (`place_translations`), TranslationSection UI with language toggle, `/api/places?lang=en|zh` enrichment, and 14 tests are verified: 115/115 tests pass, production build succeeds, 0 vulnerabilities.
- On 2026-08-06, GoCamping catalog was ingested via `npm run sync:camping`. It fetched all 3,084 camping sites in 4 API calls. A regex bug (`/가능/` matched "불가능") initially saved 2,602 sites as pet-admitted. After fixing to `/^가능/`, 1,471 "불가능" rows were deleted, leaving the correct 1,131 pet-admitted sites (43.5%). The CampingProvider, DB migration v5, CampingSection UI component, and `/api/places` enrichment are all verified: 113/113 tests pass, production build succeeds.
- On 2026-08-06, barrier-free accessibility infrastructure was completed: BarrierFreeProvider (`KorWithService2/detailWithTour2`), DB migration v4 (`place_accessibility` with 28 fields across 4 disability groups), AccessibilitySection UI component, and `/api/places` enrichment. Smoke test confirmed data retrieval for contentId 988449. Full data ingestion is scheduled after quota reset.
- On 2026-08-06, `npm run db:sync:daily` completed as run 32 / snapshot 14 after creating backup `pet-travel-2026-08-05T15-10-16-235Z.sqlite`. It used 271 official requests and recovered all 246 remaining failed rows. Pet-detail ingestion is now 100% complete: 9,695 fetched, 0 not-fetched, 0 failed.
- Snapshot 14 reconciles exactly to 9,695 places: 9,695 fetched, 0 not-fetched, and 0 failed. The current database and pre-sync backup independently returned `PRAGMA integrity_check=ok`.
- On 2026-08-06, a general-admission fallback was added to the dog-size normalizer. Places that state "동반 가능" without explicit size restriction, weight limit, or age limit now promote all three dog-size facts to true with evidence class "inferred-from-general-admission". Confirmed matches rose from ~760 to ~9,600 per size band. Explicit false values (25 medium-dog, 64 large-dog restrictions) and weight/age-qualified unknowns are preserved. Verified: 63/63 tests pass, production build succeeds.
- On 2026-08-05, `npm run db:sync:daily` completed successfully as run 30 / snapshot 13 after creating backup `pet-travel-2026-08-05T11-59-10-599Z.sqlite`. It used 910 official requests and increased fetched pet-detail coverage from 8,555 to 9,449. The not-fetched queue is fully exhausted (646 → 0); failed rows decreased from 500 to 246.
- Snapshot 13 reconciles exactly to 9,695 places: 9,449 fetched, 0 not-fetched, and 246 failed. The current database and pre-sync backup independently returned `PRAGMA integrity_check=ok`.
- On 2026-08-05, Next.js was upgraded from 16.2.10 to 16.3.0 and the postcss override from 8.5.19 to 8.5.25, resolving 3 moderate advisories (GHSA-fxqj-rqcc-2cmp). Lint, typecheck, 63 Vitest tests, the production build, and `npm audit --audit-level=moderate` (0 vulnerabilities) all passed.
- On 2026-07-31, `npm run db:sync:daily` completed successfully as run 29 / snapshot 12 after creating backup `pet-travel-2026-07-30T15-21-29-477Z.sqlite`. It used 910 official requests and increased fetched pet-detail coverage from 7,655 to 8,555.
- Snapshot 12 reconciles exactly to 9,701 places: 8,555 fetched, 646 not-fetched, and 500 failed. The current database and pre-sync backup independently returned `PRAGMA integrity_check=ok`.
- On 2026-07-30, a production-shaped 1,000-row official catalog probe returned HTTP 200 in 9.34 seconds, proving the previous fixed 8-second request timeout could cancel a valid response. A regression test failed with the observed 8,000 ms timeout before the repair, and the provider suite passed 22/22 after the timeout was increased to 30 seconds.
- `npm run db:sync:daily` then completed successfully as run 28 / snapshot 11 after creating backup `pet-travel-2026-07-30T08-04-35-246Z.sqlite`. It used 910 official requests and increased fetched pet-detail coverage from 6,797 to 7,655.
- The current database and pre-sync backup independently returned `PRAGMA integrity_check=ok`. Snapshot 11 reconciles exactly to 9,701 places: 7,655 fetched, 1,546 not-fetched, and 500 failed.
- On 2026-07-23, whitespace-separated destination terms were repaired with AND matching across place name and address. The regression test failed at 0 results before the fix and passed at 1 matching fixture afterward.
- The empty-result browser regression failed with a request to `/api/places/closures?ids=` before the fix and passed after closure lookup was skipped for an empty page.
- Post-repair verification passed zero-warning lint and typecheck, 62/62 Vitest tests, 11/11 active fixture Playwright tests, and the production build. The database-mode Playwright flow also passed with `부산 해운대`, and the live local API returned 49 matching rows.
- On 2026-07-24, `npm run db:sync:daily` completed successfully as run 22 / snapshot 8 after creating backup `pet-travel-2026-07-24T02-24-31-361Z.sqlite`. It used 910 official requests and advanced fetched pet-detail coverage from 4,097 to 4,997 while preserving 503 failed rows.
- On 2026-07-17, `npm run check` passed with zero lint/type errors and 43/43 Vitest tests; `npm run test:e2e` passed 10/10 Playwright scenarios; and `npm run build` completed successfully.
- A deterministic held-request E2E proves that changing a filter immediately hides stale counts and browsing cards until the matching response arrives.
- Live SQLite browser QA at 390x844 confirmed the medium-dog view reads `현재 37곳에서 가능을 확인했어요` and partitions all 9,764 rows as 37 confirmed matches, 0 confirmed non-matches, and 9,727 unverified. The large-dog API now reports 37 rather than the previous false-positive 38.

- `npm run lint`, `npm run typecheck`, 19 unit/contract tests, and `npm run build` passed on 2026-07-16.
- `npm run test:coverage` passed with 92.52% statements, 79.03% branches, 96.96% functions, and 93.33% lines across the covered provider and domain modules.
- `npm audit --audit-level=moderate` reports zero vulnerabilities after pinning the patched PostCSS 8.5.19 transitive dependency.
- The production app and `/api/places` were served locally; mobile 390x844 and desktop 1280x720 renders were observed with no console errors.
- Playwright verified default exact results, proof expansion, medium-dog zero results, explicit carrier-preference relaxation, recovered exact results, large-dog protected zero results, keyboard state, and zero serious/critical axe violations.
- Playwright also verified nearby confirmed/unknown separation, location-denial fallback, exact-result-only course generation, approximate-route disclosure, and absence of travel-minute claims.
- Production desktop and 390px mobile renders of the nearby and course cards were observed with no console errors; a sticky-filter overlap found during observation was repaired and recaptured.
- Axe identified the original coral contrast at 2.85:1; the implemented design token was corrected to `#BD462F` and the same accessibility test then passed.
- Unsupported provider mode and missing live credential branches were activated in tests; fixture mode made no live request.
- Official Pet Travel Service, Korean Tourism Information Service, and 2026 endpoint-change pages were opened and used as primary source references on 2026-07-16.
- The official Touraz competition announcement was opened on 2026-07-16 and confirms the implementation division, mandatory Korea Tourism Organization OpenAPI use, schedule, and completed-service review requirement.
- All nine source-of-truth documents and two devlog records exist and are non-empty.
- Relative Markdown links resolve.
- Product documents contain no unresolved work markers or filler text.
- Canonical hard-constraint, unknown, minimal-relaxation, freshness, and approximate-route rules are consistent across the source-of-truth set.
- Final `npm run verify` passed 22 unit/contract tests, 7 Playwright tests, the production build, and a zero-vulnerability dependency audit.
- Final coverage reached 93.45% statements, 80.64% branches, 96.96% functions, and 93.33% lines.
- All 28 Markdown documents passed relative-link validation; the repository secret-pattern scan returned no matches.
- Competition demo and claim-to-evidence documents now mirror the tested fixture flow and explicitly separate post-MVP scope.
- Issued-key calls to `areaBasedList2` and `detailPetTour2` returned official result code `0000`; the live `/api/places` smoke returned provider `tour-api` with 10 mapped places on 2026-07-16.
- Official-shaped provider tests pin decoded-key handling, list/detail mapping, shopping classification, empty data, malformed envelopes, provider error codes, secret-safe errors, and row-level detail failure isolation.
- Post-integration `npm run check` passed 25 tests; coverage passed at 92.99% statements, 78.26% branches, 97.87% functions, and 94.35% lines.
- Post-integration fixture-mode Playwright passed 7 tests, the deterministic production build passed, and `npm audit --audit-level=moderate` reported zero vulnerabilities.
- Standard live-browser QA found one high-severity outage bug: an upstream list HTTP 502 crashed the complete home page. A shared provider loader now switches live failures to the deterministic fixture with an explicit user notice.
- The forced-outage browser check rendered two fixture places with no console errors, and `/api/places` returned `success: true`, provider `fixture`, and the same notice.
- Post-fix `DATA_PROVIDER=fixture npm run verify` passed 26 Vitest tests, 7 Playwright tests, coverage thresholds, the production build, and a zero-vulnerability audit. The QA health score improved from 93 to 100.
- The header data badge now distinguishes live `공식 관광 데이터` from fixture `검증용 데이터`; 26 tests, typecheck, and a fixture production build passed after the correction.
- The redesigned default screen was visually inspected at 320, 390, 768, 1024, and 1440px; the medium-dog zero-result recovery was separately inspected at 390px with no clipping or overlap observed.
- Post-redesign typecheck passed, all 26 unit/contract tests passed, all 7 Playwright flows passed, and a fresh browser reload reached network idle with no console errors.
- Final post-redesign `DATA_PROVIDER=fixture npm run verify` exited 0: lint and typecheck passed; 26 Vitest and 7 Playwright tests passed; coverage reached 92.59% statements, 77.89% branches, 97.91% functions, and 94.53% lines; the production build passed; and the dependency audit found zero vulnerabilities.
- A live official `db:sync` exited 0 and stored 50 places in one successful immutable snapshot on 2026-07-16; direct SQLite inspection returned `integrity_check=ok`.
- Real-file SQLite tests verify migration, validated round-trip, append-only latest selection, prior-snapshot preservation after failure, invalid-publication rollback, and online-backup reopen.
- The provider/domain suite now passes 33 tests, including a maximum-three concurrent detail-request activation case and the database-empty fallback.
- Database-mode browser inspection rendered `저장 데이터 · 50곳`, 50 initial cards, a disabled course button, no horizontal overflow, and no console errors. Selecting 소형견+목줄 produced 24 exact proof-bearing results and enabled the course.
- Final post-review `npm run verify` exited 0: lint and typecheck passed; 33 Vitest and 7 Playwright tests passed; coverage reached 88.84% statements, 70.28% branches, 93.05% functions, and 92.69% lines; the warning-free production build marked `/` and `/api/places` dynamic; and the dependency audit found zero moderate-or-higher vulnerabilities.
- The corrected online-backup CLI produced and reopened a fresh backup after explicitly asserting `integrity_check=ok`.
- Official sync run 2 stored all 9,764 base places reported by the provider, with 100 confirmed pet-detail records, 9,664 not-fetched records, and zero failed details; direct inspection returned `integrity_check=ok`.
- The live database API returned source/searchable/filtered count 9,764, page size 50, 196 pages, and exactly 50 first-page results.
- Live condition queries recomputed global counts over the stored snapshot: outdoor 2, indoor 0, leash 43, carrier 2, small dog 37, medium dog 37, and large dog 38. Unconfirmed rows did not pass.
- Database-mode browser QA showed `저장 데이터 · 9,764곳`, 50 cards, and `1 / 196페이지`; next-page navigation changed the first card from `가까운약국` to `강문해변`, while selecting `목줄 착용` changed both the heading and card count to 43.
- Responsive database-mode captures at 375x812, 768x1024, and 1280x720 showed no control overlap, and the browser console reported no errors.
- Full-catalog provider, database, catalog, and UI tests pass 39 unit/contract cases and 8 Playwright cases after the new pagination implementation.

### Blocked

- No local implementation blocker exists.
- Independent historical plan-review agents failed because encrypted tool output could not be decoded. The completed line-anchored main-agent audit remains recorded in the archived implementation devlog.

## Locked Decisions

- The core differentiator is multi-condition exact qualification with visible proof.
- Missing or ambiguous data is `unknown` and cannot pass a hard condition.
- Safety, legal, accessibility, and admission constraints are never automatically relaxed.
- Course generation consumes one exact-qualified result set and cannot requalify partial places.
- Tourism data freshness is not real-time venue confirmation.
- The implementation baseline is Next.js 16.3.0, React 19.2.7, TypeScript 6.0.3, Vitest 4.1.10, and ESLint 9.39.5.
- The working product name is `같이갈개`; final competition branding remains reversible.
- Routing provider and native-app scope remain reversible.
- Pet-policy fields remain Korean-only; only structural place data (title, address, overview) is translated via multilingual APIs.
- Camping pet-admission filtering uses `/^가능/` (starts-with), not `/가능/` (substring), to avoid matching "불가능".

## Current Risks

- A fresh 2026-08-05 `npm audit` reports 0 vulnerabilities after upgrading Next.js to 16.3.0 and the postcss override to 8.5.25, resolving all previously reported findings including GHSA-fxqj-rqcc-2cmp.
- Free-text policy coverage may be uneven across place types and regions.
- Source policy may be stale even when the API record is recently ingested.
- Exact-result recall may be low until condition coverage improves; precision remains the MVP priority.
- The deterministic fixture remains intentionally small for automated verification; the latest persisted official snapshot contains 9,695 base records, of which 9,449 currently have fetched pet-detail records.
- The official gateway succeeded over HTTP but returned `403` over HTTPS during verification. The API key therefore has an unencrypted-transit residual risk; live calls remain server-only and must never expose constructed request URLs.
- Base-list pagination is complete, but pet-detail coverage grows only by the configured quota budget. Automated quota-aware scheduling and a production operations account remain future hardening scope.
- The database is an embedded single-instance store. Multi-instance deployment requires a service database adapter rather than a shared network SQLite file.
- The stored JSON is a validated logical provider snapshot, not a complete raw archive of every upstream HTTP envelope.

## Exact Next Action

Rural catalog + pet-policy inheritance (2026-08-19): complete and live. Rural cards now carry Kakao-map deep links (`map.kakao.com/link/map/name,lat,lng`) — villages always (WGS84 from source), farmstays when coordinates survived TM conversion — matching the existing trail/course handoff pattern.

Café coverage fix (2026-08-20): the KTO pet-travel catalog holds only 72 restaurant/café rows nationwide (0 cafés in Gyeongnam), so "café" searches came up empty for most regions. Two-part fix: (A) the café filter and display category now span café-named restaurants (`CAFE_NAME_PATTERN` — e.g. 카페 플랜비 in 창원 now matches 중형견 filters); (B) new `/api/pet-cafes` route + `PetCafeSection` UI fetch Kakao keyword-search cafés ("{region} 반려동물동반 카페", fallback "강아지동반 카페") when the café category is selected — shown in the regional discovery section with an explicit confirm-directly disclosure (keyword-search evidence never enters tri-state matching). Live-verified 2026-08-20: 경남 café filter returns 카페 플랜비; Kakao returns 15 Gyeongnam cafés. Optional follow-ups: (1) schedule `sync:farmstay` + `sync:farmstay-pets` after the daily tour sync (~554 requests/day fits the 10,000 quota; inheritance should re-run after each snapshot refresh), (2) widen inheritance by also matching the GoCamping catalog (1,131 pet-admitted sites) once camping rows carry comparable name fields. Separately, re-run `npm run sync:accessibility` after the KorWithService2 quota resets to complete barrier-free ingestion (35 smoke rows so far). The congestion forecast API (`TatsCnctrRateService`) remains unapproved (`SERVICE_KEY_IS_NOT_REGISTERED`); `TarRlteTarService1` and `PhotoGalleryService1` are deprecated (`NO_OPENAPI_SERVICE_ERROR`) and cannot be implemented.

## Latest Ingestion Checkpoint (2026-08-06)

- The daily synchronization completed as run 32 / snapshot 14 with `requestsUsed=271`, `batchesCompleted=1`, and `stopReason=complete`.
- All 246 remaining failed rows were recovered. Pet-detail ingestion is now 100% complete: 9,695 fetched, 0 not-fetched, 0 failed.
- Pre-sync backup `pet-travel-2026-08-05T15-10-16-235Z.sqlite` and the published database both passed independent `PRAGMA integrity_check` checks.
- Confirmed match counts with general-admission fallback: smallDog 9,625 / mediumDog 9,592 / largeDog 9,583 / leash 826.

## Previous Ingestion Checkpoint (2026-08-05)

- The daily synchronization completed as run 30 / snapshot 13 with `requestsUsed=910`, `batchesCompleted=1`, and `stopReason=batch-limit`.
- The upstream source total decreased from 9,701 to 9,695 places. Fetched pet-detail coverage increased by 894, from 8,555 to 9,449.
- The not-fetched queue is fully exhausted (646 → 0). Failed rows decreased from 500 to 246 after retry rotation recovered 254 previously failed details.
- Pre-sync backup `pet-travel-2026-08-05T11-59-10-599Z.sqlite` and the published database both passed independent `PRAGMA integrity_check` checks.
- The next safe data action is another `npm run db:sync:daily` after the development-key quota resets to continue rotating the 246 failed rows. Unknown records remain non-matches.

## Previous Ingestion Checkpoint (2026-07-31)

- The daily synchronization completed as run 29 / snapshot 12 with `requestsUsed=910`, `batchesCompleted=1`, and `stopReason=batch-limit`.
- The upstream source total remained 9,701 places. Fetched pet-detail coverage increased by exactly 900, from 7,655 to 8,555.
- The current remainder is 646 not-fetched and 500 failed. The next daily batch should exhaust the not-fetched queue first and then begin rotating explicit failures.
- Pre-sync backup `pet-travel-2026-07-30T15-21-29-477Z.sqlite` and the published database both passed independent `PRAGMA integrity_check` checks.
- The next safe data action is another `npm run db:sync:daily` after the development-key quota resets. Unknown records remain non-matches.

## Previous Ingestion Checkpoint (2026-07-30)

- Two initial daily attempts created verified backups but failed before publication because the official 1,000-row catalog response exceeded the provider's fixed 8-second request timeout. Runs 26 and 27 are recorded as failed without snapshot links; snapshot 10 remained active and intact.
- A production-shaped probe returned the same official catalog successfully in 9.34 seconds. The provider timeout was increased to 30 seconds and locked with a regression test.
- The repaired daily synchronization completed as run 28 / snapshot 11 with `requestsUsed=910`, `batchesCompleted=1`, and `stopReason=batch-limit`.
- The upstream source total changed from 9,763 to 9,701 places. Fetched pet-detail coverage increased from 6,797 to 7,655; the current remainder is 1,546 not-fetched and 500 failed.
- Pre-sync backup `pet-travel-2026-07-30T08-04-35-246Z.sqlite` and the published database both passed independent `PRAGMA integrity_check` checks.
- The next safe data action is another `npm run db:sync:daily` after the development-key quota resets. Unknown records remain non-matches.

## Previous Ingestion Checkpoint (2026-07-24)

- The latest daily synchronization completed successfully as run 22 / snapshot 8 after creating backup `pet-travel-2026-07-24T02-24-31-361Z.sqlite`.
- The official catalog still reports 9,763 source places, one fewer than the earlier 9,764-place snapshot.
- Fetched pet-detail coverage increased from 4,097 to 4,997. The current remainder is 4,263 not-fetched and 503 failed.
- The daily profile used 910 official requests: ten catalog pages and 900 detail attempts. All 900 attempts advanced fetched coverage without increasing the failed count.
- A second 2026-07-24 synchronization attempt started after creating backup `pet-travel-2026-07-24T02-31-26-628Z.sqlite`, but run 23 failed with `The operation was aborted due to timeout` before publication. Snapshot 8 remained the latest successful snapshot, and the counts stayed at 4,997 fetched, 4,263 not-fetched, and 503 failed.
- Both the pre-sync backup and latest database passed `PRAGMA integrity_check` with `ok`.
- The 2026-07-21 dog-size distribution has not yet been regenerated against snapshot 8; its previous counts must be treated as historical, not current.
- Before competition submission, finish detail enrichment and consider relabeling the UI counts as “명시적으로 가능 확인” so they are not read as nationwide totals. Review additional Korean policy phrasing only after coverage is complete.

## Latest Search Repair (2026-07-23)

- `buildCatalogPage` now normalizes and tokenizes whitespace-separated destination input, then requires every term to occur somewhere across the combined address and place name.
- A catalog regression covers trimmed repeated whitespace and distributed matches across address and name. It failed with zero results before the repair and now returns only the expected fixture.
- `SearchExperience` no longer requests `/api/places/closures?ids=` for an empty result page and clears stale closure state instead. The corresponding browser test failed before the repair and now passes.
- The database E2E no longer pins historical ingestion counts. It now validates the current coverage shape and exercises the placeholder example `부산 해운대`.
- The live Windows-localhost database API returned 49 matching rows for `부산 해운대`; the database-mode mobile search, pet profile, proof, and course flow passed.

## Continuity Evidence

- Completed documentation record: `devlog/_fin/260716_product_foundation/000_plan.md`
- Completed phase contract: `devlog/_fin/260716_product_foundation/010_documentation_build.md`
- Product source: `PRD.md`
- Data source: `docs/data/DATA_SPEC.md`
- Visual source: `DESIGN.md`
- Completed implementation unit: `devlog/_fin/260716_mvp_implementation/`
- Completed live API integration unit: `devlog/_fin/260716_live_api_integration/`
- Latest live QA report: `.gstack/qa-reports/qa-report-localhost-2026-07-16.md`
- Completed frontend redesign record: `devlog/_fin/260716_frontend_humanized_redesign/`
- Completed SQLite persistence record: `devlog/_fin/260716_sqlite_persistence/`
- Database source: `docs/data/DATABASE.md`
- Completed full-catalog pagination record: `devlog/_fin/260716_full_catalog_pagination/`
- Completed filter truthfulness repair record: `devlog/_fin/260717_filter_truthfulness/`
- Goal state: `.codexclaw/goalplans/build-and-fully-verify-a-competition-ready-korea/goalplan.json`
