# Search Experience Check Evidence

**Outcome:** PASS

- `npm run check` passed ESLint, TypeScript, and 14 domain/provider tests.
- `npm run test:e2e` passed 2 Playwright flows against a real Next.js server.
- The click-only flow proved default exact result and 3-item proof, medium-dog 0 results, explicit removal of only the carrier preference, recovered exact result, and large-dog hard UNKNOWN protection.
- The keyboard flow focused/checked the size radio and toggled a condition button with Enter.
- Axe WCAG 2 A/AA found one serious contrast issue in the original coral token; `#F26B4E` was replaced by `#BD462F`, and the same scan passed with zero serious/critical violations.
- `npm run test:coverage` passed with 91.22% lines and 79.24% branches over provider/domain code.
- `npm run build` passed; `npm audit --audit-level=moderate` reported zero vulnerabilities.
- Mobile default, zero-result recovery, recovered result, and desktop screenshots were rendered and read back with no console errors.

Evidence: `evidence/030_search_mobile_default.png`, `031_search_zero_recovery.png`, `032_search_mobile_recovered.png`, `033_search_desktop.png`.
