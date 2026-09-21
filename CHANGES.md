# Working Changes

This file is the repository's lightweight in-progress change log. Its purpose is to preserve work-in-progress context between commits, chats, and handoffs so partially completed changes are not lost.

`CHANGES.md` is not a replacement for `CURRENT_STATE.md`, `DECISIONS.md`, `FIXES.md`, or feature documentation. It is the short-lived working record of what is being changed right now.

## Required workflow

Before the first repository mutation for a new feature, fix, or meaningful change, create or refresh the **Active change** entry below.

Update the active entry after meaningful implementation steps, before switching tasks, before ending a development session, and before handing runtime validation to the operator.

At minimum record:
- **Goal** — what this change is intended to accomplish.
- **Status** — concise current state, such as design, implementation, validation, blocked, or complete.
- **Files / areas touched** — the important repository surfaces involved.
- **Decisions / constraints** — only the details needed to resume safely.
- **Validation** — what has been checked and what is still unproven.
- **Next step** — the exact next action.
- **Blockers / risks** — only when applicable.

When the change is complete, move a concise summary to **Recently completed** and replace the active entry with the next real change. Do not maintain a verbose lifecycle history here; durable architectural decisions belong in `DECISIONS.md`, reusable incidents in `FIXES.md`, and milestone handoff state in `CURRENT_STATE.md`.

## Active change

### M3 Canonical State — handoff/design
**Status:** Design only; no M3 runtime implementation started

**Goal:** Define the thin information-contract layer between the already-built M2 observation collectors and future M4+ consumers. M3 is not a second collection system and is not controller intelligence. It standardizes how current state is published/read and how events/commands move between owners.

**Current framing approved in chat:**
- M2 collectors remain the producers of player, network, market, infrastructure, and capabilities observations.
- M3 is primarily the in-between contract used by future Supervisor, resource/authority manager, scheduler, controllers, and dashboards.
- Default transport rule to design/lock: **state through state interfaces/files; commands and events through ports/queues**.
- Canonical/latest state should be durable enough that a restarted consumer can read current truth without reconstructing it from missed port messages.
- Ports are for transient ordered commands/events, not the sole store of canonical state.
- Direct process args are startup configuration/identity, not a general state bus.
- Telemetry/event history is diagnostic evidence, not operational authority.
- React in-memory bridges remain UI-local only and never become a system bus (FIX-002).
- Shared canonical state follows single-writer/many-reader ownership. Consumers do not edit state files to “correct” them.
- M3 should stay lean: normalize contracts, freshness/validity, ownership, message envelopes, port allocation, queue/backpressure rules, and consumer interfaces. Do not add controller decisions such as target selection or purchase decisions.

**Pre-M3 cleanup completed:**
- M2 is complete and runtime validated through r49.
- r51 runtime-validated explicit managed-file retirement. The obsolete standalone `src/ui/system-health-dashboard.jsx` and `src/ui/update-dashboard.jsx` were stopped, verified stopped, deleted, and verified absent with per-file terminal/report audit.
- Health Collector and Update Watcher remain backend services. Validation Dashboard is now the sole UI surface.
- FIX-009 documents the r50→r51 deployment-schema compatibility transition.

**Validation state:** Documentation/handoff only. No M3 code, ports, schemas, or state authority process have been implemented or allocated yet.

**Exact next step for the next chat:** Read the startup documents, then design the M3 communication contract before any code. Specifically propose: (1) port allocation/reservation map, (2) command/event envelope and schema/version/ID/timestamp conventions, (3) canonical state-file/envelope contract and domain layout, (4) writer/read ownership, (5) freshness/stale/unavailable semantics, (6) queue/backpressure/overflow behavior, (7) startup/restart behavior, and (8) Validation Dashboard tests/evidence. Review with the operator and lock decisions before implementation.

**Do not do yet:** Do not implement M3 runtime code, allocate ports by convention without documentation, promote `data/observations/*` directly to canonical truth, or begin M4+ behavior.

## Recently completed

### M2 Telemetry / Dashboard Foundation
**Status:** Complete and runtime validated through v0.5.0-r49

M2 established structured service telemetry/events, aggregate health and incident handling, isolated observation producers, shared dashboard presentation infrastructure, the Validation Dashboard engineering hub, registered SAFE/DISRUPTIVE tests, durable evidence provenance, and emergency focus/recovery behavior. Final controlled validation crossed the real 4-of-7 emergency threshold, focused Health once, required acknowledgement, restored all four stopped collectors, and returned the stack to 7/7 healthy.



### r20 update-dashboard deployment completion status
**Status:** Runtime validated

Normal r20 installation completed successfully and the dashboard transitioned from install progress to a green `Install clean` terminal state with the completed revision. This validates that transient command feedback no longer leaves the operator uncertain whether deployment finished cleanly.


### M1 explicit persistent-unit retirement
**Status:** Runtime validated

r18 introduced the retirement-aware puller/helper and launched the harmless persistent retirement fixture alongside the update watcher. r19 then explicitly retired only that fixture. Runtime `ps home` after r19 showed the watcher and dashboard still healthy while the fixture was gone, validating positive manifest-authorized persistent-unit retirement.


### M1 deployment reliability validation through r17
**Status:** Runtime validated

Controlled r16/r17 testing proved stale approval rejection and single-deployment concurrency protection. After the temporary validation helper was stopped, the normal r17 installation also completed successfully, confirming the ordinary deployment path remained healthy after both rejection tests.

### M1 duplicate/concurrent deployment validation
**Status:** Runtime validated

The existing self-update helper was launched in a harmless wait state against the live watcher PID so it counted as active deployment infrastructure without progressing into deployment mutation. An r17 approval through the normal dashboard path was rejected while that helper was active, confirming the single-deployment guard prevents concurrent deployment startup.

### M1 stale/mismatched approval validation
**Status:** Runtime validated

Controlled no-op releases r16 and r17 proved exact-revision approval semantics. r16 was first presented while local runtime remained on r15; r17 was then published and presented. A manually submitted approval explicitly bound to stale r16 was rejected after fresh verification with `Approved revision is no longer the current newer release.` r17 remained awaiting its own approval, proving that approval of one revision cannot silently authorize a newer revision.

### Documentation durability and feature-doc synchronization
**Status:** Complete

Added `CHANGES.md` as the required lightweight in-progress work record. `PROJECT_RULES.md` now requires it to be updated during meaningful implementation work and before handoffs/context switches. Feature/subsystem documentation must now be updated in the same work item whenever feature behavior, interfaces, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes. Startup and current-state documentation were updated to include the new workflow.

### r15 dashboard window geometry memory
**Status:** Runtime validated

The update dashboard now persists its tail position and size and restores them after watcher-driven relaunch. The behavior was confirmed in runtime after `v0.4.0-r15` deployment. The shared behavior is intended for all future dashboards.
