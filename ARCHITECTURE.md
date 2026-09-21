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
