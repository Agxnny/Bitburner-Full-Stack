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

### r40 collector process-uptime correction
**Status:** r40 installed — collector process-uptime correction PASS

**Goal:** Correct shared collector uptime so producer-owned `startedAt` remains the immutable process start timestamp instead of being shadowed by each collection cycle.

**Files / areas touched:**
- `src/collectors/collector-runtime.js`
- deployment r40 metadata

**Decisions / constraints:**
- This revision is timer-only. Incident/error expiry is explicitly deferred to the next separate change.
- Keep the outer process `startedAt` captured once before the collector loop.
- Rename the inner per-cycle timestamp to `cycleStartedAt`; it is used only for interval/sleep accounting.
- Do not change Health Collector, Update Watcher, dashboard presentation, incident retention, collector behavior, or sizing.
- r39 runtime shows the defect clearly: shared collectors report only seconds because their per-cycle timestamp shadows process `startedAt`; Health Collector and Update Watcher already show correct process-scoped uptime.

**Validation:** Static defect confirmed and corrected. The outer `startedAt` is now the only process lifetime timestamp; the loop uses `cycleStartedAt` solely for collection interval accounting. Health, incidents, dashboard, sizing, and collector collection logic are unchanged. Runtime validation PASS on install: all five shared-runtime collectors restarted with new PIDs and report ~10s process uptime together, while unchanged Health Collector (pid 144) and Update Watcher (pid 145) preserve ~8m02s uptime. This confirms producer ownership is no longer tied to Health observation/dashboard lifetime. r40 immutable manifest published at releaseRef `b067a11d5526315684613d939901adce3f2b06e0`; descriptor published last.

**Next step:** Observe the five shared collector uptimes beyond their normal collection intervals to confirm continued monotonic growth; current r40 runtime already shows the expected fresh process start (~10s) while unchanged Health Collector/Update Watcher retain ~8m process uptime. Proceed to incident/error expiry as the next separate change.

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
