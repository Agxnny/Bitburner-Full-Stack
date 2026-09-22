# Architecture

## Core model

The stack is a modular control system built around centralized state, authority, budgeting, scheduling, execution, and telemetry.

### Layers

**Bootstrap**
- Git pull / deployment utility
- Persistent update watcher
- Manifest and staged update handling
- Post-update persistent-runtime reconciliation
- Recovery tooling

**Core control plane**
- Supervisor / service registry
- Canonical state service and collectors
- Resource, authority, and budget manager
- Scheduler
- Executor
- Messaging / event transport
- Telemetry and logging

**Domain controllers**
- Network/rooting
- Hacking
- Purchased servers
- Stock trading
- Stock manipulation
- Progression
- Later BitNode-specific systems

**Workers / execution adapters**
- Ephemeral hack/grow/weaken workers
- Trading execution
- Server-management actions
- Other controlled side effects

**UI**
- React Production Dashboard
- React Validation Dashboard

## Core responsibilities

### State service
Owns the canonical observed view of the game. Raw observations and derived state are clearly distinguished. Canonical data carries factual observation time and availability; freshness is consumer policy derived from the shared wall-time contract rather than a producer-owned label.

### Resource, Authority & Budget Manager
Owns contested-resource governance.

- Authority: who may decide for a domain/resource.
- Budget: how much of a divisible shared resource an authority may consume.
- Reservation: protected capacity/money not available to ordinary consumers.
- Lease: time/lifecycle-bounded grant of resource or authority.

Examples include RAM, money, stock symbols, hacking targets, player work, sleeves, purchased-server slots, and future shared domains.

### Scheduler
Owns managed work scheduling, queueing, priority, dependencies, backpressure, and coordination with leases/budgets.

### Executor
Performs approved side effects and validates required authority before acting. Domain controllers should not duplicate execution paths.

### Supervisor
Thin lifecycle supervisor for persistent services. It owns startup/shutdown ordering, service health, controlled restart, and safe-mode coordination; it does not own domain strategy.

During M1, bootstrap infrastructure performs only the minimum lifecycle work required to keep the updater itself recoverable. This does not replace the later Supervisor.

## Controller/executor separation

Controllers determine desired outcomes or intents. Executors perform actual side effects. Delegating execution does not surrender decision authority.

Example: a stock-manipulation controller may gain authority for a symbol and issue trade intents, while the stock trader remains the sole trade executor.

## Runtime classes

- **persistent** — expected to remain running; protected by update lifecycle rules.
- **managed** — lifecycle controlled by an owning persistent service, supervisor, or scheduler.
- **ephemeral** — short-lived jobs/workers expected to terminate naturally.

The M1 update watcher is persistent. The update dashboard is a managed child of the watcher rather than an independently persistent unit.

## State and communication

Preferred direction:
- Ports/messages for commands, events, and lightweight coordination.
- Durable files for deploy/runtime metadata, configuration, and recovery state where appropriate.
- Direct NS API observation concentrated in collectors/execution adapters instead of duplicated across domain modules.
- Consumers depend on interfaces rather than storage details.

## Dashboard architecture

Both dashboards consume structured telemetry from core/domain systems. They do not own canonical state.

**Production Dashboard:** live operational status, throughput, resources, money, hacking, stocks, progression, and other production behavior.

**Validation Dashboard:** health, freshness, invariants, reconciliation, authority conflicts, queue/job correctness, service lifecycle, update validation, and diagnostics.

Dashboard commands use standard command/authority pathways rather than privileged bypasses.

The first M1 dashboard slice is `src/ui/update-dashboard.jsx`. It reads protected update/deployment telemetry and emits update approval/decline commands. It never launches deployment code directly. `src/bootstrap/update-watcher.js` owns its process lifecycle during M1: watcher startup refreshes the dashboard process and heartbeat checks relaunch it if missing.

## Production Dashboard information architecture

The Production Dashboard is the operator-facing answer to “what is production doing?” It consumes canonical state, domain telemetry, budgets, and supported configuration; it never becomes a competing state owner, controller, scheduler, authority ledger, or diagnostic engine. Concise controller-provided reasoning may be shown, but internal formulas, decision trees, Work Orders, leases, scheduler records, and validation evidence remain outside the production UI unless reduced to a production-impacting status.

