# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation is in progress. The bootstrap puller and its core safety behavior are runtime-validated in Bitburner v3.0.1. The persistent update watcher baseline is runtime-validated at `v0.2.0-r5`. The first React update dashboard exposed a Netscript concurrency defect during runtime validation; FIX-002 corrects the UI architecture so only `main()` calls Netscript. The fix is published as `v0.2.0-r7` and awaits runtime verification before approval-flow testing resumes.

## Completed
- Repository initialized.
- Project rules established.
- Broad architecture locked.
- Implementation roadmap established.
- Core decisions recorded.
- Deployment identity defined as semantic version plus monotonic revision.
- Cache-busted bootstrap puller created.
- Post-exit helper created so `git-pull.js` can refresh itself after its running process closes.
- Deployment reporting added at `data/git-pull-report.json` with compact terminal summaries.
- Clean initial bootstrap flow validated in Bitburner v3.0.1.
- r1 to r3 update/self-refresh path validated in Bitburner.
- Same-revision no-op path validated.
- Stale-revision protection validated.
- Canonical `gp` shell alias corrected; incident recorded as FIX-001.
- Forced same-revision refresh validated.
- Safe failed-staging regression fixture implemented and runtime-validated at r4.
- Failed staging/download preservation validated.
- Bootstrap puller core validation set completed.
- D-013 locked: update watcher owns detection and approval-command handling; dashboard may not directly invoke deployment.
- `src/bootstrap/update-watcher.js` implemented with 30-second cache-busted polling, 5-second heartbeat telemetry, degraded network/error state, exact-revision approval re-verification, decline handling, duplicate command protection, and active-puller concurrency rejection.
- `v0.2.0-r5` watcher baseline runtime-validated: watcher reported healthy/current, local and remote r5, fresh heartbeat, no update available, and committed deployment telemetry.
- Controlled r6 approval-flow validation release published without source-code changes.
- FIX-002 recorded after dashboard runtime failure caused by React callbacks invoking Netscript concurrently with `ns.sleep()`.
- `src/ui/update-dashboard.jsx` corrected so React only exchanges plain-JavaScript snapshots/intents with a local bridge and `main()` serializes all Netscript access.
- `v0.2.0-r7` published with the dashboard concurrency fix.

## Active feature
**M1 — Reliable Deployment / watcher and approval dashboard runtime validation**

Relevant current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/bootstrap/update-watcher.js`
- `src/ui/update-dashboard.jsx`
- `deployment/version.json`
- `deployment/manifest.json`
- `data/deployment-state.txt` (runtime-generated, protected)
- `data/git-pull-report.json` (runtime-generated, protected)
- `data/update-status.json` (runtime-generated, protected)
- `data/update-command.json` (runtime command slot, protected)

## Exact next step
1. Manually pull `v0.2.0-r7` with `gp` to deliver FIX-002; this manual pull is required because the dashboard being tested is the component that failed.
2. Restart `src/ui/update-dashboard.jsx` and confirm the React window remains alive without Netscript concurrency errors.
3. Confirm watcher telemetry still renders and remains healthy.
4. After FIX-002 runtime verification, publish a new no-source-change validation revision and test decline behavior: no deployment launches and the revision is re-presented only after a later normal poll.
5. Test approval behavior: watcher re-verifies the exact presented revision, launches exactly one `git-pull.js --expect-revision N`, and successful deployment is reflected in state/report/status.
6. Test stale/mismatched approval rejection and duplicate/concurrent pull protection.
7. Mark this watcher/dashboard slice validated before beginning runtime-unit restart protection.

## Locked M1 behavior
- `deployment/version.json` is the small remote freshness descriptor.
- Versions use `vX.Y.Z`; revisions are monotonically increasing integers.
- Remote requests are cache-busted.
- Normal pulls refuse stale/same-revision deployment unless explicitly forced.
- Downgrades require an explicit override.
- Stale revision attempts are blocked and surfaced as an explicit alarm.
- Dashboard/watchers never automatically install an update.
- Player approval applies only to the exact revision presented.
- Runtime data under `data/` is protected from manifest deployment.
- `git-pull.js` is refreshed only after its running process exits, through the dedicated helper.
- Local deployment revision is committed only after the helper successfully refreshes the puller.
- Detailed deployment results are written to protected runtime JSON; the main terminal receives only a compact operator summary or alarm.
- User-facing launch aliases must target canonical managed paths, not unmanaged bootstrap copies.
- The failed-staging regression test uses only the fixed `--validation-failure` fixture; it is not an arbitrary remote descriptor override.
- Validation mode is forbidden from activating files even if its deliberately broken fixture unexpectedly becomes stageable.
- The update watcher is detection/approval infrastructure, not an automatic updater.
- Dashboard actions use `data/update-command.json`; dashboard code never calls `git-pull.js` directly.
- Approval is re-verified against the remote descriptor and then passed to the puller as `--expect-revision N`, giving two exact-revision checks.
- Update command transport is currently a bounded single-slot runtime file; broader control-plane messaging is deferred to its roadmap milestone.
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
- `v0.2.0-r7` dashboard concurrency fix has not yet been runtime-verified.
- The r6 approval-flow validation was interrupted by FIX-002 and should not be treated as a completed decline/approval test.
- The watcher must currently be started manually; the future supervisor will own persistent service startup/liveness policy.
- Full rollback for a partially activated non-persistent deployment is not yet implemented.
- Manifest content hashing/runtime-unit hashing is still pending.
- Persistent runtime-unit change detection, staged validation, retirement, and restart authorization are not implemented yet.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
