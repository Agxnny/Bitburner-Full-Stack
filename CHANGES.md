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

### r38 deterministic Update Watcher two-state sizing
**Status:** Published as v0.5.0-r38 — pre-install action-state validation pending

**Goal:** Finish M2 Update Watcher sizing by giving its two real UI states explicit width contracts while preserving the validated r37 service uptime feature.

**Files / areas touched:**
- `src/ui/update-dashboard.jsx`
- `src/ui/dashboard-window-memory.js`
- `src/ui/README.md`
- deployment r38 metadata

**Decisions / constraints:**
- Compact state and update-action state are the only width modes. Install/Later remain conditionally rendered.
- Compact width remains the r36/r37 proven 620px native target.
- Action state requests a fixed 900px native target, comfortably fitting the complete current nowrap action row without depending on hidden intrinsic width measurement.
- Shared dashboard helper accepts an optional React-owned preferred width through the bridge, clamped by the same min/max/viewport rules. Dashboards without a preferred width, including System Health, keep rendered-root sizing unchanged.
- Preferred width changes are presentation state only; React does not call Netscript. The dashboard main loop remains the sole `resizeTail()` owner.
- Remove no additional shared sizing behavior. Preserve countdown, docking, viewport-aware height, r37 uptime, and all collector/runtime behavior.

**Validation:** r36/r37 compact root-measured updater state PASS. r36 with r37 presented action state FAIL because constrained root measurement cannot discover the hidden nowrap action-row demand. r37 service uptime PASS with seven healthy services. r38 static implementation adds only an optional bridge preferred native width; Update Watcher selects 620px compact / 900px action, while System Health and all other dashboards retain rendered-root sizing. React/Netscript ownership and coordinator logic are unchanged. Runtime validation pending. r38 immutable manifest published at releaseRef `96411b6358a3bbd9738a8785d6e0134970b57a9c`; descriptor published last.

**Next step:** Do not install r38 yet. Inspect installed r37 while r38 is presented. The Update Watcher should switch to the explicit 900px action width and show the complete update badge, Install/Later controls, countdown, and rounded right card edge. If that passes, install r38 and confirm it returns to the 620px compact state.

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
