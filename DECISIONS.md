# Decisions

This file records durable architectural decisions. Revisit a locked decision only for a concrete technical reason and record the change rather than silently rewriting history.

## D-001 — Centralized control plane
**Status:** Locked

Use centralized state, resource/authority/budget management, scheduling, and execution instead of independent scripts competing for resources.

## D-002 — Thin supervisor
**Status:** Locked

The main daemon/supervisor manages service lifecycle and health. Domain strategy lives in independent modules/services.

## D-003 — Single canonical state
**Status:** Locked

Shared player/game/resource state has one canonical owner. Modules consume it through interfaces and may not create competing sources of truth.

## D-004 — Shared authority and budget model
**Status:** Locked

RAM, money, stock symbols, targets, player work, sleeves, and other contested resources/domains use the common Resource, Authority & Budget Manager rather than bespoke ownership systems.

## D-005 — Separate decision from execution
**Status:** Locked

Controllers own intent/strategy; designated executors perform side effects. Example: stock manipulation may own symbol authority while the trader remains the sole trade executor.

## D-006 — React dashboards are first-class
**Status:** Locked

Maintain a Production Dashboard for operations and a Validation Dashboard for correctness/health. Validation UI evolves alongside core systems and is part of completion criteria.

## D-007 — Updater is bootstrap infrastructure
**Status:** Locked

Git sync/update tooling remains recoverable and partly independent of the control plane so it can update or recover the control plane itself.

## D-008 — Manifest controls persistent runtime updates
**Status:** Locked

Persistence is declared at runtime-unit level. Persistent units are restarted only after explicit manifest change/retirement plus successful staged validation.

## D-009 — Repository is project memory
**Status:** Locked

Code, current state, decisions, fixes, rules, references, and handoff context live in GitHub. Chat should remain compact and should not carry source-code dumps by default.

## D-010 — Deployment identity uses version plus revision
**Status:** Locked

Deployments expose a semantic version in `vX.Y.Z` form and a monotonically increasing integer revision. Semantic version communicates release meaning; revision is the freshness/update sequence. A revision is immutable once released and may not be reused for different deployable content.

## D-011 — Update approval is always human initiated
**Status:** Locked

The update watcher may detect and present a newer revision but must never automatically pull it. The player explicitly approves or declines the specific revision presented. Approval for one revision does not authorize a newer revision that appears before deployment starts.

## D-012 — Puller self-update uses a post-exit helper
**Status:** Locked

`git-pull.js` never replaces its own running file as part of normal activation. A minimal helper is updated first, launched by the puller, waits for the puller's PID to exit, then cache-busts and downloads the current `git-pull.js` before committing local deployment state. The helper invocation contract remains compatible for manifest schema version 1.

## D-013 — Update watcher owns detection and approval command handling
**Status:** Locked

`src/bootstrap/update-watcher.js` is the persistent owner of remote release detection and update approval command handling. It polls the cache-busted deployment descriptor, publishes structured status under protected runtime data, and never installs automatically.

Dashboard actions write a bounded single-slot update command through the standard command path. On approval, the watcher re-verifies the remote descriptor and only then launches `git-pull.js --expect-revision N`. The puller remains the deployment executor and independently enforces the exact approved revision. Dashboard code may not invoke the puller directly.

## D-014 — Release manifests use immutable revision-specific paths
**Status:** Locked

Every published deployment descriptor must point to a manifest path unique to that immutable revision, for example `deployment/releases/r8-manifest.json`. A mutable shared manifest path must not be used by new release descriptors.

Cache busting prevents reuse of a cached URL response but does not make multiple GitHub Raw files publish atomically. Revision-specific manifest paths ensure that a descriptor observed from one repository propagation state cannot accidentally pair with a manifest from a later release. The puller's descriptor/manifest identity validation remains mandatory and must fail closed on any mismatch.

## D-015 — Post-update helper reconciles persistent runtime units
**Status:** Locked

The deployment manifest declares persistent runtime units and the files that define each unit. `git-pull.js` derives a runtime plan from staged file actions. After the puller exits and self-refresh succeeds, `git-pull-self-update.js` commits the deployment and reconciles those persistent units in explicit restart order.

For each persistent unit: unchanged and running is preserved; unchanged and missing is relaunched; changed and running is stopped then restarted; changed and missing is launched. Runtime reconciliation never substitutes for the future continuous Supervisor. A committed deployment with failed runtime reconciliation is reported as committed-but-degraded instead of pretending the file deployment rolled back.

