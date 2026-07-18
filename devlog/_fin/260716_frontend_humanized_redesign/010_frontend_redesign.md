# Phase 1: Humanized Frontend Redesign

## Scope

### In

- Humanize every visible Korean string in the primary search, zero-result, proof, nearby, and course flow.
- Replace the landing-page hero with a compact task introduction.
- Recompose the search controls as the first primary surface and strengthen the live result summary.
- Reduce card/shadow/radius repetition and establish clear primary, secondary, and supporting surface levels.
- Preserve responsive, keyboard, accessibility, exact-match, recovery, geolocation, and course behavior.
- Update E2E selectors only where user-visible copy intentionally changes.

### Out

- Backend, provider, normalization, matching, relaxation, geolocation, and course algorithms.
- New maps, saved places, regional filtering, images, accounts, analytics, dependencies, or design generators.
- Dark mode and animation systems.

## Diff-Level File Map

### MODIFY `src/app/page.tsx`

- Replace the large marketing hero and three trust pills with a compact, left-aligned task introduction.
- Keep the provider badge and fallback notice semantics.
- Preserve the page/footer data warnings while shortening their copy.

### MODIFY `src/app/layout.tsx`

- Humanize metadata title and description without changing application identity.
- Add a keyboard-visible skip link that targets the search workspace.

### NEW `src/app/loading.tsx`

- Render a semantic, non-interactive skeleton that matches the compact task introduction, control surface, and result surface.
- Keep the loading copy direct and expose it with a polite status role.

### MODIFY `src/features/search/SearchExperience.tsx`

- Keep state and domain calculations unchanged.
- Recompose the filter controls and results into a task-first workflow.
- Add a readable live result summary and a compact condition-to-result bar using existing constraints.
- Add the stable `#search` skip-link target.
- Humanize unknown-place disclosure.

### MODIFY `src/features/search/PetProfilePanel.tsx`

- Remove numbered step language.
- Shorten legend and helper copy.
- Preserve radio semantics and labels used by tests.

### MODIFY `src/features/search/ConditionPicker.tsx`

- Replace decorative glyph tiles with a state indicator derived from `aria-pressed` state.
- Shorten required/preference wording.
- Preserve buttons and condition keys.

### MODIFY `src/features/results/ResultCard.tsx`

- Make place identity and verified-condition summary the first scan path.
- Preserve evidence preview and category information.

### MODIFY `src/features/results/MatchProof.tsx`

- Humanize the disclosure and source link labels.
- Preserve `details`, evidence excerpts, and source URLs.

### MODIFY `src/features/results/ZeroResultRecovery.tsx`

- Replace defensive wording with state, reason, and next action.
- Keep protected conditions explicit.
- Make the relaxation button name the removed preference and result count.

### MODIFY `src/features/nearby/NearbyCatalog.tsx`

- Shorten the heading, location status, confirmed/needs-call labels, and button.
- Preserve geolocation privacy and straight-line-distance disclosure.

### MODIFY `src/features/course/CourseBuilder.tsx`

- Reframe the course as a follow-up action on the current exact results.
- Preserve the disabled state and exact-result-only contract.

### MODIFY `src/features/course/CourseTimeline.tsx`

- Humanize approximate-route disclosure and external map action.
- Preserve distance-only claims and absence of fabricated travel time.

### REWRITE `src/app/globals.css`

- Reuse existing semantic colors while tuning the page background, contrast, and surface hierarchy.
- Use a compact sticky top bar, restrained task intro, full-width control surface, and a dominant result surface.
- Remove diffuse shadows from bordered panels and reduce excessive radii.
- Define explicit T1/T2/T3/T4/T5 responsive transforms at 640, 768, 1024, and 1280 pixels.
- Enforce 44px targets, visible focus, balanced Korean headings/descriptors, safe-area padding, reduced motion, and page containment.
- Keep coral on recovery action only; selected/verified states remain green; unknown stays amber.

### MODIFY `e2e/search.spec.ts`

- Update intentional copy-based selectors.
- Preserve the exact-match, proof, relaxation, protected-condition, keyboard, and axe assertions.

### MODIFY `e2e/course.spec.ts`

- Update intentional nearby/course copy selectors.
- Preserve geolocation denial, exact-result-only course, distance disclosure, and no-fake-minutes assertions.

### MODIFY `DESIGN.md`

- Replace the stale landing-like hierarchy with the implemented D3 task-first design read.
- Record reference URLs and the match-bar signature.

### MODIFY `STATUS.md`

- Record changed frontend behavior and fresh automated/render evidence.

## Acceptance Criteria

1. At 1440x900 and 390x844, users can see and use pet size and required-condition controls without scrolling past a large marketing hero.
2. The result count is the single most prominent state after the controls; surrounding sections are visually subordinate.
3. Default fixture state still shows one exact place, three proof rows, and the current condition set.
4. **Zero-result activation:** select medium dog with carrier preference. The UI shows zero results, explains excluded unknowns, and offers a preference-only relaxation. Applying it yields one exact result.
5. **Protected-condition activation:** select large dog. The UI keeps required conditions and provides no unsafe automatic relaxation.
6. **Proof activation:** expand a result proof. All evidence excerpts and original source links remain accessible.
7. **Geolocation-error activation:** deny location permission. The nearby section falls back to the reference place and states that the distance is straight-line.
8. **Course activation:** remove carrier preference, build a course, and verify only exact results appear with straight-line distances and no travel-minute claim.
9. No visible Korean copy contains defensive phrasing, internal terms such as `AND 정확 검색`, or numbered decorative step labels.
10. No serious/critical axe violation, clipped Korean label, horizontal overflow, hidden focus, or sub-44px primary target is present at 320, 390, 768, 1024, and 1440 pixels.
11. **Loading activation:** start an uncached live-provider navigation and observe the task-shaped loading surface before the first response. The page must not present an unexplained blank viewport during the upstream wait.
12. Keyboard focus can move directly from the top of the document to `#search` through a visible skip link.
13. `DATA_PROVIDER=fixture npm run verify` exits 0.

## Rollback

All changes are limited to UI source, CSS, E2E selectors, and documentation. Reverting this phase restores the prior visual system without data migration or contract rollback.
