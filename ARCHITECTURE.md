# Architecture

> Single source of truth for how 같이갈개 (pet-travel-planner) is built. Current as of 2026-08-20.
> For data provenance see `docs/data/DATA_SPEC.md`; for current status see `STATUS.md`.

## Concept

같이갈개 is a mobile-first Korean pet-travel planner built on one governing principle:

**"Unknown is not yes."** Every hard filter (e.g. "medium dog allowed") admits a place only with positive evidence. A place whose policy is unknown stays UNKNOWN and is shown with a confirm-directly disclosure — it never silently passes a filter, and keyword-search evidence (Kakao) never enters the matching engine.

Each confirmed match carries proof: `sourceText` (what the source said), `sourceUrl` (where), `observedAt` (when). Users can open the evidence on every result card.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | One app serves frontend + API; no separate backend |
| Language | TypeScript (strict) | |
| UI | React client components in `src/features/*` | Plain CSS (`src/app/globals.css`), no UI framework |
| i18n | ko / en / zh via `src/i18n/dictionary.ts` | |
| PWA | `manifest.webmanifest` | Installable, mobile-first layout |
| DB | SQLite via better-sqlite3 (synchronous, no ORM) | `.data/pet-travel.sqlite` |
| Migrations | Hand-written, versioned in `src/data/database/schema.ts` | v10 as of 2026-08-20 |
| Validation | zod at every external boundary (API envelopes, file data) | |
| Tests | vitest (unit) + Playwright (e2e) | 187 unit tests |
| Lint | ESLint, zero-warning policy (`--max-warnings=0`) | |

## Layout

```
src/
  app/                    # App Router pages + API routes
    api/                  # places, rural, pet-cafes, trails, festivals, gpx,
                          # directions, veterinary, pet-shops, pet-restaurants,
                          # place-image, owner/*, auth/*
    globals.css           # all styling
  data/
    contracts.ts          # zod schemas: ProviderSnapshot, RawPlace
    providers/            # external-source adapters (tour-api, camping,
                          # village, farmstay, ...) — fetch/parse/validate only
    database/             # schema.ts (migrations), repository.ts, sync.ts
    catalog.ts            # buildCatalogPage: region/category/prep filtering
                          # + tri-state evaluation over the snapshot
  domain/                 # pure, unit-tested logic
    types.ts              # tri-state, constraints, facts
    normalize.ts          # policy text -> smallDog/mediumDog/largeDog facts
    match.ts              # evaluatePlace: AND-matching with proof
    relax.ts              # minimal relaxation suggestions on zero results
    categories.ts         # display categories + CAFE_NAME_PATTERN
    regions.ts            # region grouping/search terms
    place-visuals.ts      # category-themed placeholder gradients for photo-less cards
    search-filters.ts     # canonical empty-filter state + active-filter predicate
    viewed-history.ts     # recently-viewed places (localStorage store + subscription)
    planning/             # course/planner engine, plan sessions
  features/               # UI components by feature area
    search/               # SearchExperience (main flow), panels
    results/              # ResultCard, RecentlyViewed, RuralSection, PetCafeSection, ...
    nearby/               # NearbyServices (vet/shop/restaurant around anchor)
    planner/ course/      # plan builder, course timeline
    owner/                # owner claims/closures portal
    navigation/           # FloatingQuickNav (scroll-top + map/list toggle)
    map/                  # InteractiveMapView
  i18n/
```

## UX polish layer (2026-08-28)

Six experience features added on top of the matching pipeline, all following the same domain/feature split:

- **Photo-less card placeholders** — `domain/place-visuals.ts` maps every display category to a pastel gradient + emoji; `PlaceThumbnail` renders it until a real image loads (or when none exists).
- **Share cards** — `layout.tsx` metadata carries OpenGraph/Twitter tags pointing at `GET /og` (`src/app/og/route.tsx`), a `next/og` ImageResponse (1200×630: brand gradient + mascot + Korean headline, fonts read from `@fontsource/noto-sans-kr` woff subsets). `NEXT_PUBLIC_SITE_URL` overrides the default `https://gggo.blog` base.
- **Floating quick nav** — `features/navigation/FloatingQuickNav.tsx`: scroll-to-top (appears past 480px) + map/list view toggle mirroring the results header segmented control.
- **One-click filter reset** — `domain/search-filters.ts` defines the empty state and `hasActiveFilters`; the match-bar shows a reset button whenever any filter is active, and region/district selects have inline ✕ clear buttons.
- **Recently viewed** — `domain/viewed-history.ts` keeps the last 4 interacted places in localStorage (dedup, newest-first, observable via `subscribeViewedHistory` for `useSyncExternalStore`); chips under the match-bar jump to the card when visible, otherwise re-apply the stored region+category filters.
- **Companion dog mascot** — `features/companion/CompanionDog.tsx` is a page-level mascot fixed bottom-left *above* the mobile action bars (so it never covers the trip tray). It recommends a place from `domain/companion.ts` (recently viewed first, then a bounded sample of catalog-confirmed places) in a bubble that is `pointer-events: none`, pettable on click, and persists hide/pet-count state in localStorage under `pet_travel_companion_v1`. On WebGL-capable, motion-allowed browsers it lazily upgrades to a three.js rendering of the CC0 dog model (`public/companion/dog.glb` via `features/companion/dog-driver.ts`; idle + ambient walk + a one-shot reaction from `dog-animation.ts`), and stays on the illustrated PNG everywhere else.

## The matching pipeline