The detailed feature contract and approved per-tab information model are owned by `docs/production-dashboard.md`. This architecture section is the concise system-level boundary; future tab/layout refinements must keep the feature document synchronized.

### Navigation
Permanent production tabs are:
- **Overview**
- **Hacking**
- **Stocks**
- **Stock Manipulation**
- **Network**
- **Progression**
- **Settings**

Capability-dependent tabs may appear when their systems exist and are relevant: **Hacknet, Sleeves, Gang, Bladeburner, Corporation**, and later BitNode-specific controllers. Network owns both discovered/rooted network presentation and purchased-server fleet presentation rather than creating a separate Purchased Servers top-level tab.

### Shared operator controls
Each controllable production domain exposes the same lifecycle intent through standard command pathways:
- **Graceful Stop:** stop admitting new objective work, drain/clean up bounded in-flight work, release domain resources/authority as appropriate, then stop.
- **Hard Stop:** immediately stop the domain's non-persistent managed production work and retire/cancel outstanding work as safely as the domain contract permits.
- **Restart:** graceful stop followed by start; a failed/bounded shutdown is reported rather than silently escalating to hard stop.
- **Start:** available when the domain is stopped.

Overview additionally exposes a latched **ESTOP**. ESTOP immediately prevents/retires non-persistent production activity and blocks automatic production restart until explicitly cleared. Production lifecycle commands, including ESTOP, may not stop, restart, replace, or retire persistent runtime units. Persistent lifecycle mutation is reserved to the updater/deployment path and explicitly authorized disruptive validation/tests.

### Overview
Shows global money, managed RAM, production income/performance, a small aggregate health indicator, global production state, production-relevant attention items, current domain activity, and compact clickable summaries of available production tabs. It does not duplicate detailed validation/control-plane internals.

### Hacking
Shows operational mode (including player-facing Money/XP selection), production target(s), target-selection reasoning, money/max and security/min condition, workers/batches, ETA/drain state, performance ($/s or XP/s), and operational state. Multi-target presentation may abbreviate names while preserving full-name access.

A dedicated preparation area shows targets being prepared/recovered with money/security condition, workers/RAM, prep state, and ETA. A spare-RAM/opportunistic summary explains capacity used for production, prep, XP/secondary work, policy reserve, and genuinely free RAM. Production UI shows concise reasons such as “spare RAM available; next-ranked viable target,” not target-scoring internals.

### Stocks
Stocks is the trader/operator workspace. The trader remains the sole trade execution path.

**Price chart:** selectable symbol; 5m/15m/30m/1h/4h plus Historical. Raw market observations are timestamped at observation time and are the durable historical basis. OHLC candle membership is deterministic from fixed wall-clock buckets; completed candles never gain, lose, or move samples. The forming candle is grey. Historical incomplete candles are visually distinct. Longer views intentionally show progressively more candles while also increasing candle duration; exact scaling is presentation policy to be finalized against collector cadence. Historical may adapt aggregation to the known-history span without mutating raw observations.

Collection gaps are never interpolated. A gap has dashed orange start/end boundaries and empty elapsed-time space between them. Trade open/close markers use actual execution time/price. The right edge carries the latest observed price tag; stale data freezes the last observed value and marks it stale.

**Portfolio:** open positions only, with symbol, LONG/SHORT, shares, entry price, current observed price, unrealized P&L ($ and %), and current forecast score. Rows select the chart symbol; stale current prices are explicit.

**Performance:** allocated trading capital, available capital, invested capital, portfolio value, realized/unrealized/total P&L and return. Performance history emphasizes cumulative realized P&L with total P&L available alongside it. Compact statistics include trades, wins/losses/flats, win rate, average/best/worst outcomes, with profit factor available when meaningful. Recent closed positions are split into winners and losers; flat closes remain valid outcomes and appear as a smaller side summary.

**Forecast/opportunities:** separate strongest long and strongest short rankings. Raw forecast retains stable meaning (0.5 neutral, above upward, below downward) and is distinct from any future trader opportunity score. Rows may show strengthening/stable/weakening opportunity state, existing-position/reversal indicators, and select the chart symbol. Only defensible confidence metrics may be shown.

**Trader status/activity:** compact current state and latest action with short human-readable reason; no full reasoning trace. Recent activity is bounded to meaningful trade actions, not scans/HOLD/heartbeat spam.

