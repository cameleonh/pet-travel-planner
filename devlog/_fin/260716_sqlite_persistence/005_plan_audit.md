# SQLite Persistence Plan Audit

## Audit ownership

Two independent native reviewer attempts failed before producing findings because their encrypted tool output could not be decoded. Per the plan's delegation retirement rule, the main agent reclaimed the audit. No implementation was started before this audit was recorded.

## Evidence reviewed

- Existing provider, matcher, API, page, component, and E2E contracts
- Installed runtime: Node 22.22.2
- A direct `node:sqlite` import, which worked but emitted `ExperimentalWarning`
- Official Node SQLite stability documentation
- `better-sqlite3` 12.11.1 package and transaction/backup capabilities
- Next.js native server-package externalization behavior
- The P-phase file map, activation matrix, transaction contract, and rollback boundary

## Blocking findings and folded fixes

1. **Runtime stability blocker.** The original plan selected `node:sqlite`, but the installed Node 22 runtime still labels it experimental. The plan now selects pinned `better-sqlite3` 12.11.1 behind the same repository seam, adds pinned types, and keeps Node 22 as the supported runtime floor.
2. **WAL backup blocker.** Copying only the main SQLite file after a checkpoint can still produce an inconsistent operational procedure if another process writes or holds WAL state. The plan now requires SQLite's online backup API and validates the resulting backup by reopening it before success is reported.

## Non-blocking controls confirmed

- Fetch and provider validation occur before the short publication transaction.
- Failed sync attempts cannot replace the last successful snapshot.
- Database-empty fallback is typed, distinct, and activation-tested.
- The unfiltered catalog is presentation-only; course construction receives exact-qualified rows only.
- API credentials and browser location never enter the database.
- The initial store has one CLI writer, short readers, foreign keys, WAL, bounded detail concurrency, migration tracking, and a documented full-backup recovery path.
- Source archival is explicitly a validated logical snapshot, not a claim of complete raw upstream envelope retention.

## Residual risk

`better-sqlite3` is a native dependency, so installation/build compatibility must be proven on the actual Windows-mounted development environment. The live official sync remains credential- and upstream-dependent; fixture-backed integration tests isolate application correctness from that external risk.

## Verdict

**GO-WITH-FIXES (blockers=2).** Both blockers are folded into the plan. The residual risks are covered by dependency installation, real-file integration tests, backup reopen validation, live sync evidence, and the full verification gate.
