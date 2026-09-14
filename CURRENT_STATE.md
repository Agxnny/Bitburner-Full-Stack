# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation is in progress. The bootstrap puller and its core safety behavior are runtime-validated in Bitburner v3.0.1. The persistent update watcher, exact-revision approval command path, structured update telemetry, and first React update dashboard slice are implemented and published as `v0.2.0-r5`; this new slice is awaiting runtime validation. Persistent runtime-unit restart protection remains later M1 work.

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
- Stale-revision protection validated: local r4 versus remote r3 was blocked and raised the dedicated stale alarm.
- Canonical `gp` shell alias corrected to `src/bootstrap/git-pull.js`; incident recorded as FIX-001.
- Forced same-revision refresh validated at r3.
- Safe failed-staging regression fixture implemented and runtime-validated at r4.
- Failed staging/download preservation validated: state remained r4, no validation target was created, and the report recorded zero activated files.
- Bootstrap puller core validation set completed.
- D-013 locked: update watcher owns detection and approval-command handling; dashboard may not directly invoke deployment.
- `src/bootstrap/update-watcher.js` implemented with 30-second cache-busted polling, 5-second heartbeat telemetry, degraded network/error state, exact-revision approval re-verification, decline handling, duplicate command protection, and active-puller concurrency rejection.
- `src/ui/update-dashboard.jsx` implemented as the first React dashboard slice using structured status/report telemetry and the standard command path.
- `v0.2.0-r5` published with watcher and dashboard managed by the deployment manifest.

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
1. Pull `v0.2.0-r5` with `gp` and verify the deployment commits cleanly.
2. Start `src/bootstrap/update-watcher.js` on `home` and confirm `data/update-status.json` reaches healthy/current with a fresh heartbeat.
3. Start `src/ui/update-dashboard.jsx` and confirm the React update card renders watcher/local/remote/deployment state.
4. Runtime-test decline behavior against a later test revision: exact presented revision is declined, no deployment launches, and the revision is re-presented only after a later normal poll.
5. Runtime-test approval behavior against a later test revision: watcher re-verifies the descriptor, launches exactly one `git-pull.js --expect-revision N`, and successful deployment is reflected in state/report/status.
6. Runtime-test stale/mismatched approval rejection and duplicate/concurrent pull protection.
7. Record/fix any runtime API issues, then mark this watcher/dashboard slice validated before beginning runtime-unit restart protection.

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

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- `v0.2.0-r5` watcher/dashboard slice has not yet been runtime-validated in Bitburner.
- The watcher must currently be started manually; the future supervisor will own persistent service startup/liveness policy.
- Full rollback for a partially activated non-persistent deployment is not yet implemented; later M1 staging/activation work must address deployment transaction semantics before persistent services depend on it.
- Manifest content hashing/runtime-unit hashing is still pending.
- Persistent runtime-unit change detection, staged validation, retirement, and restart authorization are not implemented yet.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
