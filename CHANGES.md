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

### r39 producer-owned service instance uptime
**Status:** r39 presented — r38 two-state action sizing PASS; r39 install pending

**Goal:** Make Service Placement uptime survive Health Collector/dashboard restarts by moving instance start ownership to each reporting service.

**Files / areas touched:**
- `src/core/telemetry.js`
- `src/collectors/collector-runtime.js`
- `src/core/health-collector.js`
- `src/bootstrap/update-watcher.js`
- `src/ui/system-health-dashboard.jsx`
- `src/core/README.md`
- deployment r39 metadata

**Decisions / constraints:**
- `startedAt` is immutable producer-owned current-process lifetime metadata.
- Shared collector runtime captures one `startedAt` before its loop and includes it in every collector health record.
- Update Watcher and Health Collector capture their own process `startedAt` once and publish it with their health.
- Health Collector passes producer `startedAt` through; it no longer invents uptime from first observation.
- Dashboard derives live uptime from `startedAt` using ordinary JS only.
- A deployment that restarts a service correctly resets that service's uptime; a Health/dashboard-only restart does not reset other unchanged processes.
- r38 installed cleanly; compact updater state and r37 uptime presentation remain validated. Action-state 900px width still requires the next presented release to observe before installation.

**Validation:** Current r38 runtime screenshot shows seven healthy services and clean compact updater state. Static r39 implementation complete: all five shared-runtime collectors, Update Watcher, and Health Collector capture one process `startedAt`; telemetry validates and transports it; Health snapshot passes it through; dashboard reads only `startedAt`. No `observedSince` references remain in runtime/UI files. Runtime validation: r38 presenting r39 confirms the explicit 900px Update Watcher action state PASS — update badge, Install clean, heartbeat, countdown, Install, Later, and the full rounded right card edge are all visible with no clipping. Compact 620px state was already PASS, so the two-state sizing contract is now validated in both states. r39 producer-owned uptime remains pending installation. r39 immutable manifest published at releaseRef `4193e31c5dce57cc2ea2af4f64d2901d7dfe9368`; descriptor published last.

**Next step:** Install r39 normally. Confirm the Update Watcher returns to the 620px compact state and System Health remains correctly sized. Then validate producer-owned uptime: unchanged service processes should retain lifetime across dashboard/Health-only restarts, while genuinely restarted services reset.

## Recently completed

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