## D-016 — Update watcher owns the update dashboard lifecycle
**Status:** Locked

During M1, the persistent `src/bootstrap/update-watcher.js` owns exactly one managed `src/ui/update-dashboard.jsx` child. Watcher startup refreshes the dashboard process so deployed UI code is current, and watcher heartbeats relaunch the child if it stops. The dashboard is not independently declared as a persistent runtime unit.

When the general Supervisor is implemented, persistent-service liveness ownership may move there, but the update watcher remains the semantic owner of update detection/approval and the dashboard remains a managed client rather than a deployment executor.

## D-017 — Release discovery is redundant; release content is commit-pinned
**Status:** Locked

`deployment/version.json` remains the small mutable discovery pointer, but no single GitHub Raw branch view is trusted as the only freshness source. The watcher compares a 30-second cache-busted Raw view with a lower-frequency unauthenticated GitHub Contents API view and selects the highest valid revision. Approval forces a fresh API check. The puller independently performs both discovery checks before enforcing `--expect-revision`.

GitHub API polling is deliberately slower than Raw polling to stay below the unauthenticated public API limit and leave headroom for approval/deployment checks. Discovery-source health and the selected source are visible in update telemetry.

Every production descriptor from the transition release onward includes an immutable 40-character Git commit SHA in `releaseRef`. After the descriptor is discovered, the manifest and all manifest sources are fetched from that exact commit rather than mutable `main`. The self-update helper also refreshes `git-pull.js` from the same immutable release content before committing deployment state.

Release r12 is the one-time compatibility bridge because the r11 puller cannot interpret `releaseRef`. Its manifest points to revision-unique source snapshots under `deployment/releases/r12-src/`, allowing the old puller to stage immutable-by-path transition content. The r12 helper permits that narrowly scoped fallback only for revision 12. Later releases must use `releaseRef`; unpinned self-refresh fails closed.

## D-018 — Dashboards share one grey-blue visual language
**Status:** Locked

All React dashboard surfaces use a common dark grey-blue presentation system so operator and validation UIs feel like one product. The base language uses near-black/charcoal backgrounds, blue-grey raised surfaces, cool blue borders/dividers, bright blue primary actions, pale blue-grey secondary text, green healthy state, amber attention/update state, and red only for explicit failures.

The M1 update watcher uses the approved ultra-compact single-row presentation: current release, heartbeat, polling interval, and update approval only. Detailed engineering telemetry remains available to validation surfaces rather than crowding this operator widget.

The later Production Dashboard should use the same palette but may use larger status-card compositions similar to the approved compact status-card concept. Visual consistency is shared; layout density is allowed to vary by dashboard purpose.

## D-019 — Dashboard tail geometry is persistent presentation memory
**Status:** Locked

Every dashboard tail uses the shared `src/ui/dashboard-window-memory.js` helper with a stable dashboard-specific key. The helper remembers the player's last window position and size, restores that geometry when the dashboard is reopened or relaunched, and continuously updates memory when the native Bitburner tail is dragged or resized.

Geometry is browser-local presentation state, not canonical runtime state. Failure to read, write, or apply saved geometry must never prevent a dashboard from opening. Restored values are clamped to the current viewport to prevent resolution changes from leaving a dashboard unreachable.

React may observe DOM geometry and write browser-local presentation memory because those are ordinary browser APIs. Netscript UI calls such as `ns.ui.moveTail()` and `ns.ui.resizeTail()` remain owned by the script `main()` path, preserving the no-concurrent-Netscript invariant from FIX-002.


## D-020 — Operational telemetry has one aggregate health owner
**Status:** Locked

M2 operational telemetry uses a shared producer contract and one central `health-collector` on `home` as the owner of aggregate service health and bounded incident storage. Producers report stable service identity plus per-process instance ID, observed hostname/PID, lifecycle, heartbeat/freshness, health, phase, and reason through a host-independent transport.

Observed runtime placement is telemetry, not lifecycle authority. The future M4 Supervisor owns desired placement, launches, restarts, duplicate/orphan reconciliation, and startup ordering. M2 health collection may mark missing heartbeats stale but may not independently relocate or restart general services.

Telemetry is also distinct from M3 canonical game state: operational health/events describe the automation system; observed player/server/game facts belong to the canonical state owner.


## D-021 — Dashboard position is persistent; size is content-owned
**Status:** Locked

Dashboard position remains a browser-local user preference and is restored by stable dashboard key. Dashboard size is no longer persisted or restored from manual user resizing.