**Position limits:** normal position cap constrains ordinary exposure but is a ceiling, not a target size. Exceptional coordinated exposure (for example stock manipulation) requires a scoped, temporary, attributable override naming symbol/direction/maximum exposure/operation provenance/expiry. It never bypasses the trader's total money budget and does not allow the manipulation controller to execute trades directly.

### Stock Manipulation
Shows selected operation/symbol, PUMP/DUMP direction, phase and elapsed time, concise selection reason, **true position versus desired position**, normal cap plus any active scoped override, current price/forecast and movement since start, associated server condition, committed hacking workers/RAM/in-flight work, ETA, position P&L, and manipulation-attributed result/P&L where defensible. The intended lifecycle is readable as acquiring → manipulating → exiting → complete. Multiple operations may be selectable later without requiring the first implementation to support concurrency. Internal manipulation logic is not exposed.

### Network
Combines network discovery/rooting and purchased-server capacity. Summary includes discovered/rooted/usable hosts, total/used/reserved/free RAM, and utilization. Purchased servers are grouped by RAM tier (for example “8 × 64 TB”) with tier utilization rather than printing identical server rows; exceptional individual hosts may be expanded or surfaced as attention items. Capacity/upgrade presentation includes slots, current tiers, next meaningful upgrade/replacement, expected capacity gain, cost/budget state, and controller state. Rooting/discovery presentation shows unrooted/rootable/newly eligible hosts.

### Progression
Progression is explicitly player-facing and has three policy modes:
- **OFF:** no progression analysis, recommendations, or automated progression actions.
- **MANUAL:** the same progression decision engine continues analysis and presents the next suggested action, concise reason, requirements/cost/impact, and limited look-ahead, but does not autonomously execute progression actions.
- **AUTOMATED:** the same decision engine may execute eligible actions through normal authority/budget/command paths; actions requiring the player remain recommendations.

Manual and Automated must not use separate decision logic. Progression eventually covers programs, factions/augmentations, player work, home upgrades, and reset planning.

### Settings
Settings is the supported surface-level configuration center. It may expose policy parameters and thresholds that influence decisions—such as target eligibility thresholds, stock position caps, reserve percentages, spending limits, concurrency limits, or safe collection/display preferences—without exposing arbitrary implementation constants, formulas, state-machine transitions, schema/correctness invariants, or editable controller logic. Immediate operational intent (for example Hacking Money/XP mode or Progression OFF/MANUAL/AUTOMATED) stays on the relevant domain tab. Settings are grouped by subsystem and indicate whether changes apply live or require a domain restart.

### Presentation/window integration
Production reuses the established shared dashboard visual language and the existing measured sizing/docking coordinator. It does not create a second window manager. Production may be docked/anchored to Validation (normally on its right) through the existing four-side relationship contract, and tab content may drive dashboard-owned dynamic size while docking preserves the established relationship.


## Update architecture

The deployment descriptor is a small mutable discovery pointer. Production descriptors identify semantic version, monotonic revision, revision-specific manifest path, and an immutable Git commit SHA `releaseRef`.

Discovery is deliberately redundant. A normal watcher discovery cycle runs every 65 seconds and samples both cache-busted GitHub Raw and the public GitHub Contents API together, choosing the highest valid revision. The interval keeps unauthenticated Contents API discovery below its public hourly ceiling while ensuring the operator-visible poll cadence never claims a complete redundant check when only Raw was sampled. Equal revisions must agree on version, manifest, and `releaseRef`. Approval forces another complete discovery check before the watcher delegates to the puller. Per-source attempt/success time, revision, error, and selected-source telemetry are published for validation.

The puller independently performs both descriptor checks before enforcing `--expect-revision N`. This keeps human approval revision-bound even when one branch-view source is stale.

After a production descriptor is selected, mutable `main` is no longer used to define release bytes. The puller resolves the manifest and every managed `source` against the descriptor's immutable `releaseRef`. This separates eventual-consistency discovery from immutable release content.

r12 is a one-time compatibility bridge because the r11 puller cannot interpret `releaseRef`. Its manifest uses revision-unique source snapshots under `deployment/releases/r12-src/`. Once r12 is installed, later releases use commit-pinned canonical repository paths.

