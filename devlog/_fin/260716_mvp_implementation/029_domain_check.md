# Matching Domain Check Evidence

**Outcome:** PASS

- `npm run check` — exit 0; ESLint, TypeScript, and 14 tests across 2 files passed.
- Exhaustive test evaluated all 27 combinations of three tri-state facts; exactly one all-TRUE combination qualified.
- UNKNOWN hard-condition test produced one proof and one explicit `unknown` failure, never an exact match.
- Proof completeness test returned three source-backed proof objects for three selected constraints.
- Relaxation tests proved the smallest ordinary preference is removed while hard and safety/legal/access/admission constraints are never removed.
- Adversarial duplicate-key regression proved a same-key preference cannot remove the hard constraint.
- `npm run test:coverage` — exit 0; 91.22% lines, 90.58% statements, 79.24% branches, 95.23% functions across provider and domain code.
- `npm run build` — exit 0.
- Production `GET /api/places?conditions=indoor,leash` returned one exact result with two proof entries (`indoor`, `leash`).
- Duplicate query `conditions=leash,leash` returned HTTP 400 with `INVALID_QUERY`.

Residual: deterministic Korean rules intentionally favor precision over recall; unknown-rate measurement will drive later vocabulary expansion.