Each dashboard owns its runtime size. React may measure rendered content using ordinary DOM APIs and publish a debounced desired size through its in-memory bridge. Only the dashboard `main()` path may call Netscript UI resize/move APIs. Per-dashboard min/max bounds, viewport clamping, and resize tolerance prevent unusable geometry and resize jitter.

This contract applies to current dashboards and future tabbed dashboards: content or tab changes may dynamically grow or shrink the native tail while preserving the user's chosen screen position.


## D-022 — Dynamic dashboard size derives from the measured native content viewport
**Status:** Locked

Calibration in r25/r26 established that `ns.ui.resizeTail()` maps to the native `.react-resizable` dimensions, while Bitburner's intermediate log/content viewport is a scrollable flex column-reverse container whose placement caused the apparent black-gap/clipping behavior.

Production sizing must discover that content viewport structurally from the dashboard root-to-resizable ancestor chain rather than depending on generated MUI class names. Native overhead is measured at runtime as resizable dimensions minus content-viewport client dimensions; requested native size is rendered dashboard content plus that measured overhead, subject to dashboard bounds and viewport clamping.

Resize observation and main-loop tolerance provide convergence after content or tab changes. Fixed guessed chrome offsets are not part of the production sizing contract.


## D-023 — Dashboard layout groups use one selectable anchor
**Status:** Locked

Dashboard windows coordinate placement through browser-local presentation state rather than direct cross-dashboard DOM inspection or canonical telemetry. Each active dashboard publishes short-lived geometry under a stable ID and group; stale members expire automatically.

Each layout group has one operator-selectable anchor. The anchor's position is user-owned and persistent. Other active members are followers whose positions are derived from the anchor, configured ordering, current measured sizes, and group gap. Dynamic dashboard growth/shrink therefore reflows followers without changing telemetry/service lifecycle.

React/browser code may publish geometry, select the anchor, and calculate desired positions. Only each dashboard's Netscript main loop may apply native tail movement/resizing. Current `operations` layout is a vertical stack; future layout modes may extend the coordinator without adding pair-specific dashboard coupling.


## D-024 — Followers select and persist a dock side by native drag
**Status:** Locked

A dashboard follower is not limited to a fixed vertical stack. The coordinator supports `top`, `bottom`, `left`, and `right` docking relative to the current anchor, with same-side followers ordered deterministically.

A follower normally remains under automatic placement. If native window movement materially departs from the coordinator's commanded position, coordination is temporarily released for that follower. After movement settles, the coordinator compares normalized follower/anchor centers, selects the nearest side, persists that browser-local relationship, and resumes automatic placement. This makes ordinary Bitburner tail dragging the docking gesture without requiring Netscript calls from React.

Anchor transfer inverts an existing physical relationship where possible (`left↔right`, `top↔bottom`). Dynamic size changes continue to reflow from the persisted side. Dock relationships are presentation state and do not enter canonical telemetry/state.


## D-025 — M2 game observations use isolated domain collectors
**Status:** Locked

Broad game data collection is split into independent persistent domain services rather than one monolithic collector. Each collector owns only its domain snapshot and reports its own health through the shared telemetry contract. A failed or unavailable domain must not stop unrelated collection.

Observation snapshots are versioned, timestamped, freshness-bounded inputs. They are not canonical shared game state; M3 remains responsible for canonical state ownership and reconciliation. Optional locked mechanics are represented as unavailable capability data when that condition is expected, while unexpected collection failures degrade only the responsible service.

Collectors are read-only. Collection does not grant controller, spending, scheduling, execution, or resource authority.


## D-026 — Validation Dashboard is the engineering validation hub
**Status:** Locked

The Validation Dashboard is one persistent tabbed application and the primary engineering surface for correctness, health, freshness, diagnostics, and milestone evidence. Its initial tabs are Overview, Validating, Validated, Health, Updater, and Data. Tabs are presentation boundaries only: Health Collector, Update Watcher, and domain collectors remain independent backend services.

Validation lifecycle and individual test result are distinct. Active/incomplete/regressed validation belongs in Validating; completed evidence belongs in Validated and is collapsed away from the active workspace. A regression returns affected work to Validating rather than leaving stale green evidence visible.

The dashboard shell owns attention presentation. Ordinary events use unread badges/highlights and never change the selected tab. Critical/emergency escalation may force focus to the relevant tab once per materially distinct incident signature; acknowledgement suppresses repeated focus stealing for that same condition without hiding the active failure. Update availability is ordinary attention and therefore badges Updater rather than navigating automatically.

