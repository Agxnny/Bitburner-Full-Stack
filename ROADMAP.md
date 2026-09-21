# Roadmap

## M0 — Project Foundation
- Governance docs
- Architecture and decisions
- Repository structure
- Handoff/current-state process

## M1 — Reliable Deployment
- Bootstrap git-pull utility
- Deployment manifest
- Update watcher
- Staging and validation
- Persistent runtime protection
- Update telemetry

## M2 — Telemetry and Dashboard Foundation — COMPLETE (runtime validated through v0.5.0-r49)
- Structured logging/events
- Health/status model
- React dashboard shell
- Validation panel framework
- Production dashboard shell

## M3 — Canonical State — ACTIVE (canonical-state, collection-cadence, and resource-association slices runtime validated through v0.6.0-r66)
- Define port reservation/allocation and command/event transport rules
- Define canonical latest-state interfaces, ownership, factual timestamps, and consumer freshness contracts
- Reuse M2 collectors as producers; do not duplicate collection
- Collectors and state schema
- Shared wall-time semantics and consumer-defined freshness
- Raw vs derived state
- Reconciliation
- Validation dashboard state-health views

## M4 — Runtime Supervision
- Service registry
- Supervisor
- Startup/shutdown ordering
- Heartbeats and health states
- Safe mode and manual control
- Validation dashboard service-health views

## M5 — Resource, Authority & Budgeting
- Authority leases
- RAM/resource leases
- Money and other budgets
- Reservations
- Transfer/revocation/expiry
- Reconciliation
- Validation views

## M6 — Scheduler and Executor
- Job lifecycle and queues
- Priorities/dependencies/backpressure
- Lease integration
- Executor and side-effect validation
- Process reconciliation
- Validation views

## M7 — Network
- Discovery
- Rooting
- Host inventory/classification
- Deployment eligibility

## M8 — Hacking
- Target selection
- Prep
- Simple HGW under scheduler/lease control
- Advanced batching/timing
- Production and validation telemetry

## M9 — Purchased Servers
- Budget-controlled purchase/upgrade lifecycle
- Capacity planning

## M10 — Stocks
- Trader as sole trade execution path
- Symbol authority and capital budgets
- Position management
- Production/validation UI

## M11 — Stock Manipulation
- Explicit symbol authority transfer
- Hacking/manipulation coordination
- Trade intents routed to trader
- Authority release and recovery

## M12 — Progression
- Programs
- Factions/augmentations
- Player work
- Home upgrades
- Reset planning

## Later systems
- Hacknet
- Sleeves
- Gang
- Bladeburner
- Corporation
- BitNode-specific controllers

## Workflow rule
Only one implementation milestone/feature is active at a time. Later ideas may be documented without interrupting the active feature unless they reveal a genuine blocker.


### M3 foundation insertion — Diagnostics & Incident Intelligence
**Status:** First slice runtime validated through v0.6.0-r67; controlled real failure-correlation validation is next

Before Generic Authority, add structured diagnostic ingress, one durable diagnostics owner, evidence-backed health/deployment correlation, deduplicated incident lifecycle, and an explanatory Validation Dashboard view. SAFE validation must prove the contract without disrupting production services. Authority/Work Orders resume after this foundation slice is runtime validated.
