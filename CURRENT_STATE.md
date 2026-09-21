# Current State

## Current milestone
**M3 — Canonical State**

## Status
**M3 canonical-state slice is installed at r52; v0.6.0-r53 is published to replace hard-coded validation lifecycle with a deployed validation plan plus protected runtime proof ledger. r53 awaits runtime validation.** It introduces the shared wall-time contract, centralized port registry, versioned observation transport, a persistent single-writer canonical-state service, durable data/state domain snapshots, factual availability/timestamps, and Validation Dashboard canonical-state evidence. Freshness is consumer-defined from observedAt rather than stored as a universal producer judgement. Consumer cadence-request handling is intentionally deferred until this state path is runtime-proven.

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
**M3 — Canonical State design / information-contract handoff**

No M3 runtime implementation has started. The approved framing is deliberately thin: M2 already owns collection; M3 defines the stable communication contract between those observations and future consumers.

### M3 handoff boundary
- Producers already exist: player, network, market, infrastructure, and capabilities observation collectors.
- M3 should define the information highway, not duplicate collection or make controller decisions.
- Design default: state is durable/latest-state data exposed through canonical state interfaces/files; commands and events use bounded ports/queues.
- A restarted consumer must be able to read current canonical state without replaying transient port history.
- Canonical state uses single-writer/many-reader ownership. Future consumers depend on the state contract, not collector storage details.
- Ports need an explicit reservation/allocation map before use. Message envelopes need type/kind, schema version, message/correlation ID, producer/owner, timestamp, payload, and validation/failure semantics.
- Define queue capacity/backpressure/overflow and restart semantics before any command/event producer depends on a port.
- Define state freshness/stale/unavailable semantics and source/observed/published metadata before consumers rely on state.
- Direct process args remain startup configuration/identity; telemetry/history remains evidence; React bridges remain UI-local only.
- Do not add hacking target selection, purchase decisions, scheduling policy, authority allocation, or other M4+ intelligence to M3.

### Pre-M3 cleanup state
M2 is complete through r49. Deployment hygiene is complete through r51. The obsolete standalone System Health and Update Watcher UI scripts were explicitly retired with stop → verify stopped → delete → verify absent and auditable terminal/report output. Their backend Health Collector and Update Watcher services remain. Validation Dashboard is the sole UI surface.

## Exact next step
1. Read PROJECT_RULES, CHANGES, CURRENT_STATE, ARCHITECTURE, DECISIONS, ROADMAP, relevant FIXES, and REFERENCES.
2. Design a documented port reservation/allocation map; do not allocate ports ad hoc.
3. Design command/event message envelopes, validation, correlation/idempotence conventions, bounded queues, backpressure, overflow, and restart behavior.
4. Design canonical latest-state file/envelope layout, domain boundaries, single-writer ownership, freshness metadata, and stale/unavailable semantics.
5. Define how the existing M2 observation files feed the canonical owner without becoming canonical merely by reuse.
6. Define consumer interfaces so M4+ code never depends directly on collector storage.
7. Define Validation Dashboard M3 state/transport health surfaces and registered tests/evidence.
8. Review and lock the design in DECISIONS/ARCHITECTURE before writing M3 runtime code.

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
