# Phase 3 — Quota Probe and Resume

## Purpose

Determine whether the official allowance has reset without spending detail calls unnecessarily, then resume the already verified checkpoint workflow only when the probe succeeds.

## Execution

1. Call `areaBasedList2` once with one row using the existing issued key. Output only HTTP/provider status and total count; never output the key or URL.
2. Any HTTP, timeout, provider-envelope, or schema failure stops before database access. Classify only HTTP 429/provider code 22 as confirmed quota exhaustion; classify other failures as an inconclusive upstream probe.
3. On a failed probe, require SQLite `integrity_check=ok`, latest successful run 2 / snapshot 2, source total and place total 9,764, fetched 100, pending 9,664, failed 0. Any mismatch is a separate database failure, not a successful quota stop.
4. If the probe succeeds, first prove no sync writer is running, then run `TOUR_API_REQUEST_LIMIT=899 npm run db:sync`. The probe consumes the first request; the existing shared atomic counter covers every list/detail request in the single writer after it.
5. Require a new successful snapshot with fetched coverage above 100, then repeat the existing small/medium/large API and selected/reset browser checks.

## Bounds

- Failed-probe cost: exactly one official request.
- No database write on a failed probe.
- No detail request until availability is proven.
- The existing backup remains the rollback artifact.
