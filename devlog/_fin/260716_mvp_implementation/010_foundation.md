# Phase 0 — Repository and executable shell

## Change map

- NEW `package.json`, `package-lock.json`: pinned scripts and dependency graph.
- NEW `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`: strict build and test contracts.
- NEW `.gitignore`, `.env.example`: exclude secrets and document the optional official provider.
- NEW `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/manifest.ts`: Korean PWA shell and design tokens.
- NEW `src/data/contracts.ts`: provider-neutral raw tourism and auxiliary POI schemas.
- NEW `src/data/providers/provider.ts`, `fixture-provider.ts`, `tour-api-provider.ts`, `index.ts`: server-only provider boundary and validated mode selection.
- NEW `src/data/fixtures/*.json`: deterministic sanitized tourism and auxiliary data with stable IDs.
- NEW `src/app/api/places/route.ts`: stable response envelope and request ID.
- NEW `src/**/*.test.ts`: provider and contract tests.
- MODIFY `README.md`, `docs/architecture/ARCHITECTURE.md`, `STATUS.md`: concrete stack and commands after verification.

## Acceptance and activation scenarios

- `npm run dev` renders a Korean app shell at 390px and 1280px.
- `DATA_PROVIDER=fixture` returns deterministic parsed records with no network access.
- Missing/invalid `DATA_PROVIDER` activates the safe fixture fallback and exposes `meta.provider=fixture`.
- `DATA_PROVIDER=tour-api` without `TOUR_API_KEY` activates a typed configuration error; the secret is never sent to the client or logs.
- `npm run lint`, `npm run typecheck`, focused tests, and `npm run build` exit 0.

## Scope boundary

This phase does not implement final matching, filtering, nearby ranking, or courses. It establishes contracts they can consume without framework coupling.
