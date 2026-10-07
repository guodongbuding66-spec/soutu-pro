# Verification Audit Trail — V9.2 step 7 / release 9.4.4

Enter **研究 → 证据 → 核验证据**. Set the decision and optional final adjudication, enter the reviewer name and a reason for each changed record, then save. Expand **审核历史** to inspect each event or stage an undo/restore. These actions take effect only after saving; cancelling discards the draft.

## Data and behavior

`verification-audit.js` owns snapshot normalization, identity, event merging, revisions, history, and JSON/CSV serialization. `evidence-verification.js` owns the workspace and coordinated Evidence/Case writes. The runtime loader, standalone build, service worker, static checks, browser regression and production smoke all include the module.

- Every change appends an event under `verificationHistory`, including a stable event ID, evidence identity, sequence, action, actor, timestamp, reason, complete before/after snapshots, and a target event ID for undo/restore.
- Current human decisions remain under `verification`. Machine-inferred lineage fields remain unchanged.
- An unchanged save adds no events and leaves the original review timestamp intact.
- An old verification snapshot becomes a `legacy-baseline` with no invented before-state. Earlier unrecorded edits cannot be reconstructed.
- Evidence copies in every associated Case synchronize by `lineageKey`, retaining each copy's original Evidence ID. Case summaries include current decisions, audit event count, reversals and final adjudications.
- Re-importing the same lineage retains existing IDs, human decisions and histories. Opening a stale Case resolves its history from current Evidence and all Case copies.
- Workspace saves reject a stale revision, a missing Evidence target, conflicting events or missing attribution/reasons. A failed Case write rolls back the preceding Evidence write; an unsuccessful rollback is reported explicitly.
- No count/quota fallback silently truncates existing Evidence or its audit history. Result/image compaction is still available separately.

## Reports and exports

The actual **报告 / PDF** action includes the verification section and **Verification Audit Trail**, with per-event reasons, actors, timestamps and before/after values. Existing verification JSON now also carries `verificationHistory` without changing its v1 schema. Dedicated audit JSON uses `soutu-pro.verification-audit.v1`; audit CSV provides one event per row with complete snapshots and Case IDs. CSV neutralizes spreadsheet formula prefixes; JSON is the lossless format.

## Limits

This is a browser-local audit history, not a signed or tamper-proof server ledger. Reviewer names are entered by the user and are not authenticated identities. Clearing browser data or explicitly deleting Evidence/Cases can remove records. Revision checks prevent ordinary stale-workspace saves; localStorage cannot guarantee a transaction across keys or simultaneous cross-tab writes. Verified/final adjudication concerns a candidate relationship and does not establish original ownership.

## Validation

- `npm run check`: existing regressions plus audit behavior tests (append/no-op, migration, undo/restore, stale revision, identity, Case sync, rollback, export).
- `tests/verification-audit.spec.mjs`: real controls, repeated saves, cancellation, stale draft protection, stale Case opening, repeated lineage handoff, actual report button, JSON/CSV downloads, printed PDF artifact, and 390px mobile layout.
- Full browser suite: 38 tests, including the prior search, price, competitor, lineage and verification suites.
