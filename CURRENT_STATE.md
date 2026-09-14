# Current State

## Current milestone
**M1 — Reliable Deployment**

## Status
M1 implementation is functionally complete except for explicit persistent-unit retirement. Core bootstrap safety, persistent updater lifecycle behavior, redundant discovery, commit-pinned release content, exact-revision human approval, and single-deployment concurrency protection are runtime-validated in Bitburner v3.0.1. Transition release `v0.4.0-r12` installed successfully and its puller passed a same-revision dry run using the new release contract. Controlled r13 was detected within one normal watcher interval, r14 installed successfully using normal canonical source paths behind an immutable `releaseRef`, and r15 runtime validation confirmed shared dashboard window position/size memory restores correctly after watcher-driven relaunch.

Controlled no-op releases r16 and r17 validated the remaining approval boundaries. A stale r16 approval was rejected after r17 became current without implicitly authorizing r17. An r17 approval was then rejected while deployment infrastructure was intentionally held active by the existing self-update helper in a harmless wait state. After that helper was removed, a normal r17 approval installed successfully and the ordinary deployment path completed correctly.

Close-out review determined that full rollback and per-file cryptographic hashes are future hardening rather than M1 blockers. Explicit persistent-unit retirement remains the final M1 blocker because persistent processes may not be terminated merely because they disappear from a later manifest; retirement requires a positive manifest-authorized lifecycle action.

The repository uses `CHANGES.md` as the lightweight in-progress work record. It must be updated during meaningful implementation steps and before handoffs/context switches. Feature behavior changes must update that feature's own documentation in the same work item.

## Completed
- Repository foundation, project rules, architecture, roadmap, decisions, fixes, references, and working-change documentation established.
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
- r15 runtime validation confirmed move/resize persistence and geometry restoration after watcher-driven dashboard relaunch.
- Exact-revision stale approval protection is runtime validated using controlled no-op releases r16/r17.
- Duplicate/concurrent deployment rejection is runtime validated using the production watcher command path while the helper was held in a non-mutating wait state.
- Final normal r17 deployment succeeded after the validation helper was removed.
- `CHANGES.md` is required for preserving in-progress work between implementation steps, chats, and handoffs.
- Project rules require each feature/subsystem's own documentation to be updated whenever its behavior, interface, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes.

## Active feature
**M1 — Reliable Deployment / explicit persistent-unit retirement**

Relevant current files:
- `CHANGES.md`
- `PROJECT_RULES.md`
- `CURRENT_STATE.md`
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `deployment/README.md`
- `DECISIONS.md`
- release manifests used for validation

## Exact next step
1. Design an explicit manifest retirement contract for previously persistent runtime units.
2. Define puller validation and helper reconciliation semantics so retirement is positive authorization rather than inferred from disappearance.
3. Implement and runtime-validate controlled retirement without weakening the existing persistent-process safety rules.
4. Update deployment feature docs, decisions if needed, CHANGES, and CURRENT_STATE.
5. Close M1 only after explicit retirement is validated.

## Locked M1 behavior
- Versions use `vX.Y.Z`; revisions are monotonically increasing and immutable once released.
- Human approval is always required and bound to one exact revision.
- Approval for one revision cannot silently authorize a later revision.
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
- Disappearance from a later manifest is never authorization to terminate a persistent unit; retirement must be explicit.
- Update watcher remains persistent bootstrap infrastructure and never auto-installs.
- Watcher rejects a new approval while puller/helper deployment infrastructure is already active.
- Watcher owns exactly one managed update-dashboard child and closes the old tail before intentional replacement.
- React callbacks never call Netscript APIs directly.
- Dashboard visuals use the shared dark grey-blue language defined by D-018.
- Every dashboard tail uses shared persistent geometry memory with a stable dashboard key; geometry is presentation state and fails open.
- Active implementation work is preserved in `CHANGES.md` before context switches or handoffs.
- Feature/subsystem documentation is updated in the same work item as feature behavior changes.

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues / close-out decisions
- FIX-004's historical ledger-drift root cause remains unproven; current deployment recovery behavior is validated, but the historical root cause must not be invented.
- Full rollback for partially activated non-persistent deployment is deferred as future hardening. M1 stages and validates before activation and protects running persistent units from failed/partial updates, but does not claim full transactional rollback of all non-persistent file writes.
- Cryptographic per-file manifest hashing is deferred as defense in depth. Production release content is already immutable through commit-pinned `releaseRef` identity.
- Explicit persistent-unit retirement remains the final M1 blocker.
- Continuous general persistent-service supervision remains future Supervisor work.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, `CHANGES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
