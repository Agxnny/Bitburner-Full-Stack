# Current State

## Current milestone
**M3 — Canonical State**

## Status
**M3 Authority/Work Order integration is runtime validated through v0.6.0-r77.** The DISRUPTIVE validation-only real weaken fixture passed 8/8: canonical target `max-hardware`, real `hacking-control` authority, bounded ACTIVE Work Order, home-hosted one-thread executor, DELEGATED authorization without a direct executor lease, measurable security reduction from 6.088 to 6.038, drain-close to CLOSED, authority release, and no live fixture lease/process. The Validation Dashboard has no outstanding tests. This does not establish a production hacking subsystem.

**M3 canonical-state first slice and its plan/ledger validation lifecycle are runtime validated through v0.6.0-r55.** It introduces the shared wall-time contract, centralized port registry, versioned observation transport, a persistent single-writer canonical-state service, durable data/state domain snapshots, factual availability/timestamps, and Validation Dashboard canonical-state evidence. Freshness is consumer-defined from observedAt rather than stored as a universal producer judgement. Consumer cadence-request handling is intentionally deferred until this state path is runtime-proven.

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
- r56/r57 runtime validated corrected redundant discovery cadence: every normal 65-second watcher cycle samples both cache-busted Raw and GitHub Contents API, and r57 was detected on the first cycle after publication.
- `CHANGES.md` is required for preserving in-progress work between implementation steps, chats, and handoffs.
- Project rules require each feature/subsystem's own documentation to be updated whenever its behavior, interface, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes.
- M2 r21/r22 health vertical slice runtime validated: healthy placement, stale detection, degraded aggregate state, retained incidents, replacement-instance supersession, and recovery to healthy with only the current PID active.
- r27 measured content-viewport dashboard sizing runtime validated: both production dashboards fit healthy content; System Health grew for stale/degraded Active Issues and shrank after recovery without clipping, black-gap regression, or manual resizing.
- r29 four-side dashboard docking runtime validated: followers snap to top/bottom/left/right of the selected anchor and anchor transfer preserves the physical relationship. Update-available width growth remains pending validation against the next presented release.

## Active feature
**M3 — Canonical State — next slice pending**

The first M3 runtime slice is complete and runtime-proven through r55: M2 observations feed a persistent single-writer canonical owner, canonical state survives service restart through durable reconciliation, factual observation timestamps are preserved, revisions do not roll back, and freshness remains consumer-defined. The next planned M3 slice is consumer cadence-request handling; implementation has not started.

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
1. Resume M3 with the already-deferred consumer cadence-request/control-plane design and implementation.

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

- r60 runtime validated the compact Validation Dashboard layout: auto-sized narrow window, 4+3 icon/text navigation, and full Overview height without cropping.

- v0.6.0-r63 runtime validated M3 collection cadence control end-to-end: SAFE lease bounds/expiry plus disruptive collection-control restart recovery. A live player lease survived owner restart from durable state, remained bounded at 500ms, and expired back to the 2000ms baseline. No current validation-plan tests remain outstanding.

- v0.6.0-r66 runtime validated canonical resource associations: CLEAN deployment/reconciliation followed by SAFE `m3.resource.associations` PASS (7/7). Live canonical state exposed 33 exact stock/server association pairs, 1 unmatched stock, and 37 unmatched organization servers with source provenance and no invented/duplicate links. No current validation-plan tests remain outstanding.


### Diagnostics / incident intelligence — r67 runtime proof
- v0.6.0-r67 installed cleanly.
- Health reported 10/10 services healthy including diagnostics-service.
- Validation Dashboard Diagnostics view loaded with no active incidents before testing.
- SAFE m3.diagnostics.intelligence PASS: 7/7 assertions.
- Synthetic incident was durably recorded, evidence/classification preserved, duplicate report bounded, explicit resolution accepted, and resolved evidence remained visible as one Recently Resolved occurrence.
- Current validation plan has no outstanding tests after the SAFE proof.


