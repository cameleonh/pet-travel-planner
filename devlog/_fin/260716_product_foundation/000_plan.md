# Product Foundation Documentation Plan

## Objective

Create a durable, internally consistent product foundation for a pet-friendly travel search service whose core promise is: every returned place satisfies every selected requirement.

## Work Class

- Class: C3 (durable cross-domain product, data, UX, and architecture contracts)
- Mode: docs-only PABCD pass
- Verification: structural audit, link validation, source check, and cross-document terminology review

## Scope

### In

- Product requirements and measurable MVP acceptance criteria
- Click-first AND-filter interaction and minimal-relaxation behavior
- Pet tourism API ingestion and free-text normalization contract
- Constraint-safe half-day/day course generation as a secondary feature
- Mobile-first UX flows, design tokens, accessibility, and UI states
- Logical architecture, implementation phases, competition strategy, and continuity state

### Out

- Application source code or framework initialization
- Production credentials, API keys, deployment, reservations, or real-time traffic
- Final brand name, logo, illustrations, and rendered visual concepts
- Claims that competitor features are absent without public evidence

## Source-of-Truth Map

| Path | Status | Responsibility |
|---|---|---|
| `README.md` | NEW | Project map and document reading order |
| `PRD.md` | NEW | Product scope, requirements, stories, acceptance criteria |
| `DESIGN.md` | NEW | Persistent visual and interaction system |
| `docs/product/USER_FLOWS.md` | NEW | Screen flows, states, and copy behavior |
| `docs/data/DATA_SPEC.md` | NEW | API sources, normalized schema, parsing rules, confidence |
| `docs/architecture/ARCHITECTURE.md` | NEW | Logical components, data flow, boundaries, recommended stack |
| `docs/competition/COMPETITION_STRATEGY.md` | NEW | Judging narrative, differentiation, demo sequence |
| `docs/roadmap/MVP_ROADMAP.md` | NEW | Dependency-ordered implementation and verification gates |
| `STATUS.md` | NEW | Current state, decisions, evidence, risks, next action |

`PRD.md` also owns the canonical glossary for hard constraints, preferences, exact matches, unknowns, partial matches, and minimal relaxation. Other documents reference those terms rather than redefining them.

## Acceptance Criteria

- A new contributor can identify the product promise, MVP boundary, and exact next implementation phase from the repository root.
- All documents use the same definitions for hard constraints, AND matching, unknown data, partial match, and minimal relaxation.
- The PRD distinguishes required MVP behavior from optional course generation.
- Minimal relaxation never removes a hard safety, legal, accessibility, or pet-admission constraint; it may relax only user-marked preferences unless the user explicitly edits the hard constraint.
- The data spec separates official source data, derived fields, inferred values, and unknown values.
- The data spec defines the freshness threshold, verification status, and source timestamp used by stale-policy warnings.
- The design system specifies mobile-first navigation, filter interaction, result proof, no-result recovery, tokens, component states, and accessibility.
- The architecture never treats tourism API update cadence as real-time venue confirmation.
- Course output distinguishes straight-line estimates from externally routed travel time and never labels an estimate as a verified route duration.
- External factual claims link to primary sources and include an access date.
- No empty placeholders, contradictory priorities, or unowned requirements remain.

## Risks

- Pet conditions are primarily free text and may be incomplete or stale.
- Missing data can be mistaken for a negative match unless tri-state semantics are enforced.
- Course generation can distract from the core search promise if promoted too early.
- A final brand name and rendered concept remain intentionally deferred.

## Verification Plan

1. List the final tree and confirm every manifest file exists.
2. Search for placeholders (`TODO`, `TBD`, `FIXME`) and resolve or explicitly classify them.
3. Verify all relative Markdown links resolve.
4. Compare canonical terms across PRD, data, UX, design, architecture, and roadmap.
5. Run an independent read-only audit before finalizing.

## Attestation Log

- 2026-07-16 — Plan created and audit blockers folded into the product contracts.
- 2026-07-16 — Documentation build completed: nine source-of-truth documents and two devlog records.
- 2026-07-16 — Verification passed: manifest/non-empty, relative links, unfinished markers, canonical glossary, hard-constraint relaxation safety, freshness boundary, and approximate-route boundary.
