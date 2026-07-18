# Phase 2 — Live Enrichment and UI Validation

1. Record the current successful snapshot ID and fetched/pending/failed counts. Run `npm run db:backup`; require the backup command's reopen/integrity check to pass before any live request.
2. Use explicit local settings: `TOUR_API_DETAIL_LIMIT=50`, `TOUR_API_SYNC_BATCHES=14`, `TOUR_API_REQUEST_LIMIT=900`, page size 1,000, concurrency 5. Fifty is an atomic checkpoint size, not a catalog ceiling: up to 14 snapshots advance 700 details while the shared request budget covers list and detail operations across the whole invocation and fails closed before request 901.
3. Run `npm run db:sync` once. Its output must explicitly project only configuration, request count, snapshot/run IDs, stop reason, and before/after aggregate counts.
4. On success, require SQLite integrity, a new successful snapshot ID, exact fetched+pending+failed reconciliation, and fetched coverage above 100. On error, require the previous snapshot ID and aggregates to remain active before any retry.
5. Start the built app in database mode with a recorded PID/session. Query `/api/places` unfiltered and with `hard=smallDog`, `hard=mediumDog`, and `hard=largeDog`; require each response's searchable count and three disposition counts to reconcile and reflect the latest snapshot.
6. Run the existing Playwright size-toggle regression against database mode, inspect the rendered initial/selected/reset states, then terminate the server in both success and failure paths and confirm the port is released.
7. If the development allowance blocks a batch, retain the latest successful per-50 checkpoint and document the operating-account traffic increase as the required completion action. Preserve only the verified backup and numbered evidence artifacts.
