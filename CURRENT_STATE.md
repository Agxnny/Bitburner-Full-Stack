# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation and runtime validation remain in progress. Core bootstrap safety and persistent updater lifecycle behavior are runtime-validated in Bitburner v3.0.1 through `v0.3.0-r11`. The active slice fixes two blocking deployment-integrity gaps: multi-minute GitHub Raw discovery lag and manifest sources that still resolved against mutable `main`. Transition release `v0.4.0-r12` introduces redundant discovery and immutable `releaseRef` content pinning and is published for runtime validation.

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
- r12 code adds cache-busted Raw discovery plus GitHub Contents API discovery, with highest-valid-revision selection and source telemetry.
- r12 watcher keeps Raw at 30 seconds and bounds unauthenticated GitHub API checks to 75 seconds, forcing another API verification on approval.
- r12 puller independently checks Raw + API before enforcing exact approved revision.
- Production descriptors from r12 onward require immutable `releaseRef` Git commit identity.
- Pinned puller resolves manifest and managed file sources from the exact `releaseRef` rather than mutable `main`.
- Self-refresh helper uses the same pinned release content before committing deployment state.
- r12 compatibility bridge uses immutable-by-path snapshots under `deployment/releases/r12-src/` because the r11 puller cannot yet interpret `releaseRef`.

## Active feature
**M1 — Reliable Deployment / r12 release-discovery and immutable-content runtime validation**

Relevant current files:
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/bootstrap/update-watcher.js`
- `src/ui/update-dashboard.jsx`
- `deployment/version.json`
- `deployment/releases/r12-manifest.json`
- `deployment/releases/r12-src/`
- `data/deployment-state.txt`
- `data/deployment-pending.txt`
- `data/git-pull-report.json`
- `data/update-status.json`
- `data/update-command.json`

## Exact next step
1. Let the existing r11 watcher discover `v0.4.0-r12`; r11 still uses Raw-only discovery, so this first transition may retain the old propagation delay.
2. Approve r12 once presented.
3. Verify r12 deploys successfully from the revision-specific transition snapshot paths and the helper completes puller self-refresh.
4. Verify the restarted r12 watcher/dashboard show discovery telemetry for Raw and GitHub API.
5. Run `gp --dry-run` on installed r12 and confirm the report includes a valid `releaseRef` and dual-source discovery.
6. Publish a controlled r13 using normal canonical manifest source paths plus a commit-pinned `releaseRef`.
7. Confirm r12 detects r13 through either Raw or API within the designed bound (normally no more than the 75-second API cadence if GitHub API is available), even if Raw remains stale.
8. Confirm r13 installation fetches canonical source paths from its immutable commit ref and does not mix branch content.
9. Mark FIX-006 resolved only after both transition and first normal pinned release are runtime-validated.
10. Complete stale/mismatched approval and duplicate/concurrent deployment validation before closing M1.

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

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / validation gaps
- FIX-006 is implemented in r12 but not yet runtime-validated.
- The initial r11→r12 discovery still depends on the old Raw-only watcher; the faster dual-source behavior begins after r12 is installed.
- r12 is a compatibility bridge using revision-specific source snapshots. A later controlled release must prove the normal canonical-path + `releaseRef` flow.
- FIX-004's historical ledger-drift root cause remains unproven.
- Full rollback for partially activated non-persistent deployment remains unimplemented.
- Cryptographic per-file manifest hashing remains pending; commit pinning now supplies immutable Git content identity but hashes may still be added as defense in depth.
- Explicit persistent-unit retirement remains conceptually designed but unimplemented.
- Continuous general persistent-service supervision remains future Supervisor work.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