The deployment manifest is a deployment contract. It describes managed files and may declare persistent runtime units. Each persistent unit identifies its entry script, host, thread/argument invocation, defining managed files, and restart order.

Updates are staged and validated before activation. The puller derives a runtime reconciliation plan from the manifest and staged file actions. A persistent unit is restart-eligible only when one of its defining files actually changed; a missing persistent unit is always eligible to be relaunched.

After activation, `git-pull-self-update.js` waits for the puller to exit, refreshes the puller itself from the same immutable release content, commits deployment state, then reconciles persistent units in manifest-defined restart order. Unchanged running units are untouched. Changed running units are restarted. Missing units are relaunched. A runtime launch failure leaves the file deployment committed but records a degraded runtime result for explicit recovery.

Updater/watch infrastructure is assigned the final restart order so the system doing update coordination is replaced last. The update watcher then takes responsibility for opening and maintaining its managed dashboard child.

## Anti-duplication principle

If a new system needs shared state, ownership, resource allocation, budgeting, scheduling, execution, messaging, or telemetry, it must use the existing core abstraction unless a documented architectural decision proves the abstraction insufficient.


## M3 design handoff — communication contract (not yet implemented)

M3 is intentionally a thin boundary between the M2 observation producers and future consumers. The next design session must not treat it as a second collector framework or as controller intelligence.

The design starting point is:
- **State:** durable/latest-state canonical interfaces/files, single writer and many readers. Consumers must be able to restart and read current truth without replaying transient messages.
- **Commands/events:** bounded ports/queues with an explicit reservation map and versioned envelopes. Commands mean “do this”; events mean “this happened.”
- **Process arguments:** startup configuration/identity only.
- **Telemetry/history:** diagnostic and validation evidence, not operational authority.
- **React bridge:** UI-local presentation bridge only; never a cross-process bus.

M3 implementation uses a centralized port registry. Port 1 remains telemetry; ordinary observations use a shared ingress lane, while market has a dedicated observation lane and reserved control lane. Ports are transient single-consumer queues, never canonical truth or broadcast/pub-sub.\n\nWall time is factual system metadata. Producers stamp observations with observedAt; M3 preserves that timestamp and records canonicalizedAt/revision. Availability is factual. Freshness is intentionally not stored as a universal state judgement: each consumer compares observedAt with the current wall clock under its own maximum-age requirement. Historical windows use elapsed time rather than sample count, so collection gaps remain visible.\n\nThe canonical state owner persists one latest envelope per domain under data/state. It can reconcile from durable M2 snapshots after restart, so missed port traffic cannot erase current truth. Collection cadence control is a separate control-plane contract: collectors will retain baseline/safe-minimum configuration while M3 resolves leased consumer cadence requests; cadence policy does not belong inside individual domain collectors.

The existing `data/observations/*` files remain M2 inputs. M3 may ingest them behind an interface but must not make them canonical merely by reusing their storage paths. Future M4+ consumers should depend on M3 contracts rather than collector file layouts.


## Validation plan and runtime proof

Validation uses two deliberately separate truths. The deployed repository plan at `src/validation/validation-plan.json` defines the current requirements, their validation-definition versions, and the stable approved test IDs that can satisfy them. Protected runtime state at `data/validation/ledger.json` records what this Bitburner installation has actually proven.

The Validation Dashboard reconciles those sources. A requirement is Validated only when the ledger contains a PASS for the same test ID and validationVersion; otherwise it remains Validating and its registered test remains available in Tests. Changing ordinary release revision does not invalidate proof. Changing a requirement's validationVersion does. Historical evidence remains in the evidence store even when a newer validation definition supersedes it.

The plan never supplies executable script paths. `src/validation/test-registry.js` remains the allowlist for runner path, risk, and manual/automated classification, preserving the registry-controlled execution boundary. Deployment manages the plan and code; it must not overwrite the runtime ledger.


### M3 collection cadence control

`src/core/collection-control-service.js` is the single durable owner of consumer cadence leases. Consumers send lease upsert/release commands through port 3; the port is transient transport and never authority. The owner persists `data/control/collection-cadence.json`, removes expired leases, and resolves each domain to the fastest active request bounded by that collector's declared minimum interval and baseline. Collectors read only the resolved durable state through `src/core/collection-control.js`; they do not arbitrate requests. With no active valid lease, collection returns automatically to its configured baseline. Port 5 remains reserved for later dedicated market control.


