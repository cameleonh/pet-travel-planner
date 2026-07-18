# Phase 1 — Product Foundation Documents

## Dependency Order

1. Define product promise, users, scope, and acceptance criteria in `PRD.md`.
2. Define source/derived/unknown data semantics in `docs/data/DATA_SPEC.md`.
3. Define user interaction and recovery behavior in `docs/product/USER_FLOWS.md`.
4. Persist visual tokens and component behavior in `DESIGN.md`.
5. Map logical boundaries and data flow in `docs/architecture/ARCHITECTURE.md`.
6. Translate the product into a judging and demo narrative in `docs/competition/COMPETITION_STRATEGY.md`.
7. Order implementation by verified dependency in `docs/roadmap/MVP_ROADMAP.md`.
8. Cross-link the set from `README.md` and persist continuity in `STATUS.md`.

## Document Contracts

- `PRD.md` owns product behavior and MVP priority. Other documents must not redefine scope.
- `PRD.md` owns the canonical product glossary and the hard-constraint versus preference distinction.
- `DATA_SPEC.md` owns field meaning, provenance, confidence, parsing, and unknown handling.
- `DATA_SPEC.md` owns freshness thresholds and verification status; `ARCHITECTURE.md` owns how those values are computed and served.
- `USER_FLOWS.md` owns sequence, screen states, and user-facing recovery.
- `DESIGN.md` owns tokens, components, visual hierarchy, motion, and accessibility.
- `ARCHITECTURE.md` owns component boundaries and operational data flow.
- `COMPETITION_STRATEGY.md` owns presentation positioning, not product requirements.
- `MVP_ROADMAP.md` owns implementation order and phase gates.
- `STATUS.md` owns current verified project state and exact next action.

## Conditional-Path Activation Scenarios

| Path | Trigger | Observable behavior |
|---|---|---|
| Unknown condition | Required field has no source or parse evidence | Place is excluded from guaranteed results and labeled unknown elsewhere |
| Zero exact matches | AND-filter result count reaches zero | Minimal relaxation considers only user-marked preferences; hard safety, legal, accessibility, and admission constraints remain locked |
| Stale policy | Source is older than the freshness threshold | Result shows a verification warning and contact action |
| Course infeasible | No candidate sequence fits category, distance, and opening-hour constraints | Course is not fabricated; the system explains which constraint blocks it |
| Approximate course | No external routing provider is configured | Places are ordered by coordinates and clearly labeled as an approximate order without promised travel time |
| API failure | Upstream request fails or quota is exhausted | Cached data is shown with freshness state, or a recoverable error is displayed |

## Completion Evidence Required

- Manifest completeness check
- Markdown link check
- Terminology and priority consistency search
- Independent audit verdict
- Final tree and status update

## Audit Recovery Note

Two independent reviewer agents failed before returning findings because their encrypted tool output could not be decoded. The main agent reclaimed the audit packet, identified the unsafe-relaxation and evidence-boundary blockers above, amended the plan, and will run a fresh line-anchored self-audit before advancing.
