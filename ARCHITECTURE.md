# Architecture

## Core model

The stack is a modular control system built around centralized state, authority, budgeting, scheduling, execution, and telemetry.

### Layers

**Bootstrap**
- Git pull / deployment utility
- Update watcher
- Manifest and staged update handling
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

## Controller/executor separation

Controllers determine desired outcomes or intents. Executors perform actual side effects. Delegating execution does not surrender decision authority.

Example: a stock-manipulation controller may gain authority for a symbol and issue trade intents, while the stock trader remains the sole trade executor.

## Runtime classes

- **persistent** — expected to remain running; protected by update lifecycle rules.
- **managed** — lifecycle controlled by the supervisor/scheduler.
- **ephemeral** — short-lived jobs/workers expected to terminate naturally.

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

## Update architecture

The deployment manifest is a deployment contract. It describes managed files, runtime units, lifecycle classification, hashes/versions, and explicit retirement when needed.

Updates are staged and validated before activation. Persistent units remain untouched on failed/partial updates. Changed persistent units become restart-eligible only after successful validation; the updater/watcher is restarted last.

## Anti-duplication principle

If a new system needs shared state, ownership, resource allocation, budgeting, scheduling, execution, messaging, or telemetry, it must use the existing core abstraction unless a documented architectural decision proves the abstraction insufficient.
