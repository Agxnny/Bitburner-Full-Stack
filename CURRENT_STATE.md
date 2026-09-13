# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation is in progress. The bootstrap puller, post-exit self-update helper, deployment version state, manifest, compact terminal reporting, detailed JSON pull reporting, and stale-revision alarm behavior exist and are now being validated in Bitburner. The update watcher/dashboard and persistent runtime-unit restart policy are not implemented yet.

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

## Active feature
**M1 — Reliable Deployment / bootstrap puller validation**

Current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `deployment/version.json`
- `deployment/manifest.json`
- `data/git-pull-report.json` (runtime-generated, protected)

## Next feature work
1. Validate forced same-revision refresh behavior and reporting.
2. Validate failed staging/download preservation behavior.
3. Record and fix any additional runtime/API issues in `FIXES.md`.
4. Mark bootstrap puller validation complete once all safety cases pass.
5. Design/implement the persistent update watcher and simple React approval dashboard.
6. Extend the manifest to runtime units, change detection, staged validation, and persistent-process restart authorization.

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

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- Forced same-revision refresh has not yet been runtime-validated.
- Failed staging/download preservation has not yet been runtime-validated.
- Full rollback for a partially activated non-persistent deployment is not yet implemented; later M1 staging/activation work must address deployment transaction semantics before persistent services depend on it.
- Manifest content hashing/runtime-unit hashing is still pending.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
