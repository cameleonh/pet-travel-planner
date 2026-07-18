# Phase 4 — Competition hardening and evidence

## Change map

- NEW `e2e/adversarial.spec.ts`: malformed query, empty data, provider failure, keyboard, and viewport cases.
- NEW `docs/competition/DEMO_SCRIPT.md`, `docs/competition/EVIDENCE_MATRIX.md`: judge-facing scenario and claim-to-proof map.
- NEW `devlog/_fin/260716_mvp_implementation/evidence/`: C4 screenshots, traces, and command transcripts after archival.
- MODIFY `README.md`, `PRD.md`, `DESIGN.md`, `STATUS.md`, architecture/data/user-flow/competition docs to match verified behavior.
- MODIFY test and build configuration only to strengthen—not lower—gates.

## Acceptance and activation scenarios

- Fixture corruption, unavailable live provider, empty results, denied geolocation, hard UNKNOWN, and protected relaxation are each triggered and observed.
- Lint, typecheck, unit/property/contract tests, browser/axe tests, production build, and dependency audit receive explicit dispositions.
- Mobile and desktop screenshots are read back and repaired until one clean observation remains.
- The implementation unit moves to `devlog/_fin/` only after the goalplan criteria contain fresh captured evidence.
- Final `cxc loop validate` passes and PABCD closes to IDLE before the host goal is completed.
