# Plan Audit

## Automated pre-scan

The two requested independent reviewer attempts failed before returning findings because the agent transport could not decrypt tool output. The primary agent therefore reclaimed the audit using the same code-review and official-source rules.

## Findings

### High — quota failures must not be treated as ordinary row failures

- Trigger: `detailPetTour2` returns HTTP 429 or provider result code 22 during a batch.
- Impact: all remaining workers would continue issuing doomed requests and the snapshot could relabel hundreds of pending rows as failed.
- Location: `src/data/providers/tour-api-provider.ts`, detail worker loop.
- Required fix: classify quota exhaustion as a fatal provider error, stop scheduling new detail requests, and reject the snapshot so the prior successful checkpoint remains active.

### High — cached evidence can be erased when refresh is deferred

- Trigger: a fetched cached row has a changed upstream token but lies outside the detail budget.
- Impact: its known policy is replaced by the unknown placeholder and it can cease to be refresh-eligible.
- Location: `src/data/providers/tour-api-provider.ts`, place construction.
- Required fix: carry forward cached policy, amenities, observed time, status, and old token until a successful refresh.

### High — historical failures can starve unattempted rows

- Trigger: failed rows occur before pending rows in catalog order on every invocation.
- Impact: repeated batches retry the same failures and never reach the catalog tail.
- Location: `src/data/providers/tour-api-provider.ts`, detail target selection.
- Required fix: rank changed fetched rows first, pending rows second, failed retries last; retain final catalog order in output.

### Medium — multi-batch mode needs an explicit no-progress bound

- Trigger: a configured invocation requests multiple batches but every detail response fails ordinarily.
- Impact: repeated full-catalog calls consume allowance without increasing coverage.
- Location: sync CLI orchestration.
- Required fix: reconcile coverage after every published batch and stop immediately when fetched coverage does not increase.

## Verdict

The plan is executable after incorporating all four findings into regression tests and implementation.

VERDICT: GO-WITH-FIXES (blockers=4)
