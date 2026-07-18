# Phase 4 Plan Audit — Competition hardening

**Date:** 2026-07-16  
**Reviewer:** Main-session recovery audit after two independent reviewer dispatches failed with undecodable encrypted tool output  
**Verdict:** PASS

## Diff and risk review

1. `src/data/providers/providers.test.ts` will activate upstream non-OK, malformed payload, empty snapshot, and schema-corruption branches. This closes degraded-data evidence without changing production provider behavior.
2. `e2e/adversarial.spec.ts` will exercise invalid and duplicate API queries, security headers, and desktop extension non-overlap. These are observable contracts not sufficiently proved by compilation.
3. `package.json` will add one deterministic `verify` composition from existing gates. It adds no dependency and lowers no threshold.
4. `docs/competition/DEMO_SCRIPT.md` and `EVIDENCE_MATRIX.md` will distinguish verified fixture behavior from external issued-key evidence. No live-data or real-time claim is allowed.
5. Canonical documents will be synchronized only after fresh gates pass. The devlog moves to `_fin` only after every criterion contains evidence.

## Adversarial checks

- Invalid query vocabulary and duplicate conditions return a stable 400 envelope, not a stack trace.
- Provider non-OK and malformed payloads fail closed and do not echo credentials in error messages.
- A schema-invalid coordinate cannot enter the normalized application state.
- An empty but valid provider snapshot is treated as valid empty data, not corruption.
- The repaired desktop layout keeps the filter row above the full-width extension row.

## Stop condition

Proceed to BUILD because the plan is bounded, reversible, dependency-free, and maps directly to criteria c10 and c11. Close only after verify, visual observation, document consistency, goalplan validation, and IDLE state all pass.
