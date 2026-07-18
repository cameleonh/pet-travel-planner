# Size Filter Toggle Hotfix

**Class:** C1 single-surface interaction patch  
**Reason:** A checked pet-size radio could not be cleared by clicking it again, so users had to discover the separate `전체` option before returning to unfiltered browsing.

## Change

- Clicking the currently selected non-null pet size now selects `전체`.
- The helper copy states that clicking the selected size again clears it.
- Playwright covers select → click again → unfiltered browsing restoration.

## Verification

- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npx playwright test e2e/search.spec.ts`: 3 passed, including select → click again → unfiltered browsing restoration.
- Live database API after clearing filters: source and filtered count 9,764, 50 first-page results, page 1 of 196.
