# Design System — Pet Travel Planner

---
name: Pet Travel Planner
colors:
  primary: "#176B5B"
  accent: "#BD462F"
  background: "#F6FAF8"
typography:
  heading: { fontFamily: "Noto Sans KR", fontSize: "32px" }
  body: { fontFamily: "Noto Sans KR", fontSize: "16px" }
---

**Status:** Task-first MVP visual system implemented and accessibility-checked; final competition artwork is deferred  
**Last updated:** 2026-07-16

## 1. Design Read

Reading this as a Korean mobile-first consumer travel utility for pet guardians, with the visual language of a compact trip-planning desk rather than a promotional landing page or cute pet store. The interface should feel warm enough for leisure travel but precise enough to communicate admission rules and uncertainty.

**Do:** foreground evidence, make selected constraints tangible, use calm outdoor color, keep dense filters scannable, and make recovery obvious.  
**Do not:** use paw-print decoration everywhere, infantilizing copy, generic glass cards, gradient-heavy backgrounds, emoji as UI icons, or green/red color alone for qualification.

```text
DESIGN_VARIANCE: 5/10
MOTION_INTENSITY: 2/10
Product density profile: D3
Reasoning: The primary job is a short sequence—choose, compare the exact count, inspect proof—so the first viewport favors task clarity over dashboard density or decorative motion.
```

The rendered MVP uses the locked forest-green, coral, paper, evidence, and uncertainty patterns below. Its signature is a compact match bar that visually connects every selected condition to the exact result count. The full-width control surface is primary, results are second, and nearby/course utilities are deliberately subordinate.

### Current product references

