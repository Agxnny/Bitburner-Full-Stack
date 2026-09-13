# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation is in progress. The bootstrap puller and its core safety behavior are now runtime-validated in Bitburner v3.0.1, including self-refresh, no-op pulls, stale-revision blocking, forced same-revision refresh, compact/detailed reporting, and failed-staging preservation. The next active work is the persistent update watcher / approval dashboard design. Persistent runtime-unit restart protection remains later M1 work.

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
- Forced same-revision refresh validated at r3: both managed bootstrap files were reported as `refreshed`, helper completion committed cleanly, and local/remote revision remained r3.
- Safe failed-staging regression fixture implemented under `deployment/validation/`.
- Real deployment descriptor published as `v0.1.0-r4` to deliver the validation harness.
- r4 validation harness runtime-tested successfully.
- Failed staging/download preservation validated: the fixed validation fixture failed on its intentionally missing source before activation, `data/deployment-state.txt` remained `v0.1.0-r4`, no validation target was created, and the JSON report recorded the failed validation run with zero activated files.
- Bootstrap puller core validation set completed.

## Active feature
**M1 — Reliable Deployment / persistent update watcher and approval flow design**

Relevant current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `deployment/version.json`
- `deployment/manifest.json`
- `deployment/validation/failure-version.json`
- `deployment/validation/failure-manifest.json`
- `data/git-pull-report.json` (runtime-generated, protected)

## Exact next step
1. Design the persistent update watcher and approval flow before implementation.
2. Define watcher ownership, lifecycle, polling/freshness behavior, telemetry, command/approval interface, and failure behavior.
3. Define the minimal React approval surface and how it reads update telemetry without becoming an alternate source of truth.
4. Preserve the rule that watcher/dashboard detection never auto-installs; approval applies only to the exact presented revision.
5. After design approval, implement and validate the watcher/dashboard slice before moving to runtime-unit restart protection.

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

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- Full rollback for a partially activated non-persistent deployment is not yet implemented; later M1 staging/activation work must address deployment transaction semantics before persistent services depend on it.
- Manifest content hashing/runtime-unit hashing is still pending.
- Persistent update watcher and approval dashboard are not implemented yet.
- Persistent runtime-unit change detection, staged validation, retirement, and restart authorization are not implemented yet.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