### Canonical resource associations

Canonical state includes a derived `associations` domain owned by `canonical-state-service`. It joins canonical market `symbol → organization` facts with canonical network `hostname → organizationName` facts using exact organization-name equality. It records source revisions/timestamps, bounds its observation time to the older source, and keeps unmatched resources explicit. It is factual state only; authority and compatibility policy consume it later. See `docs/canonical-state.md`.


### Diagnostics and incident intelligence

Diagnostics-service is the single durable owner of explanatory incident state. Structured diagnostic reports use the centrally reserved diagnostics ingress port; the port is transport, never truth. The service correlates direct reports with health and deployment evidence and persists bounded incidents under data/diagnostics. Findings explicitly distinguish OBSERVED facts, CORRELATED conclusions, and INFERRED hypotheses with evidence/confidence. Unknown causes remain unknown. The Validation Dashboard consumes this state through its Diagnostics view and does not perform its own root-cause inference. See docs/diagnostics.md.


#### Service retirement telemetry
A service that has registered health and is intentionally ending may publish an explicit service-retirement record for its exact instance identity. Health removes that instance from active service state. Absence without a valid retirement record remains subject to stale detection. Retirement is an event, not a replacement health state.


### Generic authority and work orders

The persistent authority-service is the single durable owner of permission leases. Authority claims are typed resource + capability pairs; identical claims conflict while distinct capabilities may coexist unless a later explicit compatibility policy says otherwise. Multi-claim acquisition is atomic and authority expiry fails closed. Work Orders are a separate outcome-request contract and never implicitly transfer authority. Delegated execution must later validate a complete authority-to-work-order chain. Domain functionality is never duplicated by coordinators. See docs/authority-work-orders.md.


#### Delegated Work Order execution
A persistent work-order-service owns durable outcome-request lifecycle state. It may activate an order only against current DIRECT issuer authority, and it caps order lifetime to the parent lease. Executors do not receive or copy leases. They present Work Order identity and are authorized as DELEGATED only after current Authority and Work Order state are jointly validated. Receiver, claim scope, correlation, order state/expiry, parent ownership/scope/expiry all fail closed.


#### Delegated Work Order execution
A persistent work-order-service owns durable outcome-request lifecycle state. It activates an order only against current DIRECT issuer authority and caps order lifetime to the parent lease. Executors do not receive or copy leases. They receive DELEGATED authorization only after current Authority and Work Order state are jointly validated for receiver, claim scope, correlation, order state/expiry, and parent ownership/scope/expiry.


#### Drain-first closure and cleanup authority
Normal Work Order closure is two-phase. ACTIVE becomes CLOSING immediately, which denies all new DELEGATED objective execution. During CLOSING only the named receiver may obtain CLEANUP authorization, limited to the order's original claims and a fixed short deadline. CLEANUP is a distinct execution mode for executor-defined unwind operations; it is not a lease and cannot authorize ordinary objective work or new delegation. It may remain valid after parent authority disappears solely to retire effects already started under valid authority. Receiver completion ends cleanup early at CLOSED. Forced cancellation is immediate CANCELLED with no cleanup. Cleanup deadline exhaustion becomes FAILED and fails closed.


### Execution Scheduler

The persistent `execution-scheduler` is the single owner of managed compute placement and execution leases. A controller must first establish target permission through Authority and an ACTIVE Work Order; it then requests compute rather than directly launching a managed executor. The scheduler binds execution to Work Order receiver/correlation, maintains bounded durable execution records, performs final RAM admission, launches the process, attributes host/PID/RAM, and reconciles process reality on restart. Execution leases grant compute only and never substitute for target authority or future subsystem budgets. The first slice intentionally places only on `home`; distributed placement extends this contract later. See `docs/execution-scheduler.md`.


### Resource Budget Manager

The persistent `resource-budget-manager` is the single owner of logical consumption envelopes for divisible shared resources. The first implemented resource is RAM. Budget Manager owns per-owner ceilings only; Execution Scheduler owns actual process placement and RAM reservations and derives current usage from its own active execution records. Managed execution therefore requires both a valid Work Order/Authority chain and sufficient budget, while physical free RAM remains a separate scheduler constraint. See `docs/resource-budgets.md`.
