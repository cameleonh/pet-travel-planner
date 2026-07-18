# Phase 1 — Provider and CLI Contract

## Provider selection

Build candidates from the complete deduplicated base catalog and rank them deterministically:

1. rows never fetched or explicitly pending;
2. retry candidates: previously fetched rows whose upstream modification token changed and failed rows.

Select pending rows in stable catalog order. Rotate the retry group by the persisted successful-sync count before filling any remaining budget, so one permanently failing row cannot monopolize retries across restarts. Preserve catalog output order independently from request order.

## Evidence preservation

- A cached row not selected for this batch carries forward its policy text, amenities, observed time, detail status, and old modification token.
- A changed fetched row whose refresh fails carries forward its prior fetched evidence and old token so it remains refresh-eligible.
- A new/pending row whose request fails becomes `failed` without discarding the base place.
- A successful empty detail response is a completed fetch with an explicit upstream-no-detail placeholder.

## Batch orchestration

Add a small testable orchestration function around the existing provider/repository boundary. For each bounded batch it:

1. loads the latest snapshot as cache;
2. builds a fresh provider;
3. publishes through the existing atomic sync path;
4. reconciles fetched/pending/failed counts;
5. stops on completion, no progress, or configured batch count.

The CLI remains the only writer and emits one secret-free JSON summary.

## Tests first

- deferred changed row preserves old evidence/token;
- failed changed-row refresh preserves prior fetched evidence;
- pending rows outrank failed retries;
- persistent retry failures rotate across bounded runs;
- two bounded batches advance beyond the first limit;
- no-progress stops without an unbounded loop;
- upstream batch failure preserves the latest successful snapshot.
