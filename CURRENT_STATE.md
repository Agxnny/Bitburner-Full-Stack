# Current State

## Current milestone
**M3 — Canonical State**

## Status
**M1 — Reliable Deployment is complete and runtime validated through v0.4.0-r20.** Bootstrap safety, persistent updater lifecycle behavior, redundant discovery, commit-pinned release content, exact-revision human approval, single-deployment concurrency protection, explicit persistent-unit retirement, dashboard geometry memory, and operator-visible deployment completion status have all been exercised in Bitburner v3.0.1.

Controlled r16/r17 testing validated stale exact-revision rejection and concurrent-deployment rejection, followed by a successful normal r17 install. r18 introduced the harmless persistent retirement fixture; r19 explicitly retired only that fixture while the update watcher/dashboard remained healthy. r20 then installed normally and the updater settled on a green `Install clean` state with `Last installation completed successfully (r20).`

Full transactional rollback and per-file cryptographic hashes remain documented future hardening rather than M1 blockers. FIX-004's historical ledger-drift root cause remains unproven and must not be invented.

M2 first vertical slice is runtime validated through v0.5.0-r22: shared cross-host telemetry, central health collector/storage ownership, observed service placement, stale detection, bounded incident history, service-instance supersession, and the compact System Health Watcher. The update watcher is the first external real producer.

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
- Explicit persistent-unit retirement runtime validated across r18/r19: positive retirement authorization stopped only the declared fixture and preserved the watcher/dashboard.
- r20 runtime validated operator-visible deployment completion: green `Install clean` and completed revision replace stale install-progress feedback.
- `CHANGES.md` is required for preserving in-progress work between implementation steps, chats, and handoffs.
- Project rules require each feature/subsystem's own documentation to be updated whenever its behavior, interface, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes.
- M2 r21/r22 health vertical slice runtime validated: healthy placement, stale detection, degraded aggregate state, retained incidents, replacement-instance supersession, and recovery to healthy with only the current PID active.
- r27 measured content-viewport dashboard sizing runtime validated: both production dashboards fit healthy content; System Health grew for stale/degraded Active Issues and shrank after recovery without clipping, black-gap regression, or manual resizing.
- r29 four-side dashboard docking runtime validated: followers snap to top/bottom/left/right of the selected anchor and anchor transfer preserves the physical relationship. Update-available width growth remains pending validation against the next presented release.

## Active feature
**M3 — Canonical State design**

M2 is complete and runtime validated through v0.5.0-r49. Its closeout evidence covers the seven-service telemetry/health model, stale/degraded/recovery behavior, isolated observation collectors, dashboard geometry/layout, Validation Dashboard smoke test, genuine updater-attention behavior, explicit automated/operator-confirmed evidence provenance, managed-tail replacement cleanup, and controlled emergency focus/recovery returning to 7/7 healthy.

The five files under `data/observations/` remain replaceable M2 observations, not canonical state. M3 must define a single state authority and explicit raw/derived/freshness/reconciliation interfaces rather than promoting those files by convention.

## Exact next step
1. Design the canonical-state owner and dependency direction from M2 observations/telemetry.
2. Define versioned state schemas, raw-versus-derived boundaries, freshness metadata, and stale/unavailable semantics.
3. Define reconciliation: what divergence can be corrected, what is observation-only, and what must fail closed.
4. Define consumer interfaces so later Supervisor, resource manager, scheduler, controllers, and dashboards depend on state contracts rather than storage details.
5. Define Validation Dashboard state-health views and registered M3 tests/evidence.
6. Lock the design in DECISIONS/ARCHITECTURE before implementing the first M3 vertical slice.

Pre-M3 deployment hygiene is complete through r51: explicit managed-file retirement was runtime validated by stopping, verifying, deleting, and verifying absence of both legacy standalone dashboard scripts. Only the Validation Dashboard remains as the UI surface; Health Collector and Update Watcher remain backend services.

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
- Every dashboard tail uses a stable dashboard key. User position is persistent presentation state; size is dashboard-owned and dynamically derived from measured content/native viewport geometry. Presentation coordination fails open.
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

## M2 closeout decisions
- M2 is complete through v0.5.0-r49; the standalone compact Health/Updater surfaces may remain during M3 and can be consolidated later without reopening M2.
- The previously observed bounded post-install updater convergence/stale transient feedback is presentation polish, not an M2 correctness blocker: deployment state converged without intervention and terminal install status is independently visible.

## Known issues / close-out decisions
- FIX-004's historical ledger-drift root cause remains unproven; current deployment recovery behavior is validated, but the historical root cause must not be invented.
- Full rollback for partially activated non-persistent deployment is deferred as future hardening. M1 stages and validates before activation and protects running persistent units from failed/partial updates, but does not claim full transactional rollback of all non-persistent file writes.
- Cryptographic per-file manifest hashing is deferred as defense in depth. Production release content is already immutable through commit-pinned `releaseRef` identity.
- Continuous general persistent-service supervision remains future Supervisor work.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, `CHANGES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
