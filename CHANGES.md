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

### M3 Canonical State — design
**Status:** Design

**Goal:** Begin M3 only after formally closing the runtime-validated M2 Telemetry / Dashboard Foundation. Define the canonical-state ownership, schemas, freshness semantics, raw-versus-derived boundary, reconciliation responsibilities, and Validation Dashboard state-health surfaces before implementation.

**Files / areas touched:**
- `CURRENT_STATE.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `src/ui/README.md`
- M3 design surfaces to be identified before code

**Decisions / constraints:**
- M2 is complete at r49. Structured telemetry/events, central health/status aggregation, React Validation Dashboard shell, registered validation/evidence framework, and operator production surfaces are all runtime validated.
- The five M2 observation files remain explicitly non-canonical inputs. M3 may consume/replace their interfaces but must not silently relabel them as canonical state.
- Standalone System Health and Update Watcher windows may remain during M3; presentation consolidation is not an M2 blocker and must not delay state architecture.
- The observed short post-install updater convergence/stale command-feedback polish is not a correctness blocker: deployment completion and update state converge without intervention and the canonical compact updater already exposes terminal install state. Track presentation polish separately rather than reopening M2.
- No M3 implementation until ownership, dependencies, interfaces, reconciliation, freshness/failure semantics, validation plan, and done criteria are documented and approved.

**Validation:** M2 closeout evidence includes healthy 7-service telemetry, stale/degraded/recovery handling, bounded incidents, five isolated observation collectors, dashboard sizing/layout behavior, Validation Dashboard smoke 9/9, genuine non-focus-stealing updater notification with operator-confirmed evidence, persistent dashboard replacement cleanup, and the controlled emergency-focus test with exact restoration and final 7/7 health.

**Next step:** Design the M3 canonical-state contract and validation criteria. Do not write M3 runtime code until the design is reviewed.

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