### Diagnostics real failure correlation — r68 runtime proof and cleanup defect
- DISRUPTIVE isolated m3.diagnostics.failure-correlation PASS: 8/8 assertions.
- The validation-only fixture became genuinely STALE while remaining alive; Diagnostics produced an OBSERVED / high-confidence SERVICE_STALE incident with service, host, PID, stale state, and heartbeat reason evidence.
- The fixture resumed heartbeats; Health returned healthy and Diagnostics resolved the incident during the test.
- After PASS, test teardown killed the fixture. Health currently has no explicit service-retirement mechanism, so the last known fixture instance becomes stale again and leaves Health/Diagnostics in Attention. This is a test cleanup/lifecycle gap; production services remain healthy.


### Diagnostics service-retirement correction — r69 runtime proof
- m3.diagnostics.failure-correlation validationVersion 2 PASS: 10/10 assertions.
- New fixture-retired assertion passed: the validation fixture explicitly retired itself and Health removed the ephemeral instance.
- New teardown-clean assertion passed after the stale window: fixture stayed absent and its diagnostic remained resolved.
- Post-test Health: HEALTHY, 10 active services, no validation fixture in Service Placement.
- Post-test Diagnostics: no active incidents. Historical fixture failures remain only as retained audit evidence (Health Recent Incidents / Diagnostics Recently Resolved), which is intentional.
- Diagnostics / Incident Intelligence foundation is complete through v0.6.0-r69.


### Generic Authority — direct lease slice r70
- v0.6.0-r70 installed cleanly; authority-service joined Health as the 11th healthy service.
- SAFE m3.authority.direct PASS: 13/13 assertions.
- Runtime proof covers atomic multi-claim grant, identical claim conflict, distinct-capability coexistence, DIRECT authorization, wrong-owner/out-of-scope fail-closed checks, owner renewal, release, atomic conflict denial with no partial lease, expiry reconciliation, valid durable state, and the Work Order/non-authority boundary.
- First direct-authority slice is complete. Next authority proof is durable lease recovery across authority-service restart; delegated Work Order execution remains intentionally unimplemented until that passes.


## M3 authority validation through r71
The generic Authority Registry direct lease slice is runtime validated through v0.6.0-r71. SAFE m3.authority.direct previously proved atomic typed resource/capability grants, compatibility/conflict rules, DIRECT authorization, owner-only lifecycle operations, expiry, and the Work Order-not-authority boundary. DISRUPTIVE m3.authority.restart then restarted only authority-service while a synthetic lease was live and proved exact durable recovery without extending authority: owner/correlation/claim and original issuedAt/expiresAt survived, DIRECT authorization and identical-claim conflict denial remained effective, the lease expired on its original absolute boundary, and authorization failed closed afterward. The current validation plan has no outstanding tests.


## r72 delegated Work Order runtime proof
v0.6.0-r72 installed with aggregate Health at 12/12 reporting services, including the new persistent work-order-service. SAFE m3.authority.delegated passed 9/9. Runtime proved that a receiver without a direct lease receives DELEGATED authorization only through an ACTIVE bounded Work Order backed by the issuer's current parent authority; receiver/scope boundaries fail closed; issuers cannot over-delegate; order expiry is capped by parent expiry; closing an order denies new work; and releasing parent authority invalidates delegation immediately. No current validation-plan tests remain outstanding. The next authority lifecycle concern is drain-first revocation / cleanup authority.


### v0.6.0-r73 — drain-first Work Order cleanup authority runtime proof
Runtime validation passed `m3.authority.cleanup` 10/10. Normal close entered CLOSING and immediately denied new DELEGATED objective work; CLEANUP was separately receiver/scope-bound and ended on receiver completion. Parent authority loss automatically entered CLOSING while preserving only bounded cleanup, forced cancellation granted no cleanup, and cleanup timeout ended FAILED/fail-closed. Aggregate runtime health was 12/12 and the current validation plan had no outstanding tests.