React remains Netscript-free under FIX-002. The dashboard main loop is the sole Netscript owner and uses existing command interfaces for actions such as exact-revision update approval. The dashboard does not gain lifecycle, canonical-state, authority, spending, scheduling, or execution ownership from presenting those systems.


## D-027 — Validation test execution is registry-controlled
**Status:** Locked

Validation test execution has its own Tests workspace. Validating answers what still requires proof; Tests owns approved execution; Validated stores completed evidence.

The Validation Dashboard is not a terminal or arbitrary script launcher. React may submit a stable test ID only. The Netscript-owning dashboard main loop resolves that ID through a repository-controlled registry, which owns the runner path, arguments, risk classification, and whether a test is executable or observational. Unknown IDs and manual/observational tests fail closed.

Tests should prefer real production interfaces and real observable conditions. Synthetic stimuli may be added only when explicitly designed and must not bypass the behavior being validated. In particular, updater-notification validation uses a genuine newer release rather than forged update telemetry.


## D-028 — Validation evidence records provenance explicitly
**Status:** Locked

Validation evidence distinguishes automated assertions from operator-confirmed observations. Both may be durable evidence, but their provenance must remain visible and must not be collapsed into an undifferentiated PASS.

Dashboard-owned automated runners suppress ordinary Netscript log output; the Tests workspace is their normal operator surface. Detailed latest automated results may be stored separately from the bounded evidence history. Operator confirmation is available only for registry entries explicitly marked observational/manual and records the documented observation without claiming machine verification.


## D-029 — Disruptive validation owns bounded mutation and restoration
**Status:** Locked

Registered validation tests may intentionally disrupt managed runtime only when their registry risk is explicit and the Tests UI requires operator confirmation before dispatch. A disruptive test must use a fixed repository-owned target set and may not accept arbitrary process/script targets from React.

The test runner must capture the exact processes it intends to mutate and arm restoration before the first mutation. It owns restoration on success, assertion failure, timeout, and script death, and may restart only processes it actually stopped. Restoration failure is a failed validation condition requiring recovery attention.

Emergency-focus validation crosses the real production threshold; it does not lower, mock, or bypass the threshold. React records presentation facts only through the in-memory dashboard bridge. The Netscript-owning dashboard main loop persists those facts for the test runner, preserving FIX-002.


## D-030 — M2 closes at r49; M3 begins with canonical-state design
**Status:** Locked

M2 Telemetry / Dashboard Foundation is complete and runtime validated through v0.5.0-r49. Closeout evidence covers structured telemetry/events, aggregate health and bounded incidents, seven reporting services, five isolated observation producers, shared dashboard presentation infrastructure, Validation Dashboard execution/evidence workflows, ordinary-attention non-focus behavior, controlled emergency focus/acknowledgement, and automatic restoration to healthy state.

The M2 observation snapshots are intentionally non-canonical. M3 must introduce an explicit canonical-state owner and versioned consumer contract; it must not make `data/observations/*.json` canonical merely by naming or direct reuse.

Standalone compact Health and Update Watcher presentation may coexist with the Validation Dashboard during M3. Their consolidation is presentation work and is not a prerequisite for canonical state.

The bounded post-install updater convergence/stale transient command feedback observed during M2 is deferred presentation polish rather than a milestone correctness blocker because release installation, persistent runtime reconciliation, and eventual terminal updater state are independently validated. Any future correctness regression in deployment identity or terminal state reopens the relevant deployment issue, not M2 state architecture.


## D-031 — Managed file retirement requires explicit stop-verify-delete authorization
**Status:** Locked

A managed file is never deleted merely because it disappears from a later manifest. Deletion requires an explicit one-release `retireFiles` declaration in the immutable release manifest. Retirement paths are restricted to managed source space, may not target protected runtime data or bootstrap puller/helper files, and may not also be active file targets in the same release.

Retirement reconciliation runs only after newly deployed ownership code and persistent runtime reconciliation have removed any relaunch source. For each retirement path the helper discovers matching processes, closes their tails, requests termination, waits, and verifies that no process with that script path remains. If stop or verification fails, the file is preserved and deployment runtime status is degraded. Only a verified-stopped path may be deleted; deletion is followed by an explicit absence check.

Every retirement produces operator-visible terminal lines and a structured `report.retirement.files` record including prior existence, matching/stopped PIDs, final status, and failure reason. Already-absent files are reported as such rather than claimed as deleted. Retirement declarations are one-release instructions; immutable manifests and deployment reports are the audit history.


