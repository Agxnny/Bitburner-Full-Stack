# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation and runtime validation remain in progress. The bootstrap puller and core safety behavior are runtime-validated in Bitburner v3.0.1. Recovery release `v0.2.0-r8` validated the React dashboard concurrency fix and immutable revision-specific manifest design. Releases r9/r10 validated the first persistent runtime unit, watcher-owned dashboard relaunch, missing persistent-unit recovery, unchanged-running preservation, and changed-running controlled restart. Release `v0.3.0-r11` adds explicit old-tail cleanup during watcher-owned dashboard replacement and is pending runtime verification.

## Completed
- Repository initialized and project rules/architecture/roadmap established.
- Deployment identity defined as semantic version plus monotonic revision.
- Cache-busted bootstrap puller and post-exit self-refresh helper implemented.
- Deployment reporting added at `data/git-pull-report.json`.
- Initial bootstrap, r1→r3 self-refresh, same-revision no-op, stale-revision protection, forced refresh, and failed-staging preservation validated in Bitburner v3.0.1.
- FIX-001 resolved canonical `gp` alias drift.
- D-013 locked watcher ownership of detection/approval handling.
- `src/bootstrap/update-watcher.js` implemented with cache-busted polling, heartbeat telemetry, exact-revision approval re-verification, decline handling, duplicate command protection, and deployment concurrency rejection.
- FIX-002 resolved React/Netscript concurrency by routing all Netscript access through dashboard `main()`.
- FIX-003/D-014 resolved mutable-manifest publication races by requiring immutable revision-specific manifests.
- `v0.2.0-r8` runtime-validated: dashboard stayed alive, decline command was accepted, immutable manifest dry-run validated, and normal `gp` reconciled durable deployment state to r8.
- FIX-004 records the observed r8 managed-file/deployment-ledger drift without inventing an unproven root cause; safe recovery used the canonical transaction rather than manual state edits.
- D-015 locked post-update helper reconciliation of persistent runtime units.
- D-016 locked watcher ownership of the managed update-dashboard process.
- `git-pull.js` validates optional manifest `runtimeUnits` and derives change-aware runtime plans from staged file actions.
- `git-pull-self-update.js` commits deployment state after self-refresh, then preserves/restarts/relaunches declared persistent runtime units in explicit restart order.
- Runtime reconciliation failures surface as `committed-runtime-degraded` rather than pretending a committed file deployment rolled back.
- `update-watcher.js` is a singleton persistent service and is declared as the first persistent runtime unit.
- Watcher heartbeat relaunches its managed update dashboard after unexpected exit with a restart cooldown.
- Watcher deployment telemetry distinguishes puller, self-refresh helper, runtime reconciliation, committed, degraded, and failed phases.
- The update dashboard displays watcher lifecycle, dashboard liveness, deployment phases, and runtime-unit reconciliation results.
- r9 runtime validation proved missing persistent watcher recovery with `gp --force`.
- r9 runtime validation proved an unchanged running persistent watcher is preserved during forced same-revision reconciliation.
- r10 runtime validation proved a changed running persistent watcher is stopped and relaunched with a new PID, and the replacement watcher opens a new dashboard.
- r10 exposed FIX-005: the replaced dashboard process was killed but its old tail window remained visible.
- r11 changes watcher ownership takeover to close each old dashboard tail before killing its process and launching the replacement.

## Active feature
**M1 — Reliable Deployment / watcher-owned dashboard replacement cleanup**

Relevant current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/bootstrap/update-watcher.js`
- `src/ui/update-dashboard.jsx`
- `deployment/version.json`
- `deployment/releases/r11-manifest.json`
- `deployment/manifest.json` (legacy shared metadata; not used by new release descriptors)
- `data/deployment-state.txt` (runtime-generated, protected)
- `data/deployment-pending.txt` (runtime-generated transaction state)
- `data/git-pull-report.json` (runtime-generated, protected)
- `data/update-status.json` (runtime-generated, protected)
- `data/update-command.json` (runtime command slot, protected)

## Exact next step
1. Let the current watcher detect `v0.3.0-r11`.
2. Note the current watcher PID and currently open update-dashboard tail.
3. Approve r11 from the dashboard.
4. Verify the helper restarts the changed watcher and the watcher PID changes.
5. Verify the old update-dashboard tail closes rather than remaining as a zombie/stale window.
6. Verify exactly one replacement update-dashboard opens and remains live.
7. If successful, mark FIX-005 Resolved and close this persistent updater runtime-validation slice.
8. Before closing M1, address remaining deployment-integrity and validation gaps below.

## Locked M1 behavior
- `deployment/version.json` is the small mutable remote freshness descriptor.
- Versions use `vX.Y.Z`; revisions are monotonically increasing integers.
- Remote requests are cache-busted.
- Every new release descriptor points to an immutable revision-specific manifest under `deployment/releases/`.
- Source files and immutable manifest are published before `deployment/version.json`, which is updated last for a release.
- Descriptor and manifest version/revision must match or deployment fails closed.
- Normal pulls refuse stale deployment; downgrades require an explicit override.
- Dashboard/watchers never automatically install an update.
- Player approval applies only to the exact revision presented.
- Runtime data under `data/` is protected from manifest deployment.
- `git-pull.js` is refreshed only after its running process exits, through the dedicated helper.
- Local deployment revision is committed only after the helper successfully refreshes the puller.
- Persistent runtime units are declared in the immutable manifest.
- Unchanged running persistent units are left untouched.
- Missing persistent units are relaunched after a successful commit.
- Changed persistent units are restarted only after staged activation and puller self-refresh succeed.
- Runtime reconciliation follows explicit restart order; updater/watch infrastructure is last.
- Runtime reconciliation failure does not silently roll back committed deployment identity; it records a degraded committed state in the report.
- The update watcher is persistent bootstrap infrastructure, not an automatic updater.
- During M1 the watcher owns exactly one managed update-dashboard child and relaunches it if missing.
- When watcher ownership intentionally replaces a dashboard process, its tail UI is closed before the process is killed.
- Dashboard actions use `data/update-command.json`; dashboard code never calls `git-pull.js` directly.
- Approval is re-verified against the remote descriptor and then passed to the puller as `--expect-revision N`.
- React UI callbacks must not call Netscript APIs; each UI script serializes Netscript access through its `main()` loop or another explicit Netscript owner.

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- FIX-005 r11 dashboard-tail cleanup is implemented but not yet runtime-validated.
- FIX-004's historical root cause remains unproven; only the safe reconciliation procedure is established.
- Immutable revision-specific manifests still reference mutable branch source paths. A stale release descriptor can therefore stage newer `main` content under an older manifest identity. Release content needs immutable source pinning before M1 is complete.
- GitHub Raw descriptor propagation can lag publication even with cache-busting; r10 detection eventually succeeded after an observable delay.
- Full rollback for a partially activated non-persistent deployment is not yet implemented.
- Cryptographic manifest content hashing is still pending.
- Explicit persistent-unit retirement is designed conceptually but not implemented in the current manifest contract.
- Continuous general persistent-service supervision remains future Supervisor work; the helper only reconciles after deployment, while the watcher only supervises its own dashboard child.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
