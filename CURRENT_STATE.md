# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation and runtime validation remain in progress. Core bootstrap safety and persistent updater lifecycle behavior are runtime-validated in Bitburner v3.0.1. Transition release `v0.4.0-r12` installed successfully and its puller passed a same-revision dry run using the new release contract. Controlled r13 was detected within one normal watcher interval, and r14 installed successfully using normal canonical source paths behind an immutable `releaseRef`, validating the post-transition pinned-content flow. The approved ultra-compact updater dashboard is now live. The active UI slice adds reusable window position/size memory for this dashboard and all future dashboard tails.

## Completed
- Repository foundation, project rules, architecture, roadmap, decisions, fixes, and references established.
- Deployment identity uses semantic version plus monotonic revision.
- Bootstrap puller, self-refresh helper, deployment report, failure-preservation fixture, stale-revision protection, and canonical `gp` path validated.
- Update watcher owns release detection/approval; dashboard uses bounded command-file interaction and never runs the puller directly.
- React/Netscript callback concurrency issue resolved and runtime-validated.
- Revision-specific immutable manifest paths introduced after the r6/r7 metadata publication race.
- Persistent runtime-unit reconciliation implemented and validated: unchanged-running preserve, missing relaunch, changed-running controlled restart, watcher-owned dashboard recovery, and explicit old-tail cleanup.
- D-017 locks redundant release discovery and commit-pinned release content.
- r12 adds cache-busted Raw discovery plus GitHub Contents API discovery, with highest-valid-revision selection and source telemetry.
- Installed r12 passed `gp --dry-run` as `CLEAN | v0.4.0-r12 | unchanged 3 | refreshed 1 | updated 0 | added 0`.
- Controlled r13 was detected within one normal watcher interval rather than the previous 4–5 minute lag.
- r14 installed successfully using canonical manifest source paths resolved from its immutable `releaseRef`.
- D-018 locks the shared dark grey-blue dashboard visual language.
- The M1 update dashboard is the approved ultra-compact operator widget: current release, heartbeat, polling interval, and exact-revision approval only.
- D-019 locks persistent dashboard tail position/size as shared presentation memory.
- `src/ui/dashboard-window-memory.js` provides reusable geometry restore/observation for all dashboard tails.

## Active feature
**M1 — Reliable Deployment / r15 dashboard window-memory validation**

Relevant current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/bootstrap/update-watcher.js`
- `src/ui/update-dashboard.jsx`
- `src/ui/dashboard-window-memory.js`
- `src/ui/README.md`
- `deployment/version.json`
- `deployment/releases/r15-manifest.json` once published
- `data/deployment-state.txt`
- `data/deployment-pending.txt`
- `data/git-pull-report.json`
- `data/update-status.json`
- `data/update-command.json`

## Exact next step
1. Publish r15 containing shared dashboard window-memory support.
2. Approve r15 normally and allow watcher ownership to replace the update dashboard.
3. Position and resize the r15 dashboard once.
4. Restart/relaunch the managed dashboard and confirm its position and size are restored.
5. Confirm window memory failure remains non-fatal and no React callback invokes Netscript.
6. Complete remaining stale/mismatched approval and duplicate/concurrent deployment validation before closing M1.

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
- Dashboard visuals use the shared dark grey-blue language defined by D-018.
- Every dashboard tail uses shared persistent geometry memory with a stable dashboard key; geometry is presentation state and fails open.

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- Dashboard window-memory code is published next and requires runtime validation of drag/resize persistence across a dashboard relaunch.
- FIX-004's historical ledger-drift root cause remains unproven.
- Full rollback for partially activated non-persistent deployment remains unimplemented.
- Cryptographic per-file manifest hashing remains pending; commit pinning supplies immutable Git content identity but hashes may still be added as defense in depth.
- Explicit persistent-unit retirement remains conceptually designed but unimplemented.
- Continuous general persistent-service supervision remains future Supervisor work.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
