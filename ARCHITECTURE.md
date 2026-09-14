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
Owns the canonical observed view of the game. Raw observations and derived state are clearly distinguished. State includes freshness metadata so consumers can fail closed on stale data.

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

The deployment manifest is a deployment contract. It describes managed files and may also declare persistent runtime units. Each persistent unit identifies its entry script, host, thread/argument invocation, defining managed files, and restart order.

`src/bootstrap/update-watcher.js` is the persistent detection and approval-command owner. It polls the cache-busted remote descriptor every 30 seconds, publishes health/update status to `data/update-status.json`, consumes the bounded single-slot command at `data/update-command.json`, and never auto-installs.

Approval is revision-bound. Before execution, the watcher re-fetches the remote descriptor and verifies that the approved revision is still the current newer revision. It then delegates execution to `git-pull.js --expect-revision N`; the puller independently verifies the same revision. Declines remain dismissed until a later normal poll.

Updates are staged and validated before activation. The puller derives a runtime reconciliation plan from the manifest and staged file actions. A persistent unit is restart-eligible only when one of its defining files actually changed; a missing persistent unit is always eligible to be relaunched.

After activation, `git-pull-self-update.js` waits for the puller to exit, refreshes the puller itself, commits deployment state, then reconciles persistent units in manifest-defined restart order. Unchanged running units are untouched. Changed running units are restarted. Missing units are relaunched. A runtime launch failure leaves the file deployment committed but records a degraded runtime result for explicit recovery.

Updater/watch infrastructure is assigned the final restart order so the system doing update coordination is replaced last. The update watcher then takes responsibility for opening and maintaining its managed dashboard child.

## Anti-duplication principle

If a new system needs shared state, ownership, resource allocation, budgeting, scheduling, execution, messaging, or telemetry, it must use the existing core abstraction unless a documented architectural decision proves the abstraction insufficient.
