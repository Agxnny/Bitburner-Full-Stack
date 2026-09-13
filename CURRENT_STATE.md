# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation is in progress. The bootstrap puller, post-exit self-update helper, initial deployment version state, and initial manifest now exist. The update watcher/dashboard and persistent runtime-unit restart policy are not implemented yet.

## Completed
- Repository initialized.
- Project rules established.
- Broad architecture locked.
- Implementation roadmap established.
- Core decisions recorded.
- Deployment identity defined as semantic version plus monotonic revision.
- Cache-busted bootstrap puller created.
- Post-exit helper created so `git-pull.js` can refresh itself after its running process closes.
- Initial deployment metadata created at `v0.1.0-r1`.

## Active feature
**M1 — Reliable Deployment / bootstrap puller validation**

Current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `deployment/version.json`
- `deployment/manifest.json`

## Next feature work
1. Validate the bootstrap puller inside Bitburner from a clean/fresh state.
2. Record and fix any runtime/API issues in `FIXES.md`.
3. Design/implement the persistent update watcher and simple React approval dashboard.
4. Extend the manifest to runtime units, change detection, staged validation, and persistent-process restart authorization.

## Locked M1 behavior
- `deployment/version.json` is the small remote freshness descriptor.
- Versions use `vX.Y.Z`; revisions are monotonically increasing integers.
- Remote requests are cache-busted.
- Normal pulls refuse stale/same-revision deployment unless explicitly forced.
- Downgrades require an explicit override.
- Dashboard/watchers never automatically install an update.
- Player approval applies only to the exact revision presented.
- Runtime data under `data/` is protected from manifest deployment.
- `git-pull.js` is refreshed only after its running process exits, through the dedicated helper.
- Local deployment revision is committed only after the helper successfully refreshes the puller.

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- Bootstrap scripts have not yet been executed in the user's Bitburner save.
- Full rollback for a partially activated non-persistent deployment is not yet implemented; later M1 staging/activation work must address deployment transaction semantics before persistent services depend on it.
- Manifest content hashing/runtime-unit hashing is still pending.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