## D-032 — M3 canonical state separates factual time from consumer freshness
**Status:** Locked

M3 is the single durable owner of latest canonical game state. M2 collectors remain factual observation producers and publish versioned observations into M3 transport while retaining durable observation snapshots for restart reconciliation. Ports move observations and control messages but never become canonical truth or broadcast/pub-sub.

All operational data uses a shared wall-time contract. An observation records when it was observed; canonical state preserves that timestamp and records its own revision/canonicalization time. Producers and M3 do not declare a universal fresh/stale judgement. Each consumer decides whether the observation age is acceptable for its use. Availability/unavailability remains factual producer data. Historical windows are elapsed-time windows, not record-count windows, so missing collection remains an explicit gap.

Port allocation is centralized. Port 1 remains telemetry; ordinary observations share an ingress lane and market receives a dedicated observation lane plus a reserved control lane because high-frequency isolation is expected to matter. Dedicated lanes are justified by domain requirements, not allocated automatically per collector.

Collection cadence is a control-plane concern. Collectors retain baseline and safe-minimum cadence constraints; M3 will resolve leased consumer cadence requests to an effective interval. A crashed requester must not permanently force high-frequency collection. This cadence mechanism changes acquisition frequency but does not make collectors controller-aware or grant consumers authority.


## D-033 — Validation requirements and runtime proof have separate owners
**Status:** Locked

The repository owns a deployed validation plan describing current validation requirements, stable test IDs, and per-requirement validationVersion. The Bitburner installation owns a protected durable validation ledger recording the latest proven result for each test/version. The dashboard derives Validating, Tests, and Validated by reconciling those sources rather than hard-coding milestone lifecycle in JSX.

A PASS counts only for the matching test ID and validationVersion. A normal software release does not invalidate unchanged proof; incrementing the validationVersion intentionally requires new proof while retaining older evidence as history. A later FAIL for the current test/version regresses its requirements to Validating.

The plan cannot authorize arbitrary execution. Runner paths, risk classification, and manual/automated behavior remain repository-code allowlisted by the validation test registry. Protected runtime ledger/evidence files are not deployment targets.


## D-034 — Operator-visible update poll is one complete redundant discovery cycle
**Status:** Locked

Supersedes only the split-cadence polling detail in D-017. Release discovery remains redundant Raw + GitHub Contents API with highest-valid-revision selection and immutable releaseRef semantics, but the watcher must not advertise a shorter poll interval than the cadence at which both independent sources are actually sampled.

A normal discovery cycle runs every 65 seconds and samples cache-busted Raw plus the Contents API together. This keeps normal unauthenticated Contents requests below GitHub's 60-requests-per-hour public ceiling while leaving small headroom, and removes the misleading former 30-second cycle / 75-second API split that could make a healthy release appear only after 2–3 displayed cycles. Approval still performs a fresh complete discovery check before deployment.

Raw may remain eventually consistent even with a unique query parameter. Therefore the cache-buster is retained as a useful cache-avoidance mechanism, not treated as a freshness guarantee; the API source is part of every complete normal cycle.


## D-035 — Collection cadence is controlled by expiring leases with one durable owner
**Status:** Locked

M3 collection cadence control is owned by the persistent `collection-control` service, separately from canonical game-state ownership. Consumer requests are leases containing stable identity, owner, domain, requested interval, and expiry. Port 3 transports commands only. The durable collection-cadence state is authoritative and survives service restart.

For each domain, the fastest active valid lease wins, bounded by the collector's minimum safe interval and its normal baseline. Expiry or explicit release removes authority automatically; no active lease means baseline cadence. Collectors consume resolved cadence but do not inspect or arbitrate competing leases. Market port 5 remains reserved for later market-specific high-frequency control.


## D-036 — Stock/server resource associations are derived canonical facts
**Status:** Locked

The stock-symbol ↔ organization ↔ server relationship belongs to canonical state, not the future authority registry or stock trader. The canonical owner derives it only from canonical market and network inputs. Stock organization comes from `ns.stock.getOrganization(symbol)`; server organization comes from `ns.getServer(host).organizationName`. Only exact non-empty organization-name equality creates an association. Unmatched resources remain explicit and are never guessed or filled from a static table.

The derived state's provenance includes both source revisions/timestamps and its observation time is the older input timestamp. Association does not imply authority, exclusivity, or action compatibility; those are separate authority-policy decisions.


## D-037 — Diagnostics has one durable evidence-backed incident owner
**Status:** Locked

