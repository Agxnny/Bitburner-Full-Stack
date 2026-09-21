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

### M3 Canonical State — first vertical slice
**Status:** Approved; implementation starting

**Goal:** Implement the smallest end-to-end M3 canonical-state path between the existing M2 observation collectors and future consumers, while preserving M2 as observation-only acquisition.

**Locked design for this implementation:**
- M2 collectors remain factual observation producers; M3 is the single canonical-state owner.
- Canonical latest state is durable and single-writer/many-reader. Ports are transport, never canonical truth.
- Port 1 remains telemetry. M3 port allocation is centralized in a registry; no scattered magic port numbers.
- Ordinary observation traffic may share an ingress lane; high-frequency domains may receive dedicated data/control lanes when justified. Market is the first intended dedicated domain.
- Collection cadence is baseline + bounded consumer cadence leases. Shared infrastructure resolves effective cadence; individual collectors do not implement consumer policy.
- Wall time is a shared contract. Observations carry factual timestamps. M3 does not declare observations globally fresh/stale; consumers judge freshness from observation time for their own use.
- Availability is factual and remains distinct from freshness.
- Historical windows are elapsed-time windows, not “last N samples”; missing observations remain visible gaps.
- Commands, events, state, telemetry, and authority remain distinct. Lease/budget authority is future M5 work and will not be implemented in M3.
- Queue behavior is bounded and backpressure is explicit; ports are not treated as broadcast/pub-sub.

**Compatibility findings checked before implementation:**
- Official Bitburner release history still lists v3.0.1 as the latest published release.
- v3 exposes nextPortWrite, readPort, peek, tryWritePort, and writePort; ports are queue transport and are not durable restart state.
- Repository port usage currently reserves Port 1 for telemetry.

**Files / areas expected to change first:**
- CHANGES.md, ARCHITECTURE.md, DECISIONS.md, ROADMAP.md
- shared M3 contracts/port registry/time helpers under src/core/
- src/collectors/collector-runtime.js and observation publication path
- one first canonical domain path, then Validation Dashboard evidence before expansion

**Validation state:** Design reviewed with operator. No M3 runtime behavior has yet been validated in-game.

**Exact next step:** Record the locked M3 decisions, implement shared contracts plus one end-to-end canonical-state slice, publish a release, and hand runtime validation to the operator before expanding all domains.

**Risks:** High-frequency market cadence must be measured in-game rather than guessed. Port consumers must remain single-owner because queue reads are destructive. Existing M2 snapshots must not accidentally become canonical authority.

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
