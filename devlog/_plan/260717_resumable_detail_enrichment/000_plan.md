# Resumable Pet-Detail Enrichment

## Outcome

Replace the accidental 100-place ceiling with a deterministic, restartable enrichment flow that preserves every previously published fact while advancing through the complete official catalog.

## Evidence and constraints

- The latest SQLite snapshot contains 9,764 catalog places but only 100 fetched pet-detail records.
- `areaBasedList2` supplies the complete base catalog; `detailPetTour2` supplies pet-policy fields per content ID.
- The official `petTourSyncList2` operation returns a 10,155-row synchronization catalog with base fields and `showflag`, but its observed response does not contain the pet-policy fields used by matching.
- The official development account traffic allowance is 1,000 requests. The operating account can request a higher allowance after registering a use case.
- Existing append-only SQLite snapshots are the checkpoint. No queue, scheduler, schema migration, or new dependency is required.

## Work phases

1. Lock provider resume and preservation semantics with regression tests.
2. Implement deterministic target priority and cached-evidence preservation.
3. Add bounded multi-batch CLI progress and no-progress stopping.
4. Pass focused and full quality gates.
5. Back up SQLite, run one quota-safe issued-key batch, and validate API/UI counts.

## Resource bounds

- Credential scope: the issued Tourism API key in `.env.local`; never print the key or constructed request URL.
- Write scope: provider, sync CLI/orchestrator tests, `.env.example`, database documentation, devlog evidence, and the local SQLite snapshot/backup.
- Live-call budget: at most 800 detail calls plus catalog pagination in the first live batch, leaving headroom under the 1,000-request development allowance.
- Concurrency: maximum 20, configured at 5 by default.
- Stop conditions: configured batch count reached, fetched coverage stops increasing, catalog becomes complete, or the provider returns an upstream/quota error.
- Recovery: every successful batch publishes atomically; a failed batch leaves the latest successful snapshot available.

## Acceptance

- Unchanged fetched rows make no detail call.
- Changed fetched rows retain prior evidence and remain refresh-eligible if their refresh is deferred or fails.
- Pending rows are selected before historical failures, so failures cannot starve the catalog tail.
- Repeated batches increase coverage monotonically across process restarts.
- The CLI reports before/after coverage, pending/failed counts, batches completed, and stop reason.
- Full static, unit/integration, production build, live database, API, and rendered checks pass or identify the official quota as the sole external gap.
