# MVP Implementation Unit

## Loop specification

- Archetype: spec-satisfaction repair.
- Trigger: the approved product documents define a complete product, but the repository has no executable application.
- Goal: deliver a competition-ready Korean mobile-first pet travel PWA whose hard-condition matches are trustworthy and explainable.
- Non-goals: production deployment, paid APIs, issued credentials, prohibited scraping, real-time venue guarantees, and copied third-party code or assets.
- Verifier: `npm run check`, `npm run test:coverage`, `npm run test:e2e`, `npm run build`, rendered screenshots, and the goalplan evidence ledger.
- Stop condition: all five work phases and twelve goal criteria are proven, or a recorded terminal condition is reached.
- Memory: this implementation unit, `STATUS.md`, and `.codexclaw/goalplans/build-and-fully-verify-a-competition-ready-korea/`.
- Resource bounds: writes stay under this project; network is limited to official documentation, npm, and authorized public APIs; no paid calls; no credentials are requested or persisted; each command is bounded to 15 minutes and retry policy follows LOOP-REPAIR-01.
- Escalation: credentials or production deployment require user authority; unsafe/legal ambiguity terminates as UNSAFE or NEEDS_HUMAN.

## Locked architecture

- Next.js App Router on Node.js 20.9+ with strict TypeScript. The official installation page was verified on 2026-07-16 and supports this baseline.
- Modular monolith: Server Components for initial data, Client Components only for interactive selection, route handlers for provider-backed reads.
- Deterministic sanitized fixtures are the default provider. An issued-key provider is selected only through validated server environment configuration.
- Domain logic is framework-free under `src/domain/`; external payload parsing is isolated under `src/data/providers/`.
- CSS Modules/global tokens implement the locked `DESIGN.md` direction without a component-framework dependency.

## Dependency-ordered work phases

1. `010_foundation.md`: executable shell, contracts, fixtures, base quality gates.
2. `020_matching_domain.md`: tri-state normalization, evidence, strict AND, relaxation.
3. `030_search_experience.md`: clickable pet profile, proof-first results, recovery UI.
4. `040_nearby_course.md`: nearby auxiliary catalog and exact-qualified course generation.
5. `050_hardening.md`: adversarial QA, accessibility, security, documentation, evidence.

No later phase may weaken the invariants proven by an earlier phase.
