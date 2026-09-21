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

### r34 Update Watcher sizing and useful poll countdown
**Status:** Approved — r35 implementation

**Goal:** Eliminate the remaining compact Update Watcher right-edge crop and make its polling indicator show useful time remaining until the next real remote check.

**Files / areas touched:**
- `src/ui/update-dashboard.jsx`
- `src/ui/dashboard-window-memory.js`
- `src/ui/README.md`
- deployment r34 metadata

**Decisions / constraints:**
- r33 collector recovery is PASS: all seven reporting services are healthy.
- Heartbeat display becomes whole seconds only and reserves stable width; telemetry timestamp precision is unchanged.
- Poll metric is derived from watcher-owned `nextCheckAt`, counts down in whole seconds, and resets only when the watcher schedules its next actual check.
- r34 shared 8px width safety is rejected and will be removed. Layout coordinator is not the source of the sizing request: it only publishes the native `.react-resizable` rectangle after resize and uses that rectangle for docking.
- Update Watcher uniquely supplies `widthProbeSelector`; shared sizing therefore replaces normal root width with the status-row intrinsic width. The probe already includes its own 28px row padding, then only adds the root's 20px padding. It does not include the inner card border/box footprint used by the rendered Shell. The correction belongs to the updater-local probe contract, not global sizing.
- Preserve r31/r32-proven reactive update-available grow/shrink behavior and existing docking.

**Validation:** r34 installed cleanly. Whole-second heartbeat and live next-check countdown are working at runtime (observed 19s then 8s). The shared 8px width safety did not cure the Update Watcher right-edge crop and caused System Health to grow wider than its prior correct footprint. Treat the shared width allowance as a failed experiment to revert, not tune upward. r34 immutable manifest published at releaseRef `fe8926ca4477fe314b0c1f98114a70b985742c63`; descriptor published last.

**Next step:** Revert the shared r34 width allowance, add updater-local width-probe box compensation so the request represents the complete rendered Shell/card footprint, update UI docs, and publish r35 without changing layout-coordinator geometry/docking.

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
