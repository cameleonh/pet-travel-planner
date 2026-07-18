# MVP Implementation Roadmap

**Ordering principle:** Each phase consumes verified output from the previous phase. Phases are not grouped by estimated effort.  
**Last updated:** 2026-07-16

**Execution note:** The competition MVP implements the repository/provider boundary, deterministic normalization, strict search/proof/recovery, separated nearby catalog, and exact-only approximate course. Larger persistence, routing, opening-hour, saved-profile, and map/detail items below remain roadmap targets rather than verified behavior. See [STATUS.md](../../STATUS.md) for the evidence ledger.

## Phase 0 — Repository and Contract Bootstrap

### Outcome

A runnable mobile-first web/PWA skeleton with test, lint, type, environment, and documentation conventions.

### Work

- Confirm full-stack TypeScript framework and package manager.
- Initialize repository and environment templates without real secrets.
- Establish feature boundaries for tourism adapter, normalization, search, proof, relaxation, and course.
- Encode canonical condition keys and tri-state types.
- Add CI-equivalent local commands for lint, typecheck, tests, and build.
- Capture issued-key samples for the MVP list and pet-detail operations and pin sanitized contract fixtures. **Completed for `areaBasedList2` and `detailPetTour2` on 2026-07-16.**

### Gate

- Application starts on mobile and desktop viewports.
- Build, lint, typecheck, and smoke test pass.
- No API key is present in client output or tracked files.
- Raw fixture schema and logical mapping are reviewed against [DATA_SPEC.md](../data/DATA_SPEC.md).

## Phase 1 — Source Ingestion and Evidence Store

### Outcome

Official place records can be fetched, cached, inspected, and replayed without UI dependence.

### Work

- Implement provider adapter, pagination, timeout, bounded retry, and quota errors.
- Store raw snapshots with operation, parameters, checksum, and timestamps.
- Map identity, category, location, contact, media, and operation fields.
- Add synchronization or modified-record refresh where supported.
- Preserve image license/provenance metadata.
- Build a seeded regional dataset for repeatable demos.

### Activation scenarios

- Provider timeout triggers bounded retry and then cached-snapshot behavior.
- Quota response stops repeated calls and surfaces refresh delay.
- Malformed record is isolated while other records continue.

### Gate

- Contract fixtures reproduce the same logical records deterministically.
- Refresh updates changed records without duplicating stable identities.
- Failure paths have observed tests and no secret leakage.

## Phase 2 — Policy Normalization and Exact Matching

### Outcome

Free-text pet policies become versioned tri-state conditions with traceable evidence, and strict AND queries return correct exact results.

### Work

- Build Korean normalization, segmentation, synonym, negation, quantity, and conflict rules.
- Create labeled fixtures for every released condition.
- Store source spans, rule IDs, confidence, and interpretation timestamps.
- Implement exact AND matching and separate unknown/partial groups.
- Implement preference-only minimal relaxation.
- Produce per-condition and multi-condition evaluation reports.

### Activation scenarios

- Positive keyword inside a negative phrase resolves to `false`, not `true`.
- Conflicting source claims resolve to `unknown` and fail exact qualification.
- Zero exact results with one removable preference yields the smallest safe relaxation.
- Zero exact results with hard constraints only yields no relaxation.

### Gate

- Table-driven query matrix passes all true/false/unknown combinations.
- Every exact result has one evidence item per hard constraint.
- Unsafe-relaxation test count is zero.
- Evaluation report meets a predeclared exact-result precision threshold before UI integration.

## Phase 3 — Search, Proof, and Recovery Experience

### Outcome

A guardian completes profile → filters → exact results → proof → safe recovery on a mobile browser.

### Work

- Implement local pet profile and hard/preference classification.
- Implement region and just-in-time nearby search.
- Build condition groups, chips, AND banner, dynamic count, map/list, and result cards.
- Build place detail, proof ledger, official-text block, freshness, and contact/map handoff.
- Build zero-result and unknown/stale recovery states.
- Encode shareable filters without private labels or precise location.

### Activation scenarios

- Location denial presents region selection without dead end.
- API refresh failure shows cached results and age.
- Unknown condition stays outside exact results and announces confirmation need.
- Applying relaxation shows delta, updates results, and supports undo.

### Gate

- Browser E2E proves the primary scenario and all conditional states.
- Keyboard, screen-reader labels, 200% zoom, reduced motion, and map/list parity pass.
- Visual inspection is clean at 390px, 768px, 1024px, and desktop split view.
- Korean headings and descriptions have no orphan or overflow failures.

## Phase 4 — Constraint-Safe Course

### Outcome

The user creates a transparent half-day/day sequence from one exact-qualified result set.

### Work

- Define duration, category, origin, mobility, stop-count, and distance inputs.
- Implement opening-window feasibility and structured unknown warnings.
- Implement category coverage and coordinate ordering.
- Add optional routing adapter behind an explicit route mode.
- Build course timeline, protected-condition summary, stop replacement, and infeasibility explanation.

### Activation scenarios

- No routing provider returns approximate order and distance only.
- Missing opening hours create a warning, not invented availability.
- No category/time-feasible set returns the blocking constraint.
- Stop replacement cannot select a partial or unknown candidate.

### Gate

- Every stop traces to the source exact-search identifier.
- Approximate and routed outputs are visibly and contractually distinct.
- Course scenario tests cover feasible, warning, and infeasible outcomes.
- Demo course completes without manual data edits.

## Phase 5 — Competition Hardening

### Outcome

The service, evidence, submission materials, and fallback demo tell the same verifiable story.

### Work

- Freeze and document the judged demo dataset.
- Run full lint, typecheck, test, build, accessibility, security, and responsive gates.
- Test upstream outage and cold-start behavior.
- Produce evaluation report, architecture diagram, screenshots, slide evidence, and recorded fallback.
- Recheck official competition notice, API operations, traffic policy, and source dates.
- Conduct blind rubric review against implementation, planning, data use, and growth.

### Gate

- Five-minute demo succeeds three consecutive times from a clean browser profile.
- Live and recorded demos use the same product behavior.
- All presentation claims link to code, test, metric, or primary source.
- No temporary data, secrets, broken links, or contradictory documentation remain.

## Deferred Growth Phases

After the competition MVP is verified:

- Venue policy correction and official-owner workflow
- Moderated recent-visit verification
- Weather and reservation integrations
- Native shell if installed use justifies it
- Personalized ranking within exact-qualified results

None may change the exact-match contract without a new product and data review.
