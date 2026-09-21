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

### Drag-selectable dashboard docking + updater width response
**Status:** Approved — implementation

**Goal:** Extend the validated r28 anchor coordinator so a follower can be dragged to the anchor's top/bottom/left/right side and snap there, while fixing Update Watcher width growth when update approval controls appear.

**Files / areas touched:**
- `src/ui/dashboard-layout-coordinator.js`
- `src/ui/dashboard-window-memory.js`
- Update Watcher sizing surface
- UI docs / decisions / deployment release

**Decisions / constraints:**
- Operator screenshots validate r28 anchor transfer, anchor movement, follower movement, ordering reversal, and basic vertical stack coordination.
- Dock side is browser-local presentation state per follower/anchor relationship; supported sides are top, bottom, left, right.
- A follower remains coordinated normally. A native manual drag that materially departs from its commanded position temporarily releases it, and after drag settle the nearest anchor side is selected and persisted.
- Reversing the anchor preserves the physical relation where possible by using the inverse side (left↔right, top↔bottom).
- Dynamic size changes reflow from the persisted dock side.
- React/browser code detects drag geometry and calculates intent only; each dashboard main loop remains sole Netscript move/resize owner.
- Update Watcher must grow only when its nowrap status-row content requires it, then shrink after approval controls disappear. Do not make its normal state permanently wider.
- r27 measured content-viewport sizing remains the sizing authority.

**Validation:** r28 anchor/drag screenshots PASS core coordination. Side docking and updater update-available width response pending implementation/runtime validation.

**Next step:** Implement side-aware docking + drag release/snap and intrinsic updater width measurement, publish r29, then validate all four dock sides, anchor reversal, size reflow, and update-available grow/shrink.

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
