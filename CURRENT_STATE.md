# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation and runtime validation remain in progress. Core bootstrap safety and persistent updater lifecycle behavior are runtime-validated in Bitburner v3.0.1 through `v0.3.0-r11`. Transition release `v0.4.0-r12` installed successfully and its puller passed a same-revision dry run using the new release contract. Controlled revision r13 was detected by the r12 watcher within one normal polling interval, providing runtime evidence that the redundant discovery path fixes the prior multi-minute Raw-only lag. The next release, r14, carries the approved ultra-compact update dashboard and is also the first release intended to validate normal canonical source paths fetched through an immutable `releaseRef`.

## Completed
- Repository foundation, project rules, architecture, roadmap, decisions, fixes, and references established.
- Deployment identity uses semantic version plus monotonic revision.
- Bootstrap puller, self-refresh helper, deployment report, failure-preservation fixture, stale-revision protection, and canonical `gp` path validated.
- Update watcher owns release detection/approval; dashboard uses bounded command-file interaction and never runs the puller directly.
- React/Netscript callback concurrency issue resolved and runtime-validated.
- Revision-specific immutable manifest paths introduced after the r6/r7 metadata publication race.
- Persistent runtime-unit reconciliation implemented and validated: unchanged-running preserve, missing relaunch, changed-running controlled restart, watcher-owned dashboard recovery, and explicit old-tail cleanup.
- FIX-005 resolved by r11 runtime validation.
- D-017 locks redundant release discovery and commit-pinned release content.
- r12 adds cache-busted Raw discovery plus GitHub Contents API discovery, with highest-valid-revision selection and source telemetry.
- r12 watcher keeps Raw at 30 seconds and bounds unauthenticated GitHub API checks to 75 seconds, forcing another API verification on approval.
- r12 puller independently checks Raw + API before enforcing exact approved revision.
- Production descriptors require immutable `releaseRef` Git commit identity.
- Pinned puller resolves manifest and managed file sources from the exact `releaseRef` rather than mutable `main`.
- Self-refresh helper uses the same pinned release content before committing deployment state.
- r12 compatibility bridge uses immutable-by-path snapshots under `deployment/releases/r12-src/` because the r11 puller could not yet interpret `releaseRef`.
- Installed r12 passed `gp --dry-run` as `CLEAN | v0.4.0-r12 | unchanged 3 | refreshed 1 | updated 0 | added 0`.
- Controlled r13 was detected within one normal watcher interval rather than the previous 4–5 minute lag.
- D-018 locks the shared dark grey-blue dashboard visual language.
- The M1 update dashboard has been redesigned as the approved ultra-compact operator widget: current release, heartbeat, polling interval, and exact-revision approval only.

## Active feature
**M1 — Reliable Deployment / r14 compact-dashboard release and canonical pinned-source validation**

Relevant current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/bootstrap/update-watcher.js`
- `src/ui/update-dashboard.jsx`
- `src/ui/README.md`
- `deployment/version.json`
- `deployment/releases/r14-manifest.json` once published
- `data/deployment-state.txt`
- `data/deployment-pending.txt`
- `data/git-pull-report.json`
- `data/update-status.json`
- `data/update-command.json`

## Exact next step
1. Publish r14 with the updated ultra-compact `src/ui/update-dashboard.jsx` and a normal manifest using canonical source paths.
2. Set r14 `releaseRef` to the immutable commit containing the r14 manifest and all release source content, then update `deployment/version.json` last.
3. Let the installed watcher discover r14 naturally and record the detection interval.
4. Approve r14 normally.
5. Verify watcher ownership replaces the dashboard cleanly and the new ultra-compact UI shows current release, heartbeat age, 30-second interval, and update controls only when applicable.
6. Run `gp --dry-run` after r14 is installed and confirm the release is clean.
7. Confirm r14 installation fetched canonical manifest source paths from the immutable commit ref; if successful, use that evidence toward resolving FIX-006.
8. Complete remaining stale/mismatched approval and duplicate/concurrent deployment validation before closing M1.

## Locked M1 behavior
- Versions use `vX.Y.Z`; revisions are monotonically increasing and immutable once released.
- Human approval is always required and bound to one exact revision.
- Watcher and puller independently verify release freshness.
- Discovery uses redundant Raw + GitHub API sources; highest valid revision wins.
- Equal discovery revisions must agree on version, manifest, and `releaseRef`.
- Production release bytes are identified by immutable `releaseRef`, not mutable `main`.
- Descriptor and manifest version/revision must match or deployment fails closed.
- Runtime data under `data/` is protected from deployment.
- `git-pull.js` is refreshed only after its running process exits through the helper.
- Local deployment state commits only after successful puller self-refresh.
- Persistent runtime units are manifest-declared and reconciled after commit in explicit restart order.
- Unchanged running persistent units remain untouched; missing units relaunch; changed units restart only after staged validation.
- Update watcher remains persistent bootstrap infrastructure and never auto-installs.
- Watcher owns exactly one managed update-dashboard child and closes the old tail before intentional replacement.
- React callbacks never call Netscript APIs directly.
- Dashboard visuals use the shared dark grey-blue language defined by D-018; the compact updater and later larger Production Dashboard may use different densities within that language.

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- FIX-006 remains open until a normal canonical-path release is proven to install entirely through its immutable `releaseRef`; r14 is intended to provide that proof.
- r13 validated discovery freshness but reused transition snapshot source paths, so it did not by itself prove canonical-path content pinning.
- FIX-004's historical ledger-drift root cause remains unproven.
- Full rollback for partially activated non-persistent deployment remains unimplemented.
- Cryptographic per-file manifest hashing remains pending; commit pinning supplies immutable Git content identity but hashes may still be added as defense in depth.
- Explicit persistent-unit retirement remains conceptually designed but unimplemented.
- Continuous general persistent-service supervision remains future Supervisor work.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
