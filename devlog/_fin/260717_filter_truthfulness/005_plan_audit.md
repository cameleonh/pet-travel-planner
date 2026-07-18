# Filter Truthfulness Plan Audit

## Dispatch record

The required independent read-only audit was dispatched twice to one reviewer and once to a separate fallback reviewer. Both distinct agents failed at the response transport boundary with `Encrypted function output content could not be decrypted or decoded`; neither edited the repository. Per the plan escalation rule, the main agent reclaimed the audit using the requested adversarial checklist and exact source inspection.

## Findings and amendments

1. **High — ingestion coverage is not a condition-decision denominator.** `src/data/catalog.ts:50` counts fetched pet-detail rows, but a fetched row may still leave the selected size unknown. The original headline proposal “확인된 100곳 중” would replace one ambiguity with another. **Folded:** the plan now uses `현재 N곳에서 가능을 확인했어요`, keeps the exhaustive three-bucket summary over `searchableCount`, and labels `detailCoverage` separately as `상세정보 수집`.
2. **High — browsing has no filter disposition.** `src/domain/match.ts:16` deliberately marks an empty constraint set non-exact, while it also has no failures. A three-way status attached blindly to every evaluation would mislabel browsing rows. **Folded:** status classification is applied only to a non-empty filtered query, or the domain status includes an explicit `not-evaluated` state; catalog bucket aggregation runs only in filtered mode.
3. **High — a qualifier guard must inspect the containing claim, not only the regex match.** The current positive match begins at `대형견` (`src/domain/normalize.ts:15`), so preceding `17kg 이하 또는 6개월 미만` is absent from `match[0]`. **Folded:** split normalized text into bounded claims/clauses or locate the containing claim by match index, then reject broad size proof when that claim contains weight or age qualifiers.
4. **Medium — false must win over unknown for an exhaustive partition.** Existing `unknownPlaceCount` checks for any unknown (`src/data/catalog.ts:52-54`) and can overlap a known false. **Folded:** `confirmed-non-match` takes precedence whenever any selected fact is explicitly false; otherwise missing/unknown evidence is `unverified`.
5. **Medium — compatibility and relaxation must remain stable.** The result list, pagination, and `findMinimalRelaxation` use exact matches (`src/data/catalog.ts:38-45`). **Folded:** retain `filteredCount` and `unknownPlaceCount` as compatibility aliases, derive candidates/relaxation from the unchanged exact matcher, and add new explicit aggregate fields.
6. **Medium — regex safety needs both positive and negative controls.** A broad qualifier guard could accidentally suppress `전 견종 동반 가능` or plain `대형견 동반 가능`. **Folded:** activation tests cover all-breeds, unqualified size, qualified weight/age, and a sentence containing unrelated numeric text in another claim.
7. **Low — zero-result copy must not imply national impossibility.** Current copy at `src/features/results/ZeroResultRecovery.tsx:9-11` does. **Folded:** state that no qualifying place is confirmed yet and that unverified places may still qualify after policy confirmation.

## Main-agent verdict

All High findings are folded into the implementation plan. The only residual is the failed reviewer-output transport, recorded above; source anchors and activation criteria were independently rechecked by the main agent.

VERDICT: GO-WITH-FIXES (blockers=0)