1. **Ingest** — provider adapters fetch external sources, zod-validate, and store a *snapshot* (`source_snapshots` + `places` rows). Snapshots are append-only; the latest successful one is canonical.
2. **Normalize** — `normalize.ts` derives tri-state facts (`smallDog`/`mediumDog`/`largeDog` ∈ true/false/unknown) from the policy text, with evidence and `evidenceClass`. Generic "동반 가능" without size-specific wording proves only the small band; an explicit all-breeds phrase ("전 견종"/"모든 견종") proves every band. Restrictions always win over positive facts.
3. **Evaluate** — `evaluatePlace` ANDs the selected hard constraints; `buildCatalogPage` (`catalog.ts`) layers region text search, category filters, preparation filters, pagination, and zero-result relaxation on top.
4. **Disclose** — result cards show the proof panel; auxiliary data (Kakao keyword results, rural villages/farmstays) is rendered in separate sections that never claim tri-state confirmation.

### Category note (2026-08-20 café fix)

The KTO pet-travel catalog files most cafés under `restaurant` (72 restaurant/café rows nationwide; 0 cafés in Gyeongnam). The café category therefore spans both: filter matches `category === "cafe"` **or** (`category === "restaurant"` AND name matches `CAFE_NAME_PATTERN`), and `resolveDisplayCategory` labels café-named restaurants as cafés.

## Data sources

| Source | Type | Role | Scale |
|---|---|---|---|
| KTO 펫동반여행 (KorPetTourService2) | REST (data.go.kr) | tri-state core catalog | 9,695 places |
| GoCamping | REST (data.go.kr) | pet-admitted campgrounds | 1,131 sites |
| 두루누비 (KorService2 walks) | REST + GPX | walking trails | region-scoped |
| KTO festivals / photo gallery | REST | discovery sections | region-scoped |
| KorWithService2 (barrier-free) | REST | accessibility detail | partial (quota-limited) |
| KTO Eng/Cht translations | REST | en/zh card text | EN 3,618 / ZH 3,584 |
| 전국농어촌체험휴양마을 (15013113) | file (JSON) | experience villages + programs | 1,246 villages / 17,719 programs |
| 행안부 농어촌민박업 (15155113) | REST (data.go.kr) | farm-stay guesthouses | 55,325 rows (36,604 active) |
| Kakao Local | REST (own key) | keyword-search pet cafés/restaurants/shops/vets — display-only, never tri-state | per-query |

Notable source quirks (see DATA_SPEC.md for full detail):

- Farm-stay endpoint: `https://apis.data.go.kr/1741000/rural_homestays/info`. Pages hard-capped at 100 rows regardless of `numOfRows` (full sync = 554 requests). Coordinates are EPSG:5174; `farmstay-provider.ts` converts to WGS84 with a pure-TS TM inverse + 3-parameter Molodensky shift (verified against ground truth to ~tens of meters).
- data.go.kr operation specs are embedded in the dataset page's inline Swagger JSON even when the 상세기능 tab is login-gated — search the HTML for `"operationId"`.

## Sync commands

All read `.env.local`. API keys: the data.go.kr decoding key is account-level (works for every KTO/MOIS service); the Kakao REST key is separate.

```
npm run db:sync              # KTO pet-travel snapshot (core)
npm run sync:villages        # experience villages (file-based)
npm run sync:farmstay        # farm-stay guesthouses (~554 requests)
npm run sync:farmstay-pets   # inherit pet policies: <=150m AND name-compatible
npm run sync:camping         # GoCamping
npm run sync:accessibility   # barrier-free (quota-limited)
npm run sync:trails          # 두루누비
npm run sync:translations:en / :zh
```

Pet-policy inheritance (`farmstay_pet_policies`, migration v10): a farmstay inherits a confirmed policy from a KTO accommodation only when BOTH (a) haversine distance ≤ 150 m and (b) normalized names are compatible. It is display-only provenance (🐾 badge + evidence panel) — it never enters tri-state hard matching.

## API surface (App Router)

- `GET /api/places` — main catalog search (region, categories, hard/preference constraints, prep filters, pagination)
- `GET /api/rural?region=` — villages + active farmstays (+ inherited pet policies via left join)
- `GET /api/pet-cafes?region=` — Kakao keyword cafés (confirm-directly disclosure)
- `GET /api/trails` / `api/festivals` / `api/gpx` — discovery
- `GET /api/directions` — route legs between plan places (Kakao map deep links)
- `GET /api/veterinary` / `api/pet-shops` / `api/pet-restaurants` — nearby services around an anchor point
- `GET /api/place-image` — place thumbnails
- Owner portal: `/api/owner/*`, `/api/places/*/closures`; auth: `/api/auth/*` (Google)

Map handoff pattern: the app does not embed maps. Places link out to Kakao Map deep links (`https://map.kakao.com/link/map/{name},{lat},{lng}`) consistently across result cards, trails, rural cards, and course timeline.

## Security headers

`next.config.ts` emits `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), geolocation=(self), microphone=()` on every response, so the app is secure and verifiable when served directly (`next start`, e2e). The Apache vhost additionally emits CSP, HSTS, and X-Frame-Options, and delegates the three app headers (single source of truth). `poweredByHeader: false` removes `X-Powered-By`. The vhost CSP must allow `connect-src 'self' blob:`: the companion's three.js loader fetches the GLB's embedded texture through a `blob:` URL, and `connect-src` (not `img-src`) governs that fetch.

## Verification

```
npm run check   # eslint --max-warnings=0 && tsc --noEmit && vitest run
npm run build   # next build
```

A change is done only when both pass. Commits are conventional (`feat:`, `fix:` ...) in English.