Use one persistent diagnostics service to own explanatory incident state. Producers report structured evidence; diagnostics may correlate existing health/deployment facts, while the Validation Dashboard only presents the resulting durable state. Findings are explicitly classified OBSERVED, CORRELATED, or INFERRED and retain supporting evidence/confidence. The system must not present an inferred root cause as observed fact. Stable incident identities deduplicate repeated symptoms, and explicit resolution preserves evidence history.


## D-038 — Intentional service retirement is explicit
**Status:** Locked

Once an instance has entered Health state, normal/intentional termination must be distinguishable from heartbeat loss. Ephemeral services publish a versioned retirement event for their exact service/instance identity before exit. Health may remove only that exact registered instance. Missing heartbeats without retirement continue to fail stale. Retirement is not encoded as a permanent health status.


## D-039 — Authority is capability-scoped, durable, atomic, and fail-closed
**Status:** Locked

Use one persistent Authority Registry as the durable owner of permission. A claim is a typed resource plus capability, not simple ownership of the whole resource. Identical resource+capability claims conflict in the first slice; distinct capabilities may coexist. Multi-claim leases are all-or-nothing, carry owner/intent/correlation provenance, expire absolutely, and must be validated against current durable authority immediately before controlled side effects. Missing/stale/invalid authority denies action. Authority does not schedule, execute, budget, or choose strategy.

## D-040 — Work Orders delegate outcomes, never functionality or implicit authority
**Status:** Locked

A higher-level coordinator requests an outcome from the domain controller that owns that function. Work Orders carry issuer/receiver/objective/scope/parent-authority/correlation provenance and an explicit lifecycle including CLOSING. A Work Order alone is not permission; delegated execution requires a separately validated authority chain. Normal revocation is designed as drain-first with bounded cleanup authority; forced revocation is immediate/fail-closed. These delegation/revocation mechanics are implemented only after the direct authority slice is proven.


## D-041 — Delegation is a live authorization chain, not transferred authority
**Status:** Locked

Work Orders are durably owned separately from Authority. Creation requires the issuer's current DIRECT authority over every delegated claim and binds the order to the parent lease, correlation ID, named receiver, scope, and an expiry no later than the parent. Executors never inherit or copy the issuer lease. Each delegated authorization validates current Work Order state and current parent Authority state together and returns DELEGATED provenance. Order closure/expiry, parent release/expiry, owner/correlation mismatch, receiver mismatch, or scope mismatch denies new execution. Drain/cleanup authority remains a separate later lifecycle concern.


## D-042 — Revocation is drain-first with bounded cleanup-only authority
**Status:** Locked

Normal Work Order closure immediately ends permission for new objective work by moving ACTIVE to CLOSING. CLOSING may authorize only a distinct CLEANUP mode for the exact named receiver and original claim scope, until a fixed non-renewable cleanup deadline. CLEANUP is not a lease, cannot create/delegate work, and executors must route it only to predefined unwind/reduction operations rather than ordinary objective execution. It may survive loss or expiry of the parent authority solely so already-started effects can be retired safely. The receiver explicitly completes cleanup to CLOSED. Forced cancellation is immediate CANCELLED and provides no cleanup. An uncompleted cleanup window ends FAILED with no continuing authorization.


## D-043 — Execution Scheduler exclusively owns managed compute placement and execution leases
**Status:** Locked

Managed controllers do not launch executors directly. The persistent `execution-scheduler` is the single durable owner of managed compute placement, bounded RAM reservations, process launch attribution, reconciliation, and reservation retirement. Authority answers whether game-resource work is permitted; Work Orders describe delegated outcomes; Execution Scheduler answers where authorized work may consume compute. An execution lease never grants target authority and is not a subsystem RAM budget.

Every execution request binds to an existing ACTIVE Work Order, its named receiver, and correlation ID. The first slice is deterministic, FIFO, single-host and non-preemptive, with a bounded pending queue. `home` is the only placement host in the first slice; distributed placement is a later extension of the same contract. Canonical state informs later placement planning, while final admission must reconcile against actual available RAM immediately before launch.

Every RUNNING managed executor is attributable to one durable execution record containing host, PID, Work Order, receiver, correlation, script, threads, RAM and absolute expiry. Scheduler restart must reconcile durable records against real processes without extending expiry or blindly relaunching RUNNING work. Missing processes become terminal; surviving exact PID/host processes are recovered. Work Order closure stops new admission and moves existing execution toward drain/termination semantics. Future subsystem RAM budgets remain a separate control-plane owner.
