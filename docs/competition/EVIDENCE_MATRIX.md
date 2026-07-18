# Competition Evidence Matrix

**Evidence date:** 2026-07-16  
**Interpretation:** “Verified” means supported by a fresh automated check or observed artifact in this repository. It does not mean real-time venue truth.

| Product claim | Verification | Persisted evidence |
|---|---|---|
| Unknown never satisfies a selected hard condition | Exhaustive tri-state and focused domain tests | `devlog/_fin/260716_mvp_implementation/029_domain_check.md` |
| Every exact result has one proof per selected condition | Domain proof-completeness test and browser proof expansion | `029_domain_check.md`, `039_search_check.md`, `evidence/030_search_mobile_default.png` |
| Zero-result recovery removes preferences only | Protected-category and duplicate-key adversarial tests; browser recovery flow | `029_domain_check.md`, `039_search_check.md` |
| Search works without natural-language input | Touch/keyboard Playwright flows | `039_search_check.md`, `evidence/031_search_zero_recovery.png` |
| Nearby places distinguish confirmed from unknown pet status | Haversine/status unit tests and browser assertions | `049_nearby_course_check.md`, `evidence/045_extensions_fixed.png`, `evidence/046_nearby_mobile_card.png` |
| Location denial has a safe non-persistent fallback | Browser denial scenario | `049_nearby_course_check.md`, `evidence/043_location_fallback.png` |
| Courses contain exact-qualified stops only | Non-exact rejection unit test and two-stop browser flow | `049_nearby_course_check.md`, `evidence/042_course_result.png` |
| Approximate mode does not invent travel time | Course contract test and negative browser assertion for minute text | `049_nearby_course_check.md`, `evidence/042_course_result.png` |
| Malformed queries and provider data fail closed | API browser tests and provider/schema tests | `059_hardening_check.md` |
| Security headers and dependency state are checked | Browser header assertions and `npm audit` | `059_hardening_check.md` |
| Responsive/accessibility behavior is inspected | Keyboard and axe test; observed 390px and desktop screenshots | `039_search_check.md`, `049_nearby_course_check.md` |
| The app can use the official provider only from the server boundary | Issued-key live API smoke plus official-shaped adapter contract tests | `src/data/providers/providers.test.ts`, `STATUS.md` |

## External boundary

Issued-key calls to `areaBasedList2` and `detailPetTour2` succeeded on 2026-07-16, and the consumed mapping is pinned in sanitized contract tests. This proves provider integration, not real-time venue truth; upstream availability, quota, and policy freshness remain external.