- [Airbnb 2026 Summer Release](https://news.airbnb.com/product-releases/airbnb-2026-summer-release/) — opens on trip discovery and planning work instead of a long promotional preface.
- [Airbnb 2025 Winter Release](https://news.airbnb.com/product-releases/airbnb-2025-winter-release/) — nearby landmarks and distances are useful inside map discovery.
- [Wanderlog](https://wanderlog.com/) — keeps itinerary, place order, distance, and map context in one planning flow.
- [BringFido](https://www.bringfido.com/) — uses pet-specific categories and filters as primary information architecture.
- [VISITKOREA](https://korean.visitkorea.or.kr/main/main_mo.do) — validates demand for quick customized travel courses; its many equally prominent modules are a deliberate negative reference for this smaller product.

References supply interaction principles, not a visual template. Runtime screenshots and the product's exact-match safety contract remain authoritative.

## 2. Visual Principles

- **Evidence is the hero:** match proof receives stronger hierarchy than ratings or descriptive copy.
- **The task starts early:** the compact introduction explains the value, then yields immediately to selectable conditions.
- **One dominant state:** the exact result count is visually stronger than nearby and course extensions.
- **Warm precision:** forest green conveys outdoor trust; coral marks the single primary action, not arbitrary decoration.
- **Structured softness:** rounded controls support touch, while cards remain mostly flat and bounded by spacing or subtle borders.
- **Uncertainty is visible:** unknown and stale states use icon, label, and explanation.
- **Photography earns space:** show place imagery where licensed; do not use decorative stock pets as a substitute for product information.

## 3. Token Architecture

Components use semantic tokens. Primitive scales exist only to define them.

```css
:root {
  /* Primitive color */
  --green-50: #eef8f4;
  --green-100: #d7eee6;
  --green-300: #86c5b5;
  --green-500: #176b5b;
  --green-600: #10594c;
  --green-800: #123d36;
  --coral-50: #fff2ee;
  --coral-500: #bd462f;
  --coral-600: #a53b27;
  --neutral-0: #ffffff;
  --neutral-25: #f6faf8;
  --neutral-100: #e9efec;
  --neutral-300: #bac5c0;
  --neutral-600: #59655f;
  --neutral-800: #29332f;
  --neutral-950: #17201c;
  --amber-50: #fff8e8;
  --amber-600: #9a6200;
  --red-50: #fff0ef;
  --red-600: #b43a32;
  --blue-50: #eef6ff;
  --blue-600: #28649c;

  /* Semantic color */
  --color-bg-page: #f3f6f4;
  --color-bg-surface: var(--neutral-0);
  --color-bg-selected: var(--green-50);
  --color-text-primary: var(--neutral-950);
  --color-text-secondary: var(--neutral-600);
  --color-text-on-primary: var(--neutral-0);
  --color-border-default: var(--neutral-100);
  --color-border-selected: var(--green-500);
  --color-action-primary: var(--coral-500);
  --color-action-primary-hover: var(--coral-600);
  --color-match: var(--green-600);
  --color-warning: var(--amber-600);
  --color-danger: var(--red-600);
  --color-info: var(--blue-600);

  /* Spacing: 4px base */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Shape and elevation */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 2px rgb(17 43 35 / 6%);
  --shadow-sheet: 0 -8px 28px rgb(17 43 35 / 12%);

  /* Type */
  --font-sans: "Noto Sans KR", Pretendard, system-ui, sans-serif;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --text-3xl: 34px;

  /* Motion */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --ease-default: cubic-bezier(.4, 0, .2, 1);
  --ease-out: cubic-bezier(0, 0, .2, 1);

  /* Layer */
  --z-base: 0;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 600;
  --z-tooltip: 700;
}
```

## 4. Color Usage

- Forest green indicates verified match, selection context, and brand identity.
- Coral is reserved for the primary action and active course progression.
- Amber indicates stale or confirmation-needed states.
- Red indicates a known failed condition or destructive action.
- Blue indicates neutral information such as external navigation handoff.
- Normal text must meet WCAG 2.2 AA contrast; interactive boundaries require at least 3:1 against adjacent colors.
- Dark mode is postponed until the light theme passes accessibility and outdoor readability tests; it must be derived, never inverted.

## 5. Typography

- Bundled Noto Sans KR is the Korean-first UI family, with Pretendard and system UI fallbacks.
- Body: 16px/1.55; supporting text: 14px/1.5; labels: 12–14px/1.35.
- Page title: 28–34px, weight 700; section title: 20–22px, weight 700; card title: 17–18px, weight 650.
- Korean uses `word-break: keep-all` and safe overflow wrapping.
- Headings and short descriptions use balanced wrapping; body paragraphs use readable measure up to 65ch.
- Buttons, badges, chips, and navigation labels never wrap.

## 6. Layout

### Mobile

- Primary canvas: 320–480px; page gutters reduce from 16px to 10px at the narrowest supported width.
- Header and task introduction stay compact. Size controls remain a comparable three-column row; required conditions stack below 640px.
- Results follow the controls in document order. Nearby and course utilities stack after the exact result and recovery state.
- There is no decorative bottom navigation or hidden filter sheet in the MVP.

### Tablet and desktop

- Content max width: 1200px.
- Size and condition groups share one full-width control surface at 1024px and above, then stack without changing semantics.
- Results span the content width. Nearby and course utilities use a 1.15/0.85 supporting grid and stack below 1024px.
- The MVP does not include a map; straight-line nearby ordering and the external Kakao Maps handoff are represented in accessible text.

## 7. Component Inventory

### Implemented product components

- `PetProfilePanel`: three comparable radio choices with size ranges.
- `ConditionPicker`: hard-condition toggle group plus a separately labelled removable preference.
- `MatchBar`: active hard conditions and preferences adjacent to the live exact count.
- `ResultCard` and `MatchProof`: place identity, proof preview, evidence excerpt, and original-source handoff.
- `ZeroResultRecovery`: reason, protected-condition message, projected count, and explicit preference removal.
- `NearbyCatalog`: confirmed and phone-confirmation groups with opt-in location ordering.
- `CourseBuilder` and `CourseTimeline`: current exact results only, approximate order disclosure, and external directions.
- `LoadingShell`: task-shaped skeleton rather than an unexplained blank page.

## 8. Component State Rules

### Condition control

- Unselected: neutral surface and border
- Selected preference: green tint, green border, checkmark
- Selected hard constraint: stronger green tint and a text-independent checkmark with `aria-pressed` state
- Disabled: reduced contrast but still readable; explain why on interaction
- Never use a close icon on a locked hard constraint inside relaxation UI

### Place card

- The first semantic line after title is exact-match proof, not marketing copy.
- Display no more than three proof chips before “See all.”
- Unknown or stale state must not visually resemble verified green.
- Whole-card click may open detail, but save and external actions remain separate focus targets.

### Minimal relaxation state

- Start with “Your required conditions remain protected.”
- Show before/after filter set and projected count.
- One primary action applies the proposed preference change.
- Never preselect a hard-constraint change.

## 9. Motion

- Filter count and chip state: 150ms feedback.
- No bottom sheet is used in the MVP.
- Result replacement is immediate; layout motion is not required to understand the change.
- Course timeline may reveal stops sequentially once; no looping decoration.
- Skeleton shimmer respects reduced-motion preference.
- Motion never delays access to evidence or hides state change.

## 10. Content Style

- Use direct Korean UI copy, short verbs, and concrete condition names.
- Say “확인되지 않았어요” rather than implying a policy.
- Say “필수 조건은 그대로 유지돼요” in no-result recovery.
- Say “대략적인 방문 순서” when routing is absent.
- Avoid “AI 추천,” “완벽한,” “무조건 가능,” and other certainty claims unsupported by evidence.
- Do not use emoji as navigation or state icons.

## 11. Accessibility

- Minimum target: 44×44 CSS pixels.
- Visible focus on every interactive control.
- Selected, failed, warning, and unknown states combine text, icon, and color.
- Result-count changes and applied relaxations use polite live announcements.
- Map markers have list equivalents and meaningful accessible names.
- Support keyboard operation, 200% zoom, reduced motion, and platform text scaling.
- Error and empty states always provide recovery.

## 12. Verified MVP Design Gate

1. The product name is `함께갈지도`; the compact text mark remains replaceable submission artwork.
2. Axe WCAG 2 A/AA reports no serious or critical violation in the primary flow.
3. Keyboard state, skip navigation, 44px controls, visible focus, text-plus-color state, and reduced-motion behavior are implemented.
4. Default screens were observed at 320, 390, 768, 1024, and 1440px; zero-result recovery was also observed at 390px.
5. Search, proof, recovery, nearby location denial, and exact-result-only course behavior are covered by Playwright.
6. A fresh browser reload reached network idle with no console errors.
