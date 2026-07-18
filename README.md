# Pet Travel Planner

A verified Korean-first pet-travel PWA that returns only places satisfying every selected condition and shows the evidence for each match.

The product name is `같이갈개`; `pet-travel-planner` remains the repository name.

## Core Promise

> Select conditions once. See only places that satisfy every hard constraint, with the evidence shown beside each result.

## Current State

The repository contains a runnable Next.js 16 mobile-first PWA, strict tri-state AND matcher, source proof, preference-only recovery, separated nearby catalog, exact-only approximate course, provider-neutral `/api/places` contract, complete official base-catalog synchronization into SQLite, deterministic sanitized fixtures, security headers, and offline shell. With no filter selected, it reports the complete stored count and serves 50-place pages; each selected condition is evaluated against the complete stored snapshot before the server returns the matching page.

See [STATUS.md](STATUS.md) for evidence-backed status and the exact next action.

## Document Map

Read in this order:

1. [PRD.md](PRD.md) — product promise, scope, canonical terms, requirements, acceptance criteria
2. [DATA_SPEC.md](docs/data/DATA_SPEC.md) — official sources, normalized policy evidence, parsing, freshness, matching
3. [USER_FLOWS.md](docs/product/USER_FLOWS.md) — navigation, search, proof, no-result, course, and accessibility flows
4. [DESIGN.md](DESIGN.md) — design read, tokens, components, visual and content rules
5. [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) — logical boundaries, data flow, storage, security, verification
6. [DATABASE.md](docs/data/DATABASE.md) — SQLite schema, transactions, backup, recovery, and operations
7. [COMPETITION_STRATEGY.md](docs/competition/COMPETITION_STRATEGY.md) — judging thesis, differentiation, demo, evidence
8. [MVP_ROADMAP.md](docs/roadmap/MVP_ROADMAP.md) — dependency-ordered implementation phases and gates
9. [DEMO_SCRIPT.md](docs/competition/DEMO_SCRIPT.md) — repeatable judged demo using the frozen fixture
10. [EVIDENCE_MATRIX.md](docs/competition/EVIDENCE_MATRIX.md) — claim-to-test and claim-to-artifact traceability

## Canonical Ownership

- `PRD.md` owns product behavior, priority, and glossary.
- `DATA_SPEC.md` owns provenance, condition meaning, confidence, unknowns, and freshness.
- `USER_FLOWS.md` owns screen sequence and user-facing recovery.
- `DESIGN.md` owns visual tokens, components, hierarchy, motion, and accessibility styling.
- `ARCHITECTURE.md` owns runtime boundaries and operational flow.
- `MVP_ROADMAP.md` owns build order and phase verification.
- `STATUS.md` owns current project truth and continuity.

## Primary Data Sources

- [Korea Tourism Organization Pet Travel Service](https://www.data.go.kr/data/15135102/openapi.do)
- [Korea Tourism Organization Korean Tourism Information Service](https://www.data.go.kr/data/15101578/openapi.do)
- [Official 2026 Pet Travel API operation-change notice](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004471)

## Non-Negotiable Product Rules

- Unknown data never satisfies a hard constraint.
- Exact results use visible AND semantics.
- Every selected hard condition has source-backed match proof.
- Minimal relaxation changes preferences only.
- Courses contain exact-qualified places only.
- Freshness never means real-time venue confirmation.

## Repository Shape

```text
pet-travel-planner/
├── src/
│   ├── app/                  # App Router pages, manifest, API route
│   └── data/                 # provider contracts, adapters, fixtures, tests
├── public/                   # PWA icon, service worker, offline shell
├── package.json
├── README.md
├── PRD.md
├── DESIGN.md
├── STATUS.md
├── docs/
│   ├── architecture/ARCHITECTURE.md
│   ├── competition/COMPETITION_STRATEGY.md
│   ├── competition/DEMO_SCRIPT.md
│   ├── competition/EVIDENCE_MATRIX.md
│   ├── data/DATA_SPEC.md
│   ├── product/USER_FLOWS.md
│   └── roadmap/MVP_ROADMAP.md
└── devlog/
    ├── _plan/
    └── _fin/
```

## Local Commands

```bash
npm install
npm run dev
npm run db:sync
npm run db:sync:daily
npm run db:sync:all
npm run db:backup
npm run check
npm run test:coverage
npm run test:e2e
npm run build
npm run verify
```

`DATA_PROVIDER=database` reads the latest successful SQLite snapshot. Enter the general `Decoding` key in `.env.local`, run `npm run db:sync`, then run the app. Each invocation resumes from the latest published detail checkpoint; `TOUR_API_DETAIL_LIMIT=50` means “save every 50 details,” while `TOUR_API_SYNC_BATCHES=14` can advance up to 700 details in one invocation under the shared request cap. With a development account, `npm run db:sync:daily` creates a verified backup and advances up to 900 details while staying below the 1,000-request allowance. After an operating-account traffic increase, `npm run db:sync:all` creates a verified backup and runs up to 20 checkpoints of 900 details with a 20,000-request local budget, stopping early when coverage is complete. `DATA_PROVIDER=fixture` remains the network-free verification mode and `tour-api` remains a direct live diagnostic mode. Secrets must never enter source control or client bundles.

## Live Provider Status

The issued-key flow was verified on 2026-07-18 against `areaBasedList2` and `detailPetTour2`. The latest successful local checkpoint stores all 9,764 base places and 1,000 pet-detail records with zero failed details. The resumable synchronizer advances pending rows before rotating refresh/failure retries, preserves known evidence until a refresh succeeds, and aborts publication on quota exhaustion. The database screen reports base, searchable, and pending counts separately, serves at most 50 verified-detail cards per page, and excludes unconfirmed pet-detail rows from browsing and exact condition matches. The judged demo can use the persisted last-valid snapshot without depending on live provider availability during page loads.
